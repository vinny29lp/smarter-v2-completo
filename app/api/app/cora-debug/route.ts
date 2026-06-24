/**
 * GET /api/app/cora-debug
 * Diagnóstico do certificado Cora — só FRANQUEADORA.
 * REMOVER após resolver o problema.
 */
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";
import https from "https";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "FRANQUEADORA") {
    return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
  }

  const rawCert = process.env.CORA_CERTIFICATE || "";
  const rawKey = process.env.CORA_PRIVATE_KEY || "";
  const clientId = process.env.CORA_CLIENT_ID || "";

  // Testa diferentes formas de processar o PEM
  const certV1 = rawCert.replace(/\\n/g, "\n");           // escape \n → newline
  const certV2 = rawCert.replace(/\r\n/g, "\n");          // CRLF → LF
  const certV3 = rawCert;                                  // sem alteração
  const keyV1  = rawKey.replace(/\\n/g, "\n");
  const keyV2  = rawKey.replace(/\r\n/g, "\n");

  const info = {
    clientId: clientId ? `${clientId.substring(0, 10)}...` : "VAZIO",
    certLen: rawCert.length,
    keyLen:  rawKey.length,
    // Primeiros e últimos chars do cert bruto
    certStart: rawCert.substring(0, 50),
    certEnd: rawCert.substring(rawCert.length - 50),
    // Após replace \\n→\n
    certV1Start: certV1.substring(0, 50),
    certV1End: certV1.substring(certV1.length - 50),
    // Quantas quebras de linha tem após o replace
    certV1Lines: certV1.split("\n").length,
    certV2Lines: certV2.split("\n").length,
    certV3Lines: certV3.split("\n").length,
    certHasBeginCert: certV1.includes("-----BEGIN CERTIFICATE-----"),
    certHasEndCert: certV1.includes("-----END CERTIFICATE-----"),
    keyHasBeginKey: keyV1.includes("-----BEGIN RSA PRIVATE KEY-----") || keyV1.includes("-----BEGIN PRIVATE KEY-----"),
    // Teste de conexão mTLS para o endpoint de token
    tokenTest: null as any,
  };

  // Testa a chamada mTLS com o cert processado
  try {
    const formBody = `grant_type=client_credentials&client_id=${encodeURIComponent(clientId)}`;
    const tokenResult = await new Promise<{ status: number; body: string }>((resolve, reject) => {
      const agent = new https.Agent({
        cert: certV1,
        key: keyV1,
        rejectUnauthorized: true,
        keepAlive: false,
      });
      const reqHttp = https.request({
        hostname: "matls-clients.api.cora.com.br",
        path: "/realms/integration/protocol/openid-connect/token",
        method: "POST",
        agent,
        timeout: 10000,
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Content-Length": String(Buffer.byteLength(formBody)),
        },
      }, (res) => {
        let raw = "";
        res.on("data", c => raw += c);
        res.on("end", () => resolve({ status: res.statusCode ?? 0, body: raw.substring(0, 500) }));
      });
      reqHttp.on("error", (e) => reject(e));
      reqHttp.on("timeout", () => { reqHttp.destroy(); reject(new Error("timeout")); });
      reqHttp.write(formBody);
      reqHttp.end();
    });
    info.tokenTest = tokenResult;
  } catch (e: any) {
    info.tokenTest = { error: e.message, code: e.code };
  }

  return NextResponse.json(info);
}
