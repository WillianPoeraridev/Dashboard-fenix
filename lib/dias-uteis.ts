// Cópia de crm-comercial-fenix/lib/dias-uteis.ts — manter em sincronia.
// Dias úteis = segunda a sábado, menos feriados nacionais (fixos + móveis).

const FERIADOS_FIXOS: [number, number][] = [
  [1, 1],   // Confraternização Universal
  [21, 4],  // Tiradentes
  [1, 5],   // Dia do Trabalho
  [7, 9],   // Independência do Brasil
  [12, 10], // Nossa Senhora Aparecida
  [2, 11],  // Finados
  [15, 11], // Proclamação da República
  [25, 12], // Natal
];

function calcularPascoa(ano: number): Date {
  const a = ano % 19;
  const b = Math.floor(ano / 100);
  const c = ano % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31);
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(ano, mes - 1, dia);
}

function addDias(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function getFeriadosDoAno(ano: number): Set<string> {
  const feriados = new Set<string>();
  for (const [dia, mes] of FERIADOS_FIXOS) {
    feriados.add(formatData(new Date(ano, mes - 1, dia)));
  }
  const pascoa = calcularPascoa(ano);
  feriados.add(formatData(addDias(pascoa, -48))); // Segunda de Carnaval
  feriados.add(formatData(addDias(pascoa, -47))); // Terça de Carnaval
  feriados.add(formatData(addDias(pascoa, -2)));  // Sexta-Feira Santa
  feriados.add(formatData(addDias(pascoa, 60)));  // Corpus Christi
  return feriados;
}

function formatData(d: Date): string {
  const ano = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

function isDiaUtil(data: Date, feriados: Set<string>): boolean {
  if (data.getDay() === 0) return false; // domingo
  if (feriados.has(formatData(data))) return false;
  return true;
}

export function calcularDiasUteisDoMes(ano: number, mes: number): number {
  const feriados = getFeriadosDoAno(ano);
  const totalDias = new Date(ano, mes, 0).getDate();
  let count = 0;
  for (let dia = 1; dia <= totalDias; dia++) {
    if (isDiaUtil(new Date(ano, mes - 1, dia), feriados)) count++;
  }
  return count;
}

export function calcularDiasTrabalhadosAteHoje(ano: number, mes: number): number {
  const feriados = getFeriadosDoAno(ano);
  const hoje = new Date();
  const inicioDomes = new Date(ano, mes - 1, 1);
  const fimDoMes = new Date(ano, mes, 0);
  if (inicioDomes > hoje) return 0;
  if (fimDoMes < hoje) return calcularDiasUteisDoMes(ano, mes);
  const diaAtual = hoje.getDate();
  let count = 0;
  for (let dia = 1; dia <= diaAtual; dia++) {
    if (isDiaUtil(new Date(ano, mes - 1, dia), feriados)) count++;
  }
  return count;
}
