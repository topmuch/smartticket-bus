// ============================================
// SmartTicketQR — Print Module Barrel Export
// ============================================

export * from './types';
export * from './environment';
export { printService } from './print-service';
export { printQueue, type PrintQueueManager } from './print-queue';
export {
  formatPrice,
  formatDateFr,
  formatDateShort,
  getTicketStatusLabel,
  getPaymentMethodLabel,
  getTicketTypeLabel,
  normalizeTicketForPrint,
  normalizeReceiptForPrint,
} from './print-utils';
