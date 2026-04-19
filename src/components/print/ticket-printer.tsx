'use client';

import { QRCodeSVG } from 'qrcode.react';
import type { PrintTicketData } from '@/lib/print/types';
import { formatPrice, formatDateFr, getTicketStatusLabel, getPaymentMethodLabel, getTicketTypeLabel } from '@/lib/print/print-utils';
import { cn } from '@/lib/utils';
import {
  Bus,
  ArrowRight,
  Hash,
  User,
  Clock,
  CreditCard,
  Banknote,
} from 'lucide-react';

interface TicketThermalPreviewProps {
  ticket: PrintTicketData;
  className?: string;
  printerWidth?: '58mm' | '80mm';
}

/**
 * Thermal ticket preview component for print preview.
 * Renders a realistic thermal ticket with QR code.
 */
export function TicketThermalPreview({ ticket, className, printerWidth = '80mm' }: TicketThermalPreviewProps) {
  const isNarrow = printerWidth === '58mm';
  const statusColor = ticket.status === 'VALID'
    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
    : ticket.status === 'USED'
    ? 'bg-gray-100 text-gray-700'
    : 'bg-red-100 text-red-800';

  return (
    <div
      className={cn(
        'bg-white border-2 border-gray-300 rounded-lg overflow-hidden shadow-sm',
        isNarrow ? 'w-[220px]' : 'w-[302px]',
        className,
      )}
    >
      {/* Header */}
      <div className="bg-[#0f4c75] text-white px-3 py-2 text-center">
        <div className="flex items-center justify-center gap-1.5">
          <Bus className={cn(isNarrow ? 'w-4 h-4' : 'w-5 h-5')} />
          <span className={cn('font-extrabold tracking-tight', isNarrow ? 'text-sm' : 'text-base')}>
            SmartTicket
          </span>
        </div>
        <p className={cn('font-medium opacity-80 uppercase tracking-wider', isNarrow ? 'text-[8px]' : 'text-[10px]')}>
          Ticket de Transport
        </p>
        <div className="flex justify-center gap-1.5 mt-1.5">
          <span className={cn('px-1.5 py-0.5 rounded bg-emerald-500 text-white font-bold', isNarrow ? 'text-[7px]' : 'text-[8px]')}>
            {getTicketTypeLabel(ticket.type)}
          </span>
          <span className={cn('px-1.5 py-0.5 rounded bg-violet-500 text-white font-bold', isNarrow ? 'text-[7px]' : 'text-[8px]')}>
            {getTicketStatusLabel(ticket.status)}
          </span>
          {ticket.lineNumber && (
            <span className={cn('px-1.5 py-0.5 rounded bg-amber-400 text-gray-900 font-bold', isNarrow ? 'text-[7px]' : 'text-[8px]')}>
              Ligne {ticket.lineNumber}
            </span>
          )}
        </div>
      </div>

      {/* Route */}
      <div className="px-3 py-2 text-center border-b border-dashed border-gray-300">
        <div className="flex items-center justify-center gap-2">
          <div className="flex flex-col items-center gap-0.5">
            <div className="w-2.5 h-2.5 rounded-full bg-green-500 ring-2 ring-green-200" />
            <span className={cn('text-muted-foreground', isNarrow ? 'text-[7px]' : 'text-[8px]')}>Départ</span>
          </div>
          <div className="flex flex-col items-center flex-1">
            <span className={cn('font-bold text-foreground', isNarrow ? 'text-[11px]' : 'text-sm')}>
              {ticket.fromZone}
            </span>
            <div className="w-full flex items-center gap-1 py-0.5">
              <div className="flex-1 h-px bg-gray-300" />
              <ArrowRight className={cn('text-muted-foreground', isNarrow ? 'w-3 h-3' : 'w-3.5 h-3.5')} />
              <div className="flex-1 h-px bg-gray-300" />
            </div>
            <span className={cn('font-bold text-foreground', isNarrow ? 'text-[11px]' : 'text-sm')}>
              {ticket.toZone}
            </span>
          </div>
          <div className="flex flex-col items-center gap-0.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500 ring-2 ring-red-200" />
            <span className={cn('text-muted-foreground', isNarrow ? 'text-[7px]' : 'text-[8px]')}>Arrivée</span>
          </div>
        </div>
        {ticket.fromStop && ticket.toStop && (
          <p className={cn('text-muted-foreground mt-1', isNarrow ? 'text-[7px]' : 'text-[8px]')}>
            {ticket.fromStop} → {ticket.toStop}
          </p>
        )}
      </div>

      {/* Price */}
      <div className="px-3 py-2 text-center border-b border-dashed border-gray-300 bg-gray-50/50">
        <p className={cn('text-muted-foreground', isNarrow ? 'text-[7px]' : 'text-[9px]')}>Prix du trajet</p>
        <p className={cn('font-extrabold text-emerald-600', isNarrow ? 'text-lg' : 'text-2xl')}>
          {formatPrice(ticket.price)}
        </p>
      </div>

      {/* QR Code */}
      <div className="px-3 py-2 text-center border-b border-dashed border-gray-300">
        <div className="inline-block bg-white p-2 rounded-lg border shadow-sm">
          <QRCodeSVG
            value={ticket.qrToken || ticket.id}
            size={isNarrow ? 100 : 120}
            level="M"
            includeMargin={false}
            bgColor="#ffffff"
            fgColor="#000000"
          />
        </div>
        <p className={cn('text-muted-foreground mt-1 font-mono', isNarrow ? 'text-[7px]' : 'text-[8px]')}>
          {ticket.ticketNumber}
        </p>
      </div>

      {/* Details */}
      <div className="px-3 py-2 space-y-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 text-muted-foreground">
            <Hash className={cn(isNarrow ? 'w-3 h-3' : 'w-3.5 h-3.5')} />
            <span className={cn(isNarrow ? 'text-[8px]' : 'text-[9px]')}>N° Ticket</span>
          </div>
          <span className={cn('font-mono font-bold', isNarrow ? 'text-[8px]' : 'text-[9px]')}>
            {ticket.ticketNumber}
          </span>
        </div>

        {ticket.passengerName && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 text-muted-foreground">
              <User className={cn(isNarrow ? 'w-3 h-3' : 'w-3.5 h-3.5')} />
              <span className={cn(isNarrow ? 'text-[8px]' : 'text-[9px]')}>Passager</span>
            </div>
            <span className={cn('font-medium', isNarrow ? 'text-[8px]' : 'text-[9px]')}>
              {ticket.passengerName}
            </span>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 text-muted-foreground">
            <CreditCard className={cn(isNarrow ? 'w-3 h-3' : 'w-3.5 h-3.5')} />
            <span className={cn(isNarrow ? 'text-[8px]' : 'text-[9px]')}>Paiement</span>
          </div>
          <span className={cn('font-medium', isNarrow ? 'text-[8px]' : 'text-[9px]')}>
            {getPaymentMethodLabel(ticket.paymentMethod)}
          </span>
        </div>

        {ticket.paymentMethod === 'cash' && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 text-muted-foreground">
              <Banknote className={cn(isNarrow ? 'w-3 h-3' : 'w-3.5 h-3.5')} />
              <span className={cn(isNarrow ? 'text-[8px]' : 'text-[9px]')}>Monnaie</span>
            </div>
            <span className={cn('font-medium text-emerald-600', isNarrow ? 'text-[8px]' : 'text-[9px]')}>
              {formatPrice(ticket.changeGiven)}
            </span>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 text-muted-foreground">
            <Clock className={cn(isNarrow ? 'w-3 h-3' : 'w-3.5 h-3.5')} />
            <span className={cn(isNarrow ? 'text-[8px]' : 'text-[9px]')}>Validité</span>
          </div>
          <span className={cn('text-right leading-tight', isNarrow ? 'text-[7px]' : 'text-[8px]')}>
            {formatDateFr(ticket.validFrom)}
            <br />
            <span className="text-muted-foreground">→</span> {formatDateFr(ticket.validTo)}
          </span>
        </div>

        <div className="flex items-center justify-between pt-1">
          <span className={cn('text-muted-foreground', isNarrow ? 'text-[8px]' : 'text-[9px]')}>Vendeur</span>
          <span className={cn(isNarrow ? 'text-[8px]' : 'text-[9px]')}>{ticket.soldByName}</span>
        </div>
      </div>

      {/* Footer */}
      <div className="px-3 py-1.5 text-center border-t border-gray-200">
        <p className={cn('text-muted-foreground', isNarrow ? 'text-[6px]' : 'text-[7px]')}>
          🚌 SmartTicket Bus — Système de billetterie intelligent
        </p>
      </div>

      {/* Cut line */}
      <div className="border-t border-dashed border-gray-400 mx-3">
        <p className={cn('text-center text-gray-400 -mt-1.5 bg-white w-fit mx-auto px-2', isNarrow ? 'text-[6px]' : 'text-[7px]')}>
          ✂ Découper ici
        </p>
      </div>
    </div>
  );
}
