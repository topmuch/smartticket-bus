// ============================================
// SmartTicketQR — Print Utilities & Helpers
// ============================================

import type { PrintTicketData, PrintReceiptData } from './types';

/**
 * Format a number as FCFA currency string.
 */
export function formatPrice(n: number): string {
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n) + ' FCFA';
}

/**
 * Format a date string in French locale.
 */
export function formatDateFr(d: string | Date): string {
  return new Date(d).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Format a date as short French string (no time).
 */
export function formatDateShort(d: string | Date): string {
  return new Date(d).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/**
 * Get French status label for ticket status.
 */
export function getTicketStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    VALID: 'Valide',
    USED: 'Utilisé',
    EXPIRED: 'Expiré',
    CANCELLED: 'Annulé',
    INVALID: 'Invalide',
  };
  return labels[status] || status;
}

/**
 * Get payment method label in French.
 */
export function getPaymentMethodLabel(method: string): string {
  const labels: Record<string, string> = {
    cash: 'Espèces',
    mobile: 'Mobile Money',
    card: 'Carte bancaire',
  };
  return labels[method] || method;
}

/**
 * Get ticket type label in French.
 */
export function getTicketTypeLabel(type: string): string {
  return type === 'SUBSCRIPTION' ? 'Abonnement' : 'Ticket Unité';
}

/**
 * Normalize ticket data from API response to PrintTicketData.
 */
export function normalizeTicketForPrint(data: any): PrintTicketData {
  return {
    id: data.id,
    ticketNumber: data.ticketNumber,
    qrToken: data.qrToken || data.qrString || data.qrCode || '',
    type: data.type || 'UNIT',
    status: data.status || 'VALID',
    price: data.price || 0,
    amountPaid: data.amountPaid || data.price || 0,
    changeGiven: data.changeGiven || 0,
    validFrom: data.validFrom || new Date().toISOString(),
    validTo: data.validTo || new Date().toISOString(),
    passengerName: data.passengerName || null,
    passengerPhone: data.passengerPhone || null,
    fromZone: typeof data.fromZone === 'object' ? data.fromZone?.name || '' : (data.fromZone || ''),
    toZone: typeof data.toZone === 'object' ? data.toZone?.name || '' : (data.toZone || ''),
    fromStop: data.fromStop ? (typeof data.fromStop === 'object' ? data.fromStop.name : data.fromStop) : undefined,
    toStop: data.toStop ? (typeof data.toStop === 'object' ? data.toStop.name : data.toStop) : undefined,
    lineNumber: data.line ? (typeof data.line === 'object' ? data.line.number : data.line) : undefined,
    lineName: data.line ? (typeof data.line === 'object' ? data.line.name : undefined) : undefined,
    soldByName: data.soldBy ? (typeof data.soldBy === 'object' ? data.soldBy.name : data.soldBy) : '',
    soldByEmail: data.soldBy ? (typeof data.soldBy === 'object' ? data.soldBy.email : '') : '',
    paymentMethod: data.paymentMethod || 'cash',
  };
}

/**
 * Normalize receipt data from cash session API response to PrintReceiptData.
 */
export function normalizeReceiptForPrint(data: any): PrintReceiptData {
  const tickets = (data.tickets || []).map((t: any) => ({
    ticketNumber: t.ticketNumber || '',
    fromZone: typeof t.fromZone === 'object' ? t.fromZone?.name || '' : (t.fromZone || ''),
    toZone: typeof t.toZone === 'object' ? t.toZone?.name || '' : (t.toZone || ''),
    price: t.price || 0,
    paymentMethod: t.paymentMethod || 'cash',
    soldAt: t.soldAt || t.createdAt || new Date().toISOString(),
    passengerName: t.passengerName || null,
  }));

  const totalRevenue = tickets.reduce((sum: number, t: any) => sum + t.price, 0);
  const totalCashReceived = tickets
    .filter((t: any) => t.paymentMethod === 'cash')
    .reduce((sum: number, t: any) => sum + t.amountPaid || t.price, 0);
  const totalMobileMoney = tickets
    .filter((t: any) => t.paymentMethod === 'mobile')
    .reduce((sum: number, t: any) => sum + t.price, 0);
  const totalCard = tickets
    .filter((t: any) => t.paymentMethod === 'card')
    .reduce((sum: number, t: any) => sum + t.price, 0);
  const totalChangeGiven = tickets
    .filter((t: any) => t.paymentMethod === 'cash')
    .reduce((sum: number, t: any) => sum + (t.changeGiven || 0), 0);

  return {
    receiptNumber: data.id ? `RC-${new Date(data.openedAt || data.date).toISOString().slice(0, 10).replace(/-/g, '')}` : 'RC-NONDEFINED',
    operatorName: data.operator ? (typeof data.operator === 'object' ? data.operator.name : data.operator) : '',
    operatorEmail: data.operator ? (typeof data.operator === 'object' ? data.operator.email : '') : '',
    cashSessionId: data.id || '',
    date: data.openedAt || data.date || new Date().toISOString(),
    openingBalance: data.openingBalance || 0,
    totalSales: tickets.length,
    totalRevenue,
    totalCashReceived,
    totalMobileMoney,
    totalCard,
    totalChangeGiven,
    expectedCash: data.expectedCash || (data.openingBalance || 0) + totalCashReceived - totalChangeGiven,
    actualCash: data.actualCash ?? data.closingBalance ?? undefined,
    difference: data.difference ?? (data.actualCash !== undefined ? data.actualCash - ((data.openingBalance || 0) + totalCashReceived - totalChangeGiven) : undefined),
    tickets,
    notes: data.notes || undefined,
  };
}
