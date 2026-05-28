'use client';

import type { PrintReceiptData } from '@/lib/print/types';
import { formatPrice, formatDateFr, getPaymentMethodLabel } from '@/lib/print/print-utils';
import { cn } from '@/lib/utils';
import {
  Bus,
  Hash,
  Wallet,
  CreditCard,
  Smartphone,
  Banknote,
  ArrowRight,
  User,
} from 'lucide-react';

interface ReceiptPreviewProps {
  receipt: PrintReceiptData;
  className?: string;
  compact?: boolean;
}

/**
 * Receipt preview component for cash session close.
 * Renders a formatted receipt with ticket details.
 */
export function ReceiptPreview({ receipt, className, compact = false }: ReceiptPreviewProps) {
  return (
    <div className={cn('bg-white border-2 border-gray-300 rounded-lg overflow-hidden shadow-sm max-w-[350px] mx-auto', className)}>
      {/* Header */}
      <div className="bg-[#0f4c75] text-white px-4 py-3 text-center">
        <div className="flex items-center justify-center gap-2">
          <Bus className={cn(compact ? 'w-4 h-4' : 'w-5 h-5')} />
          <span className={cn('font-extrabold tracking-tight', compact ? 'text-sm' : 'text-lg')}>
            SmartTicket Bus
          </span>
        </div>
        <p className={cn('font-medium opacity-80 uppercase tracking-wider mt-0.5', compact ? 'text-[8px]' : 'text-xs')}>
          Reçu de Clôture de Caisse
        </p>
        <p className={cn('font-mono mt-1', compact ? 'text-[8px]' : 'text-[10px]')}>
          {receipt.receiptNumber}
        </p>
      </div>

      {/* Summary Grid */}
      <div className="px-4 py-3 border-b border-gray-200">
        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
          <div>
            <p className="text-[9px] text-muted-foreground">Opérateur</p>
            <p className={cn('font-semibold', compact ? 'text-[10px]' : 'text-xs')}>{receipt.operatorName}</p>
          </div>
          <div>
            <p className="text-[9px] text-muted-foreground">Date</p>
            <p className={cn('font-semibold', compact ? 'text-[10px]' : 'text-xs')}>{formatDateFr(receipt.date)}</p>
          </div>
        </div>
      </div>

      {/* Financial Summary */}
      <div className="px-4 py-3 border-b border-gray-200">
        <h4 className={cn('font-semibold mb-2', compact ? 'text-[10px]' : 'text-xs')}>Résumé Financier</h4>
        <div className="space-y-1.5">
          <div className="flex justify-between">
            <span className={cn('text-muted-foreground', compact ? 'text-[9px]' : 'text-xs')}>Fond de caisse</span>
            <span className={cn('font-mono font-semibold', compact ? 'text-[10px]' : 'text-xs')}>
              {formatPrice(receipt.openingBalance)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className={cn('text-muted-foreground', compact ? 'text-[9px]' : 'text-xs')}>Total ventes</span>
            <span className={cn('font-mono font-bold text-emerald-600', compact ? 'text-[11px]' : 'text-sm')}>
              {formatPrice(receipt.totalRevenue)}
            </span>
          </div>

          <div className="border-t border-dashed border-gray-200 pt-1.5 space-y-1">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-1 text-muted-foreground">
                <Banknote className="w-3 h-3" />
                <span className={compact ? 'text-[9px]' : 'text-[10px]'}>Espèces</span>
              </div>
              <span className={cn('font-mono', compact ? 'text-[10px]' : 'text-xs')}>
                {formatPrice(receipt.totalCashReceived)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-1 text-muted-foreground">
                <Smartphone className="w-3 h-3" />
                <span className={compact ? 'text-[9px]' : 'text-[10px]'}>Mobile Money</span>
              </div>
              <span className={cn('font-mono', compact ? 'text-[10px]' : 'text-xs')}>
                {formatPrice(receipt.totalMobileMoney)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-1 text-muted-foreground">
                <CreditCard className="w-3 h-3" />
                <span className={compact ? 'text-[9px]' : 'text-[10px]'}>Carte</span>
              </div>
              <span className={cn('font-mono', compact ? 'text-[10px]' : 'text-xs')}>
                {formatPrice(receipt.totalCard)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-1 text-muted-foreground">
                <Wallet className="w-3 h-3" />
                <span className={compact ? 'text-[9px]' : 'text-[10px]'}>Monnaie rendue</span>
              </div>
              <span className={cn('font-mono', compact ? 'text-[10px]' : 'text-xs')}>
                {formatPrice(receipt.totalChangeGiven)}
              </span>
            </div>
          </div>

          {receipt.actualCash !== undefined && (
            <>
              <div className="border-t border-dashed border-gray-200 pt-1.5">
                <div className="flex justify-between">
                  <span className={cn('font-medium', compact ? 'text-[10px]' : 'text-xs')}>Caisse réelle</span>
                  <span className={cn('font-mono font-bold', compact ? 'text-[10px]' : 'text-xs')}>
                    {formatPrice(receipt.actualCash)}
                  </span>
                </div>
                <div className="flex justify-between mt-1">
                  <span className={cn('font-medium', compact ? 'text-[10px]' : 'text-xs')}>Écart</span>
                  <span className={cn(
                    'font-mono font-bold',
                    compact ? 'text-[10px]' : 'text-xs',
                    (receipt.difference || 0) >= 0 ? 'text-emerald-600' : 'text-red-600'
                  )}>
                    {(receipt.difference || 0) >= 0 ? '+' : ''}{formatPrice(receipt.difference || 0)}
                  </span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Ticket Details */}
      <div className="px-4 py-3 border-b border-gray-200">
        <h4 className={cn('font-semibold mb-2', compact ? 'text-[10px]' : 'text-xs')}>
          Détail des tickets ({receipt.totalSales})
        </h4>
        <div className="max-h-48 overflow-y-auto space-y-1">
          {receipt.tickets.map((t, i) => (
            <div
              key={i}
              className="flex items-center gap-2 py-1 border-b border-gray-100 last:border-0"
            >
              <span className={cn('text-muted-foreground font-mono w-5 text-center shrink-0', compact ? 'text-[8px]' : 'text-[9px]')}>
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <span className={cn('truncate', compact ? 'text-[9px]' : 'text-[10px]')}>
                    {t.fromZone}
                  </span>
                  <ArrowRight className="w-2.5 h-2.5 text-muted-foreground shrink-0" />
                  <span className={cn('truncate', compact ? 'text-[9px]' : 'text-[10px]')}>
                    {t.toZone}
                  </span>
                </div>
                {t.passengerName && (
                  <span className="text-[7px] text-muted-foreground">{t.passengerName}</span>
                )}
              </div>
              <span className={cn('font-mono font-bold text-emerald-600 shrink-0', compact ? 'text-[9px]' : 'text-[10px]')}>
                {formatPrice(t.price)}
              </span>
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-2 pt-2 border-t border-gray-300">
          <span className={cn('font-bold', compact ? 'text-[10px]' : 'text-xs')}>TOTAL</span>
          <span className={cn('font-mono font-extrabold text-emerald-600', compact ? 'text-[11px]' : 'text-sm')}>
            {formatPrice(receipt.totalRevenue)}
          </span>
        </div>
      </div>

      {/* Signatures */}
      <div className="px-4 py-3">
        <div className="flex justify-around">
          <div className="text-center">
            <div className="border-t border-gray-400 w-24 mx-auto mb-1" />
            <span className={cn('text-muted-foreground', compact ? 'text-[8px]' : 'text-[9px]')}>Opérateur</span>
          </div>
          <div className="text-center">
            <div className="border-t border-gray-400 w-24 mx-auto mb-1" />
            <span className={cn('text-muted-foreground', compact ? 'text-[8px]' : 'text-[9px]')}>Responsable</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-2 text-center border-t border-gray-200 bg-gray-50/50">
        <p className={cn('text-muted-foreground', compact ? 'text-[7px]' : 'text-[8px]')}>
          SmartTicket Bus — Document généré le {formatDateFr(new Date().toISOString())}
        </p>
      </div>
    </div>
  );
}
