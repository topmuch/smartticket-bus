'use client';

import { useState, useCallback, useRef, useSyncExternalStore } from 'react';
import type { PrintJob, PrintQueueState, PrintJobType, PrinterType, PrintOptions, PrintTicketData, PrintReceiptData } from '@/lib/print/types';
import { printQueue } from '@/lib/print/print-queue';
import { printService } from '@/lib/print/print-service';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Printer,
  FileDown,
  CheckCircle2,
  XCircle,
  Loader2,
  RotateCcw,
  Trash2,
  Clock,
  AlertCircle,
  X,
  Eye,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Types ──────────────────────────────────

interface PrintPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: PrintJobType;
  data: PrintTicketData | PrintReceiptData;
  defaultPrinterType?: PrinterType;
}

interface PrintQueuePanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// ── Status Helpers ─────────────────────────

const STATUS_CONFIG: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  pending: { icon: <Clock className="w-4 h-4" />, color: 'text-amber-600 bg-amber-50 border-amber-200', label: 'En attente' },
  printing: { icon: <Loader2 className="w-4 h-4 animate-spin" />, color: 'text-blue-600 bg-blue-50 border-blue-200', label: 'Impression...' },
  success: { icon: <CheckCircle2 className="w-4 h-4" />, color: 'text-green-600 bg-green-50 border-green-200', label: 'Imprimé' },
  failed: { icon: <XCircle className="w-4 h-4" />, color: 'text-red-600 bg-red-50 border-red-200', label: 'Échoué' },
  retrying: { icon: <RotateCcw className="w-4 h-4 animate-spin" />, color: 'text-amber-600 bg-amber-50 border-amber-200', label: 'Nouvelle tentative' },
  cancelled: { icon: <AlertCircle className="w-4 h-4" />, color: 'text-gray-600 bg-gray-50 border-gray-200', label: 'Annulé' },
};

const PRINTER_OPTIONS: { value: PrinterType; label: string; desc: string }[] = [
  { value: 'browser', label: 'Navigateur', desc: 'Impression via le navigateur' },
  { value: 'thermal_80mm', label: 'Thermique 80mm', desc: 'Ticket thermique grand format' },
  { value: 'thermal_58mm', label: 'Thermique 58mm', desc: 'Ticket thermique petit format' },
  { value: 'laser_a4', label: 'Laser A4', desc: 'Impression standard A4' },
  { value: 'pdf', label: 'PDF', desc: 'Télécharger en PDF' },
];

const JOB_TYPE_LABELS: Record<PrintJobType, string> = {
  ticket: 'Ticket',
  receipt: 'Reçu de caisse',
  report: 'Rapport',
};

// ── Print Preview Modal ────────────────────

export function PrintPreviewModal({ open, onOpenChange, type, data, defaultPrinterType = 'browser' }: PrintPreviewModalProps) {
  const [selectedPrinter, setSelectedPrinter] = useState<PrinterType>(defaultPrinterType);
  const [printing, setPrinting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const previewRef = useRef<HTMLIFrameElement>(null);

  const handlePrint = useCallback(async () => {
    setPrinting(true);
    setError(null);

    try {
      const options: PrintOptions = {
        printerType: selectedPrinter,
        preview: false,
      };

      if (type === 'ticket') {
        await printService.printTicket(data as PrintTicketData, options);
      } else if (type === 'receipt') {
        await printService.printReceipt(data as PrintReceiptData, options);
      }
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'impression');
    } finally {
      setPrinting(false);
    }
  }, [type, data, selectedPrinter, onOpenChange]);

  const handlePreview = useCallback(() => {
    const html = printService.generatePrintHTML(type, data, selectedPrinter);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank', 'width=500,height=800');
  }, [type, data, selectedPrinter]);

  // Reset printer selection when modal opens
  const handleOpenChange = useCallback((isOpen: boolean) => {
    if (isOpen) {
      setSelectedPrinter(defaultPrinterType);
      setError(null);
    }
    onOpenChange(isOpen);
  }, [defaultPrinterType, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg p-0 gap-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="p-5 pb-3">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Printer className="w-5 h-5 text-green-600" />
            Aperçu avant Impression
          </DialogTitle>
          <DialogDescription className="text-sm">
            Choisissez le format et l&apos;imprimante, puis imprimez.
          </DialogDescription>
        </DialogHeader>

        {/* Printer Selection */}
        <div className="px-5 pb-3">
          <label className="text-sm font-medium text-muted-foreground mb-2 block">
            Méthode d&apos;impression
          </label>
          <div className="grid grid-cols-1 gap-2">
            {PRINTER_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setSelectedPrinter(opt.value)}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-lg border-2 text-left transition-all',
                  selectedPrinter === opt.value
                    ? 'border-green-600 bg-green-50 dark:bg-green-950/20'
                    : 'border-muted hover:border-muted-foreground/30'
                )}
              >
                <div className={cn(
                  'w-4 h-4 rounded-full border-2 flex items-center justify-center',
                  selectedPrinter === opt.value
                    ? 'border-green-600 bg-green-600'
                    : 'border-muted-foreground/30'
                )}>
                  {selectedPrinter === opt.value && (
                    <div className="w-1.5 h-1.5 rounded-full bg-white" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">{opt.label}</p>
                  <p className="text-xs text-muted-foreground">{opt.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mx-5 mb-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          </div>
        )}

        {/* Actions */}
        <DialogFooter className="p-5 pt-3 flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={handlePreview} className="flex-1 gap-2">
            <Eye className="w-4 h-4" />
            Aperçu complet
          </Button>
          <Button
            onClick={handlePrint}
            disabled={printing}
            className="flex-1 gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold"
          >
            {printing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : selectedPrinter === 'pdf' ? (
              <FileDown className="w-4 h-4" />
            ) : (
              <Printer className="w-4 h-4" />
            )}
            {printing ? 'Impression en cours...' : selectedPrinter === 'pdf' ? 'Télécharger PDF' : 'Imprimer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Print Queue Panel ──────────────────────

function usePrintQueue(): PrintQueueState {
  return useSyncExternalStore(
    (callback) => printQueue.subscribe(callback),
    () => printQueue.getSnapshot(),
  );
}

export function PrintQueuePanel({ open, onOpenChange }: PrintQueuePanelProps) {
  const state = usePrintQueue();

  const handleRetry = useCallback(async (jobId: string) => {
    await printQueue.retryJob(jobId);
  }, []);

  const handleCancel = useCallback((jobId: string) => {
    printQueue.cancelJob(jobId);
  }, []);

  const handleClear = useCallback(() => {
    printQueue.clear();
  }, []);

  const recentJobs = [...state.jobs]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 20);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-5 pb-3">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Printer className="w-5 h-5" />
            File d&apos;impression
          </DialogTitle>
          <DialogDescription className="flex items-center gap-3 text-sm">
            <Badge variant="outline" className="text-xs">
              {state.stats.totalJobs} total
            </Badge>
            <Badge variant="outline" className="text-xs text-green-600">
              {state.stats.successCount} réussis
            </Badge>
            {state.stats.failedCount > 0 && (
              <Badge variant="outline" className="text-xs text-red-600">
                {state.stats.failedCount} échoués
              </Badge>
            )}
            {state.stats.pendingCount > 0 && (
              <Badge variant="outline" className="text-xs text-amber-600">
                {state.stats.pendingCount} en attente
              </Badge>
            )}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[400px]">
          <div className="px-5 pb-3 space-y-2">
            {recentJobs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Printer className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Aucun travail d&apos;impression</p>
              </div>
            ) : (
              recentJobs.map((job) => {
                const config = STATUS_CONFIG[job.status] || STATUS_CONFIG.pending;
                return (
                  <div
                    key={job.id}
                    className={cn(
                      'flex items-center gap-3 p-3 rounded-lg border transition-colors',
                      config.color
                    )}
                  >
                    <div className="shrink-0">{config.icon}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">
                          {JOB_TYPE_LABELS[job.type]}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {job.printerType.replace('_', ' ')}
                        </span>
                      </div>
                      {job.error && (
                        <p className="text-xs text-red-600 mt-0.5 truncate">{job.error}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {job.status === 'failed' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleRetry(job.id)}
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </Button>
                      )}
                      {(job.status === 'pending' || job.status === 'retrying') && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleCancel(job.id)}
                        >
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>

        {state.jobs.size > 0 && (
          <div className="px-5 pb-4">
            <Button variant="outline" size="sm" onClick={handleClear} className="w-full">
              <Trash2 className="w-4 h-4 mr-2" />
              Vider l&apos;historique
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── Quick Print Button ─────────────────────

interface QuickPrintButtonProps {
  type: PrintJobType;
  data: PrintTicketData | PrintReceiptData;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  showLabel?: boolean;
  defaultPrinterType?: PrinterType;
}

export function QuickPrintButton({
  type,
  data,
  variant = 'outline',
  size = 'default',
  className,
  showLabel = true,
  defaultPrinterType = 'browser',
}: QuickPrintButtonProps) {
  const [printing, setPrinting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const handleQuickPrint = useCallback(async () => {
    setPrinting(true);
    try {
      const options: PrintOptions = { printerType: defaultPrinterType };
      if (type === 'ticket') {
        await printService.printTicket(data as PrintTicketData, options);
      } else if (type === 'receipt') {
        await printService.printReceipt(data as PrintReceiptData, options);
      }
    } catch {
      // Show preview modal on failure for fallback
      setShowPreview(true);
    } finally {
      setPrinting(false);
    }
  }, [type, data, defaultPrinterType]);

  if (showLabel) {
    return (
      <>
        <Button
          variant={variant}
          size={size}
          className={className}
          onClick={handleQuickPrint}
          disabled={printing}
        >
          {printing ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Printer className="w-4 h-4" />
          )}
          <span className="ml-2">Imprimer</span>
        </Button>
        <PrintPreviewModal
          open={showPreview}
          onOpenChange={setShowPreview}
          type={type}
          data={data}
          defaultPrinterType={defaultPrinterType}
        />
      </>
    );
  }

  return (
    <>
      <Button
        variant={variant}
        size={size}
        className={className}
        onClick={handleQuickPrint}
        disabled={printing}
        aria-label="Imprimer"
      >
        {printing ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Printer className="w-4 h-4" />
        )}
      </Button>
      <PrintPreviewModal
        open={showPreview}
        onOpenChange={setShowPreview}
        type={type}
        data={data}
        defaultPrinterType={defaultPrinterType}
      />
    </>
  );
}

// ── Download PDF Button ────────────────────

interface DownloadPdfButtonProps {
  ticketId: string;
  ticketNumber: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
  className?: string;
  showLabel?: boolean;
}

export function DownloadPdfButton({
  ticketId,
  ticketNumber,
  variant = 'outline',
  size = 'default',
  className,
  showLabel = true,
}: DownloadPdfButtonProps) {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = useCallback(async () => {
    if (!ticketId) return;
    setDownloading(true);
    try {
      const { useAuthStore } = await import('@/stores/auth-store');
      const accessToken = useAuthStore.getState().accessToken;
      const headers: Record<string, string> = {};
      if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;

      // Try the print API first, fall back to legacy PDF route
      const urls = [
        `/api/print/ticket?id=${ticketId}`,
        `/api/tickets/${ticketId}/pdf`,
      ];

      let blob: Blob | null = null;
      let lastError = '';

      for (const url of urls) {
        try {
          const response = await fetch(url, { headers });
          if (response.ok) {
            const contentType = response.headers.get('content-type') || '';
            if (contentType.includes('application/pdf')) {
              blob = await response.blob();
              break;
            } else {
              const errorData = await response.json().catch(() => null);
              lastError = errorData?.error || 'Format non-PDF reçu';
            }
          } else {
            lastError = `Erreur serveur (${response.status})`;
          }
        } catch (err) {
          lastError = 'Erreur réseau';
        }
      }

      if (blob) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `ticket_${ticketNumber}.pdf`;
        link.click();
        URL.revokeObjectURL(url);
      } else {
        // Fallback: generate PDF via browser print
        throw new Error(lastError || 'Impossible de générer le PDF');
      }
    } catch (err) {
      // Show error toast via sonner
      const { toast } = await import('sonner');
      toast.error('Erreur PDF', {
        description: err instanceof Error ? err.message : 'Utilisez le bouton Imprimer.',
      });
    } finally {
      setDownloading(false);
    }
  }, [ticketId, ticketNumber]);

  if (showLabel) {
    return (
      <Button
        variant={variant}
        size={size}
        className={className}
        onClick={handleDownload}
        disabled={downloading}
      >
        {downloading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <FileDown className="w-4 h-4" />
        )}
        <span className="ml-2">PDF</span>
      </Button>
    );
  }

  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      onClick={handleDownload}
      disabled={downloading}
      aria-label="Télécharger PDF"
    >
      {downloading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <FileDown className="w-4 h-4" />
      )}
    </Button>
  );
}
