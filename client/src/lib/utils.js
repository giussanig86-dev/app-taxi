import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Utility per combinare classi Tailwind
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

/**
 * Formatta importo in Euro (formato italiano)
 */
export function formatEuro(amount) {
  if (amount == null || isNaN(amount)) return '€ 0,00'
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount)
}

/**
 * Formatta data breve: 17/02/2026
 */
export function formatData(date) {
  if (!date) return '-'
  return new Intl.DateTimeFormat('it-IT').format(new Date(date))
}

/**
 * Formatta data estesa: 17 febbraio 2026
 */
export function formatDataEstesa(date) {
  if (!date) return '-'
  return new Intl.DateTimeFormat('it-IT', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(date))
}

/**
 * Formatta data per input HTML: 2026-02-17
 */
export function formatDataInput(date) {
  if (!date) return ''
  const d = new Date(date)
  return d.toISOString().split('T')[0]
}

/**
 * Calcola giorni da oggi
 */
export function giorniDaOggi(date) {
  if (!date) return null
  const diff = new Date(date) - new Date()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

/**
 * Nomi dei mesi in italiano
 */
export const MESI = [
  'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
]

/**
 * Formatta numero con separatore migliaia italiano
 */
export function formatNumero(n) {
  if (n == null) return '0'
  return new Intl.NumberFormat('it-IT').format(n)
}
