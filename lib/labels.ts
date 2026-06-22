// Labels da UI — cópia consolidada dos labels dos CRMs (comercial + retenção).

export const REGIAO_LABEL: Record<string, string> = {
  MATRIZ: "Matriz",
  LITORAL: "Litoral",
  SINOS: "Sinos",
  FORA_AREA: "Fora de Área",
};

export const DEFINICAO_LABEL: Record<string, string> = {
  VENDA: "Venda",
  LEAD: "Lead",
  INV_REGIAO: "Inv. Região",
  INV_PORTE: "Inv. Porte",
  INV_INADIMPLENCIA: "Inv. Inadimplência",
};

export const ORIGEM_LABEL: Record<string, string> = {
  ADS: "ADS",
  INDICACAO: "Indicação",
  JA_FOI_CLIENTE: "Já foi Cliente",
  MELHOR_PLANO: "Melhor Plano",
  REDE_NEUTRA: "Rede Neutra",
  TERCEIRIZADAS: "Terceirizadas",
  MIDIAS_EXTERNAS: "Mídias Externas",
  SEGUNDO_PONTO: "2º Ponto",
  NEXE: "Nexe",
  MIGRACAO: "Migração",
};

export const STATUS_INSTALACAO_LABEL: Record<string, string> = {
  PENDENTE: "Pendente",
  SIM: "Instalada",
  AGENDADO: "Agendada",
  CANCELADO: "Cancelado",
};

// Retenção
export const STATUS_RETENCAO_LABEL: Record<string, string> = {
  CANCELADO: "Cancelado",
  RETIDO: "Retido",
  INADIMPLENCIA: "Inadimplência",
};

export const MOTIVO_LABEL: Record<string, string> = {
  INSATISFACAO_ATD: "Insatisfação c/ Atendimento",
  INSATISFACAO_SERVICO: "Insatisfação c/ Serviço",
  MUDANCA_ENDERECO: "Mudança de Endereço",
  MOTIVOS_PESSOAIS: "Motivos Pessoais",
  TROCA_PROVEDOR: "Troca de Provedor",
  PROBLEMAS_FINANC: "Problemas Financeiros",
  OUTROS: "Outros",
  INADIMPLENCIA_90: "90 + Inadimplência",
};
