// ============================================
// SmartTicketQR — Cross-Platform Print Types
// ============================================

// ── Print Job Types ─────────────────────────────

export type PrintJobType = 'ticket' | 'receipt' | 'report';

export type PrinterType = 'thermal_58mm' | 'thermal_80mm' | 'laser_a4' | 'laser_a5' | 'pdf' | 'browser';

export type PrintEnvironment = 'android_pwa' | 'windows_desktop' | 'web_browser' | 'kiosk';

export type PrintJobStatus = 'pending' | 'printing' | 'success' | 'failed' | 'retrying' | 'cancelled';

// ── Ticket Data ────────────────────────────────

export interface PrintTicketData {
  id: string;
  ticketNumber: string;
  qrToken: string;
  type: 'UNIT' | 'SUBSCRIPTION';
  status: string;
  price: number;
  amountPaid: number;
  changeGiven: number;
  validFrom: string;
  validTo: string;
  passengerName: string | null;
  passengerPhone: string | null;
  fromZone: string;
  toZone: string;
  fromStop?: string;
  toStop?: string;
  lineNumber?: string;
  lineName?: string;
  soldByName: string;
  soldByEmail: string;
  paymentMethod: string;
}

// ── Receipt Data ───────────────────────────────

export interface PrintReceiptData {
  receiptNumber: string;
  operatorName: string;
  operatorEmail: string;
  cashSessionId: string;
  date: string;
  openingBalance: number;
  totalSales: number;
  totalRevenue: number;
  totalCashReceived: number;
  totalMobileMoney: number;
  totalCard: number;
  totalChangeGiven: number;
  expectedCash: number;
  actualCash?: number;
  difference?: number;
  tickets: Array<{
    ticketNumber: string;
    fromZone: string;
    toZone: string;
    price: number;
    paymentMethod: string;
    soldAt: string;
    passengerName: string | null;
  }>;
  notes?: string;
}

// ── Report Data ────────────────────────────────

export interface PrintReportData {
  title: string;
  subtitle?: string;
  period: { from: string; to: string };
  generatedAt: string;
  generatedBy: string;
  sections: ReportSection[];
  summary?: {
    totalTickets: number;
    totalRevenue: number;
    totalValidations: number;
    validationRate?: number;
  };
}

export interface ReportSection {
  title: string;
  type: 'table' | 'text' | 'summary';
  headers?: string[];
  rows?: (string | number)[][];
  content?: string;
}

// ── Print Job ──────────────────────────────────

export interface PrintJob {
  id: string;
  type: PrintJobType;
  printerType: PrinterType;
  status: PrintJobStatus;
  data: PrintTicketData | PrintReceiptData | PrintReportData;
  createdAt: string;
  completedAt?: string;
  error?: string;
  retryCount: number;
  maxRetries: number;
  printerName?: string;
}

// ── Print Queue ────────────────────────────────

export interface PrintQueueState {
  jobs: PrintJob[];
  isProcessing: boolean;
  stats: {
    totalJobs: number;
    successCount: number;
    failedCount: number;
    pendingCount: number;
  };
}

// ── Printer Configuration ──────────────────────

export interface PrinterConfig {
  id: string;
  name: string;
  type: PrinterType;
  isConnected: boolean;
  isDefault: boolean;
  lastUsed?: string;
  paperWidth?: number; // mm
  dpi?: number;
}

// ── Print Options ──────────────────────────────

export interface PrintOptions {
  copies?: number;
  silent?: boolean; // No print dialog (kiosk mode)
  printerType?: PrinterType;
  printerId?: string;
  autoCut?: boolean; // Thermal paper cut
  openCashDrawer?: boolean; // Open cash drawer after printing
  preview?: boolean; // Show preview before printing
}

// ── Print Status Log ───────────────────────────

export interface PrintLogEntry {
  id: string;
  jobId: string;
  ticketId?: string;
  action: 'print_requested' | 'print_success' | 'print_failed' | 'retry' | 'cancelled';
  printerType: PrinterType;
  environment: PrintEnvironment;
  timestamp: string;
  error?: string;
  duration?: number; // ms
}

// ── Environment Detection ──────────────────────

export interface EnvironmentInfo {
  isAndroid: boolean;
  isIOS: boolean;
  isWindows: boolean;
  isPWA: boolean;
  hasWebBluetooth: boolean;
  hasWebUSB: boolean;
  hasPrintAPI: boolean;
  userAgent: string;
  screenWidth: number;
  screenHeight: number;
}
