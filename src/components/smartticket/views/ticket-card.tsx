'use client';

import { useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  Bus,
  Printer,
  RotateCcw,
  ArrowRight,
  Clock,
  Hash,
  User,
  Download,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { formatCurrency, formatDate } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';

interface SoldTicket {
  id: string;
  ticketNumber: string;
  qrCode: string;
  price: number;
  amountPaid: number;
  changeGiven: number;
  validFrom: string;
  validTo: string;
  passengerName: string | null;
  type: string;
  status: string;
  fromZone: string;
  toZone: string;
}

interface TicketCardProps {
  ticket: SoldTicket;
  onClose: () => void;
  onNewSale?: () => void;
}

export default function TicketCard({ ticket, onClose, onNewSale }: TicketCardProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const handleDownloadPdf = async () => {
    if (!ticket.id) return;
    setDownloadingPdf(true);
    try {
      const accessToken = useAuthStore.getState().accessToken;
      const headers: Record<string, string> = {};
      if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;
      
      const response = await fetch(`/api/tickets/${ticket.id}/pdf`, { headers });
      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `ticket_${ticket.ticketNumber}.pdf`;
        link.click();
        URL.revokeObjectURL(url);
      }
    } catch {
      // Fallback to print
      handlePrint();
    }
    setDownloadingPdf(false);
  };

  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;

    const printWindow = window.open('', '_blank', 'width=400,height=700');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Ticket SmartTicket</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 16px; }
          .ticket { border: 2px solid #333; border-radius: 12px; overflow: hidden; max-width: 320px; margin: 0 auto; }
          .header { background: #16a34a; color: white; padding: 12px 16px; text-align: center; }
          .header h2 { font-size: 14px; font-weight: 600; }
          .header .logo { font-size: 18px; font-weight: 800; }
          .route { padding: 12px 16px; text-align: center; border-bottom: 1px dashed #ccc; }
          .route .from-to { font-size: 18px; font-weight: 700; margin: 8px 0; }
          .route .zones { font-size: 13px; color: #666; }
          .price-section { text-align: center; padding: 12px 16px; border-bottom: 1px dashed #ccc; }
          .price-section .amount { font-size: 32px; font-weight: 800; color: #16a34a; }
          .price-section .label { font-size: 12px; color: #666; }
          .qr-section { padding: 12px 16px; text-align: center; border-bottom: 1px dashed #ccc; }
          .details { padding: 10px 16px; font-size: 11px; color: #666; }
          .details .row { display: flex; justify-content: space-between; margin: 4px 0; }
          .footer { text-align: center; padding: 8px; font-size: 10px; color: #999; border-top: 1px solid #eee; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="ticket">
          <div class="header">
            <div class="logo">🚌 SmartTicket</div>
            <h2>Ticket de Transport</h2>
          </div>
          <div class="route">
            <div style="display:flex;align-items:center;justify-content:center;gap:8px;">
              <span style="width:10px;height:10px;border-radius:50%;background:#16a34a;display:inline-block;"></span>
              <span>${ticket.fromZone}</span>
              <span>→</span>
              <span>${ticket.toZone}</span>
              <span style="width:10px;height:10px;border-radius:50%;background:#dc2626;display:inline-block;"></span>
            </div>
          </div>
          <div class="price-section">
            <div class="amount">${formatCurrency(ticket.price)}</div>
            <div class="label">Prix du trajet</div>
          </div>
          <div class="qr-section">
            <img src="data:image/svg+xml;base64,${btoa(new XMLSerializer().serializeToString(
              document.querySelector('#ticket-qr svg') || document.createElementNS('http://www.w3.org/2000/svg', 'svg')
            ))}" style="width:120px;height:120px;margin:0 auto;" />
          </div>
          <div class="details">
            <div class="row"><span>N° Ticket</span><span style="font-weight:600;">${ticket.ticketNumber}</span></div>
            ${ticket.passengerName ? `<div class="row"><span>Passager</span><span>${ticket.passengerName}</span></div>` : ''}
            <div class="row"><span>Valide du</span><span>${formatDate(ticket.validFrom)}</span></div>
            <div class="row"><span>Valide jusqu'au</span><span>${formatDate(ticket.validTo)}</span></div>
          </div>
          <div class="footer">
            SmartTicket Bus — Système de billetterie intelligent
          </div>
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 300);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="relative w-full max-w-sm">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute -top-2 -right-2 z-10 w-8 h-8 rounded-full bg-background border shadow-sm flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Fermer"
        >
          ✕
        </button>

        {/* Ticket Card */}
        <div
          ref={printRef}
          className="animate-in slide-in-from-bottom-4 fade-in duration-500"
        >
          {/* Perforated top edge */}
          <div className="relative">
            <div className="absolute -top-3 left-0 right-0 flex items-center justify-between px-4">
              <div className="w-6 h-6 rounded-full bg-background border shadow-sm" />
              <div className="w-6 h-6 rounded-full bg-background border shadow-sm" />
            </div>
          </div>

          <div className="bg-background rounded-2xl border-2 shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="bg-green-600 dark:bg-green-700 text-white px-5 py-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Bus className="w-5 h-5" />
                <span className="text-xl font-extrabold tracking-tight">SmartTicket</span>
              </div>
              <p className="text-xs font-medium text-green-100 uppercase tracking-wider">
                Ticket de Transport
              </p>
            </div>

            {/* Route Section */}
            <div className="px-5 py-4 text-center border-b border-dashed border-muted-foreground/30">
              <div className="flex items-center justify-center gap-3">
                <div className="flex flex-col items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-green-500 ring-2 ring-green-200 dark:ring-green-800" />
                  <span className="text-xs text-muted-foreground">Départ</span>
                </div>

                <div className="flex-1 flex flex-col items-center">
                  <span className="font-bold text-base text-foreground">
                    {ticket.fromZone}
                  </span>
                  <div className="w-full flex items-center gap-1 py-1">
                    <div className="flex-1 h-px bg-muted-foreground/30" />
                    <ArrowRight className="w-4 h-4 text-muted-foreground" />
                    <div className="flex-1 h-px bg-muted-foreground/30" />
                  </div>
                  <span className="font-bold text-base text-foreground">
                    {ticket.toZone}
                  </span>
                </div>

                <div className="flex flex-col items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-red-500 ring-2 ring-red-200 dark:ring-red-800" />
                  <span className="text-xs text-muted-foreground">Arrivée</span>
                </div>
              </div>
            </div>

            {/* Price Section */}
            <div className="px-5 py-4 text-center border-b border-dashed border-muted-foreground/30 bg-muted/30">
              <p className="text-xs text-muted-foreground mb-1">Prix du trajet</p>
              <p className="text-3xl font-extrabold text-green-600 dark:text-green-400">
                {formatCurrency(ticket.price)}
              </p>
            </div>

            {/* QR Code Section */}
            <div className="px-5 py-4 text-center border-b border-dashed border-muted-foreground/30" id="ticket-qr">
              <div className="inline-block bg-white p-3 rounded-xl border shadow-sm">
                <QRCodeSVG
                  value={ticket.qrCode || ticket.id}
                  size={140}
                  level="M"
                  includeMargin={false}
                  bgColor="#ffffff"
                  fgColor="#000000"
                />
              </div>
              <p className="text-[10px] text-muted-foreground mt-2 font-mono">
                {ticket.ticketNumber}
              </p>
            </div>

            {/* Perforated middle */}
            <div className="relative">
              <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-background border shadow-sm" />
              <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-background border shadow-sm" />
              <Separator className="border-dashed" />
            </div>

            {/* Details Section */}
            <div className="px-5 py-3 space-y-2">
              {/* Ticket Number */}
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Hash className="w-3.5 h-3.5" />
                  <span className="text-xs">N° Ticket</span>
                </div>
                <span className="font-mono font-bold text-xs">{ticket.ticketNumber}</span>
              </div>

              {/* Passenger */}
              {ticket.passengerName && (
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <User className="w-3.5 h-3.5" />
                    <span className="text-xs">Passager</span>
                  </div>
                  <span className="font-medium text-xs">{ticket.passengerName}</span>
                </div>
              )}

              {/* Validity */}
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Clock className="w-3.5 h-3.5" />
                  <span className="text-xs">Validité</span>
                </div>
                <span className="text-xs text-right leading-tight">
                  {formatDate(ticket.validFrom)}
                  <br />
                  <span className="text-muted-foreground">→</span>{' '}
                  {formatDate(ticket.validTo)}
                </span>
              </div>

              {/* Status */}
              <div className="flex items-center justify-between text-sm pt-1">
                <span className="text-xs text-muted-foreground">Statut</span>
                <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 text-xs">
                  Valide
                </Badge>
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 py-2.5 text-center border-t border-muted-foreground/10">
              <p className="text-[10px] text-muted-foreground">
                🚌 SmartTicket Bus — Système de billetterie intelligent
              </p>
            </div>
          </div>

          {/* Perforated bottom edge */}
          <div className="relative">
            <div className="absolute -bottom-3 left-0 right-0 flex items-center justify-between px-4">
              <div className="w-6 h-6 rounded-full bg-background border shadow-sm" />
              <div className="w-6 h-6 rounded-full bg-background border shadow-sm" />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 mt-6 animate-in fade-in slide-in-from-bottom-2 duration-700">
          <Button
            variant="outline"
            className="flex-1 h-12"
            onClick={handlePrint}
          >
            <Printer className="w-4 h-4 mr-2" />
            Imprimer
          </Button>
          <Button
            variant="outline"
            className="flex-1 h-12"
            onClick={handleDownloadPdf}
            disabled={downloadingPdf}
          >
            {downloadingPdf ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Download className="w-4 h-4 mr-2" />
            )}
            PDF
          </Button>
          <Button
            className="flex-1 h-12 bg-green-600 hover:bg-green-700 text-white font-semibold"
            onClick={() => {
              onClose();
              onNewSale?.();
            }}
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Nouvelle Vente
          </Button>
        </div>
      </div>
    </div>
  );
}
