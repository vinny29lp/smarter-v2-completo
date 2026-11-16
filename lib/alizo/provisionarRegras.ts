/** Casa uma franquia da Smarter com uma unidade já existente na Alizo (função pura, testável). */
const norm = (s?: string | null) => (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();

export interface UnidadeAlizoMin { id: string; name: string; city?: string | null; state?: string | null; external_id?: string | null }

/**
 * Prioridade: external_id == id da franquia; nome igual; mesma cidade+UF SE for a única candidata.
 * Em dúvida (duas unidades na mesma cidade) não mapeia — evita ligar a franquia à unidade errada.
 */
export function casarUnidade(f: { id: string; name: string; cidade: string; uf: string }, unidades: UnidadeAlizoMin[]): UnidadeAlizoMin | null {
  const porExt = unidades.find(u => u.external_id && u.external_id === f.id);
  if (porExt) return porExt;
  const porNome = unidades.filter(u => norm(u.name) === norm(f.name));
  if (porNome.length === 1) return porNome[0];
  const porCidade = unidades.filter(u => norm(u.city) === norm(f.cidade) && norm(u.state) === norm(f.uf));
  return porCidade.length === 1 ? porCidade[0] : null;
}
