/**
 * COSTANTI E LABELS
 */

export const RUOLI = {
  super_admin: 'Super Admin',
  consulente: 'Consulente',
  cliente: 'Cliente',
}

export const METODI_PAGAMENTO = {
  contante: 'Contante',
  carta: 'Carta',
  pos: 'POS',
  bonifico: 'Bonifico',
}

export const CATEGORIE_COSTI = {
  carburante: { label: 'Carburante', icon: 'Fuel', color: '#ef4444' },
  manutenzione: { label: 'Manutenzione', icon: 'Wrench', color: '#f59e0b' },
  assicurazione: { label: 'Assicurazione', icon: 'Shield', color: '#3b82f6' },
  bollo: { label: 'Bollo Auto', icon: 'FileText', color: '#8b5cf6' },
  pedaggi: { label: 'Pedaggi', icon: 'Route', color: '#10b981' },
  parcheggi: { label: 'Parcheggi', icon: 'ParkingSquare', color: '#06b6d4' },
  altro: { label: 'Altro', icon: 'MoreHorizontal', color: '#6b7280' },
}

export const STATI_SDI = {
  bozza: { label: 'Bozza', color: 'bg-gray-100 text-gray-700' },
  inviata: { label: 'Inviata', color: 'bg-blue-100 text-blue-700' },
  consegnata: { label: 'Consegnata', color: 'bg-green-100 text-green-700' },
  rifiutata: { label: 'Rifiutata', color: 'bg-red-100 text-red-700' },
  scartata: { label: 'Scartata', color: 'bg-orange-100 text-orange-700' },
}

export const TIPI_VERSAMENTO = {
  irpef_acconto: 'IRPEF Acconto',
  irpef_saldo: 'IRPEF Saldo',
  inps_acconto: 'INPS Acconto',
  inps_saldo: 'INPS Saldo',
  imposta_sostitutiva_acconto: 'Imposta Sost. Acconto',
  imposta_sostitutiva_saldo: 'Imposta Sost. Saldo',
}

export const CATEGORIE_FISCALI = {
  irpef: 'IRPEF',
  inps: 'INPS',
  imposta_sostitutiva: 'Imposta Sostitutiva',
}

export const PIANI_SAAS = {
  free: { label: 'Free', maxClienti: 5, prezzo: 0 },
  pro: { label: 'Pro', maxClienti: 50, prezzo: 49 },
  enterprise: { label: 'Enterprise', maxClienti: 500, prezzo: 149 },
}

export const COLORI_GRAFICO = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444',
  '#8b5cf6', '#06b6d4', '#ec4899', '#6b7280',
]
