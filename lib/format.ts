// Cópia de crm-comercial-fenix/lib/format.ts — manter em sincronia.
const brlFull = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const brlInt = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0, maximumFractionDigits: 0 });
const pctFmt = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** R$ 23.148,60 */
export function fmtBRL(value: number): string {
  return brlFull.format(value);
}

/** R$ 23.149 (sem centavos, com separador de milhar) */
export function fmtBRLInt(value: number): string {
  return brlInt.format(value);
}

/** Calcula (value/total)*100 e retorna "85,50%" — retorna "0,00%" se total===0 */
export function fmtPct(value: number, total: number): string {
  if (total === 0) return "0,00%";
  return pctFmt.format((value / total) * 100) + "%";
}

/** Formata número já calculado como percentual: fmtPctRaw(85.5) → "85,50%" */
export function fmtPctRaw(value: number): string {
  return pctFmt.format(value) + "%";
}

/**
 * Nome curto do vendedor: primeiro nome + inicial do sobrenome.
 * "Willian Poerari" → "Willian P", "Lucas" → "Lucas", "" → "—".
 */
export function shortName(fullName: string | null | undefined): string {
  if (!fullName) return "—";
  const partes = fullName.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "—";
  if (partes.length === 1) return partes[0];
  const inicial = partes[1][0]?.toUpperCase() ?? "";
  return inicial ? `${partes[0]} ${inicial}` : partes[0];
}
