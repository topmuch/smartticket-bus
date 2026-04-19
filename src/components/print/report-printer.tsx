'use client';

import type { PrintReportData } from '@/lib/print/types';
import { formatPrice, formatDateFr } from '@/lib/print/print-utils';
import { cn } from '@/lib/utils';
import { Bus, CalendarDays, User, BarChart3 } from 'lucide-react';

interface ReportPreviewProps {
  report: PrintReportData;
  className?: string;
}

/**
 * Report preview component for admin reports.
 * Renders a structured A4 report with sections, tables, and summary.
 */
export function ReportPreview({ report, className }: ReportPreviewProps) {
  return (
    <div className={cn('bg-white border border-gray-300 shadow-lg max-w-[794px] mx-auto', className)}>
      {/* Header */}
      <div className="bg-[#0f4c75] text-white px-8 py-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
            <Bus className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">SmartTicket Bus</h1>
            <p className="text-xs text-white/70 uppercase tracking-wider">
              Rapport d&apos;activité
            </p>
          </div>
        </div>
      </div>

      <div className="px-8 py-6">
        {/* Report Title */}
        <div className="mb-6">
          <h2 className="text-lg font-bold text-gray-900">{report.title}</h2>
          {report.subtitle && (
            <p className="text-sm text-muted-foreground mt-0.5">{report.subtitle}</p>
          )}
          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <CalendarDays className="w-3.5 h-3.5" />
              <span>
                {formatDateFr(report.period.from)} — {formatDateFr(report.period.to)}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <User className="w-3.5 h-3.5" />
              <span>{report.generatedBy}</span>
            </div>
            <div className="flex items-center gap-1">
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Généré le {formatDateFr(report.generatedAt)}</span>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        {report.summary && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
              <p className="text-xs text-emerald-600 font-medium">Tickets vendus</p>
              <p className="text-2xl font-bold text-emerald-700">{report.summary.totalTickets}</p>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-xs text-blue-600 font-medium">Revenus totaux</p>
              <p className="text-2xl font-bold text-blue-700">{formatPrice(report.summary.totalRevenue)}</p>
            </div>
            <div className="bg-violet-50 border border-violet-200 rounded-lg p-4">
              <p className="text-xs text-violet-600 font-medium">Contrôles</p>
              <p className="text-2xl font-bold text-violet-700">{report.summary.totalValidations}</p>
            </div>
            {report.summary.validationRate !== undefined && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <p className="text-xs text-amber-600 font-medium">Taux de validation</p>
                <p className="text-2xl font-bold text-amber-700">{report.summary.validationRate}%</p>
              </div>
            )}
          </div>
        )}

        {/* Sections */}
        <div className="space-y-6">
          {report.sections.map((section, idx) => (
            <div key={idx}>
              <h3 className="text-sm font-semibold text-gray-900 mb-3 pb-1.5 border-b border-gray-200">
                {section.title}
              </h3>

              {section.type === 'table' && section.headers && section.rows && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50">
                        {section.headers.map((header, hIdx) => (
                          <th
                            key={hIdx}
                            className="text-left px-3 py-2 text-xs font-semibold text-gray-600 border-b border-gray-200"
                          >
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {section.rows.map((row, rIdx) => (
                        <tr key={rIdx} className={rIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                          {row.map((cell, cIdx) => (
                            <td
                              key={cIdx}
                              className="px-3 py-2 text-xs border-b border-gray-100"
                            >
                              {typeof cell === 'number' && cell > 1000
                                ? formatPrice(cell)
                                : String(cell)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {section.type === 'text' && section.content && (
                <div className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">
                  {section.content}
                </div>
              )}

              {section.type === 'summary' && section.rows && (
                <div className="grid grid-cols-2 gap-3">
                  {section.rows.map((row, rIdx) => (
                    <div key={rIdx} className="flex justify-between py-1.5 px-3 bg-gray-50 rounded">
                      <span className="text-sm text-gray-600">{String(row[0])}</span>
                      <span className="text-sm font-semibold">
                        {typeof row[1] === 'number' && row[1] > 1000
                          ? formatPrice(row[1])
                          : String(row[1])}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="px-8 py-4 border-t border-gray-200 bg-gray-50/50 text-center">
        <p className="text-[10px] text-muted-foreground">
          SmartTicket Bus — Rapport généré automatiquement le {formatDateFr(new Date().toISOString())}
        </p>
      </div>
    </div>
  );
}
