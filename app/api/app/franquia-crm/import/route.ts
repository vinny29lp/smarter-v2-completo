/**
 * POST /api/app/franquia-crm/import
 * Importa leads de uma planilha CSV do Meta Ads.
 *
 * Colunas esperadas (qualquer ordem, case-insensitive):
 *   nome_completo | nome | name
 *   telefone | phone | número de telefone
 *   email | e-mail
 *   estado | state
 *   cidade | city
 *
 * Body: { csv: "<conteúdo CSV como string>", origem: "meta_ads" | "evento" | "indicacao" }
 *
 * Retorna: { importados, duplicados, erros, detalhes[] }
 */
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/api-response";
import { nanoid } from "nanoid";

type Row = Record<string, string>;

/** Normaliza cabeçalhos para chaves padrão */
function normalizeHeader(h: string): string {
  const map: Record<string, string> = {
    nome_completo: "nomeCompleto",
    nome: "nomeCompleto",
    name: "nomeCompleto",
    "nome completo": "nomeCompleto",
    "full name": "nomeCompleto",
    telefone: "telefone",
    phone: "telefone",
    "número de telefone": "telefone",
    "numero de telefone": "telefone",
    "phone number": "telefone",
    celular: "telefone",
    email: "email",
    "e-mail": "email",
    estado: "estado",
    state: "estado",
    uf: "estado",
    cidade: "cidade",
    city: "cidade",
  };
  return map[h.toLowerCase().trim()] || h.toLowerCase().trim();
}

function parseCSV(raw: string): Row[] {
  const lines = raw.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];

  // Detecta separador (vírgula ou tab)
  const sep = lines[0].includes("\t") ? "\t" : ",";

  const rawHeaders = lines[0].split(sep).map((h) => h.replace(/^"|"$/g, "").trim());
  const headers    = rawHeaders.map(normalizeHeader);

  return lines.slice(1).map((line) => {
    const vals: string[] = [];
    let cur = "";
    let inQ = false;
    for (const ch of line) {
      if (ch === '"') { inQ = !inQ; continue; }
      if (ch === sep[0] && !inQ) { vals.push(cur.trim()); cur = ""; }
      else cur += ch;
    }
    vals.push(cur.trim());

    const row: Row = {};
    headers.forEach((h, i) => { row[h] = vals[i] || ""; });
    return row;
  });
}

/** Calcula se lead é "frio" (importado com data do lead > 6 meses atrás) */
function detectLeadFrio(row: Row): boolean {
  const dateFields = ["hora de criação", "created_time", "date_created", "data", "criado em"];
  for (const f of dateFields) {
    if (row[f]) {
      const d = new Date(row[f]);
      if (!isNaN(d.getTime())) {
        const meses = (Date.now() - d.getTime()) / (1000 * 60 * 60 * 24 * 30);
        return meses > 6;
      }
    }
  }
  return false; // sem data = não marca como frio automaticamente
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.user.role !== "FRANQUEADORA") {
      return NextResponse.json({ error: "Acesso restrito à Franqueadora" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    if (!body.csv) return NextResponse.json({ error: "CSV obrigatório" }, { status: 400 });

    const origem = body.origem || "meta_ads";
    const rows   = parseCSV(body.csv as string);

    if (rows.length === 0) {
      return NextResponse.json({ error: "CSV sem linhas de dados" }, { status: 400 });
    }

    let importados = 0;
    let duplicados = 0;
    let erros      = 0;
    const detalhes: { linha: number; nome: string; status: string; motivo?: string }[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const nome = row.nomeCompleto || "";
      if (!nome) {
        erros++;
        detalhes.push({ linha: i + 2, nome: "(sem nome)", status: "erro", motivo: "Nome não encontrado" });
        continue;
      }

      // Verifica duplicata por telefone ou e-mail
      const telefone = row.telefone?.replace(/\D/g, "") || null;
      const email    = row.email?.toLowerCase().trim()  || null;

      try {
        const dup = await prisma.franquiaLead.findFirst({
          where: {
            OR: [
              ...(telefone ? [{ telefone: { contains: telefone } }] : []),
              ...(email    ? [{ email }] : []),
            ],
          },
          select: { id: true },
        });

        if (dup) {
          duplicados++;
          detalhes.push({ linha: i + 2, nome, status: "duplicado" });
          continue;
        }

        const leadFrio = detectLeadFrio(row);

        await prisma.franquiaLead.create({
          data: {
            id:           nanoid(),
            nomeCompleto: nome.trim(),
            email:        email || null,
            telefone:     telefone || null,
            cidade:       row.cidade?.trim() || null,
            estado:       row.estado?.trim() || null,
            etapa:        "novo_lead",
            situacao:     "ativo",
            origem,
            leadFrio,
            optIn:        true,
            etapaChangedAt: new Date(),
          },
        });

        importados++;
        detalhes.push({ linha: i + 2, nome, status: leadFrio ? "importado (frio)" : "importado" });
      } catch {
        erros++;
        detalhes.push({ linha: i + 2, nome, status: "erro", motivo: "Erro ao salvar" });
      }
    }

    return NextResponse.json({ importados, duplicados, erros, total: rows.length, detalhes });
  } catch (e) {
    return handleApiError(e, "FRANQUIA_CRM_IMPORT");
  }
}
