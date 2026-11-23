/** Prazo do link de material (apresentação + COF + cadastro): 30 dias após o envio ao lead. Puro/testável. */
export const LINK_DIAS = 30;
export const novoPrazo = (agora = new Date()) => new Date(agora.getTime() + LINK_DIAS * 86_400_000);
/** Sem prazo gravado (links antigos) = válido. */
export const linkValido = (expiraEm: Date | null | undefined, agora = new Date()) => !expiraEm || expiraEm.getTime() > agora.getTime();
