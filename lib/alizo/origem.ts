/** Origem dos leads da Alizo (função pura, testável). */
/** Leads que a própria Smarter enviou à Alizo (source smarter_*) não devem voltar como "novos". */
export const ehOrigemSmarter = (source: string | null | undefined) => (source || "").startsWith("smarter_");
