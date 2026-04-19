// ============================================
// SmartTicketQR — Core Print Service
// Client-side print orchestration with fallbacks
// ============================================

import type {
  PrintJobType,
  PrinterType,
  PrintOptions,
  PrintTicketData,
  PrintReceiptData,
  PrintLogEntry,
} from './types';
import { printQueue, type PrintQueueManager } from './print-queue';
import { detectEnvironment, getBestPrintMethods } from './environment';

// ── Singleton Print Service ─────────────────────

class PrintServiceClass {
  private queue: PrintQueueManager = printQueue;
  private _logs: PrintLogEntry[] = [];
  private _maxLogs = 200;

  // ── Public API ──────────────────────────────────

  /**
   * Print a ticket — detects environment and picks the best method.
   * Falls back automatically if the primary method fails.
   */
  async printTicket(data: PrintTicketData, options: PrintOptions = {}): Promise<string> {
    const env = detectEnvironment();
    const methods = getBestPrintMethods(env);
    const selectedMethod = options.printerType || methods[0] || 'browser';

    const jobId = this.queue.addJob('ticket', selectedMethod, data, options);

    // Log the request
    this.addLog({
      id: this.generateId(),
      jobId,
      ticketId: data.id,
      action: 'print_requested',
      printerType: selectedMethod,
      environment: env.isWindows ? 'windows_desktop' : env.isAndroid ? 'android_pwa' : 'web_browser',
      timestamp: new Date().toISOString(),
    });

    try {
      await this.executePrint('ticket', data, selectedMethod, options);
      this.queue.updateJobStatus(jobId, 'success');
      this.addLog({
        id: this.generateId(),
        jobId,
        ticketId: data.id,
        action: 'print_success',
        printerType: selectedMethod,
        environment: env.isWindows ? 'windows_desktop' : env.isAndroid ? 'android_pwa' : 'web_browser',
        timestamp: new Date().toISOString(),
      });
      return jobId;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);

      // Try fallback methods
      for (let i = 0; i < methods.length; i++) {
        const fallbackMethod = methods[i];
        if (fallbackMethod === selectedMethod) continue;

        this.addLog({
          id: this.generateId(),
          jobId,
          ticketId: data.id,
          action: 'retry',
          printerType: fallbackMethod,
          environment: env.isWindows ? 'windows_desktop' : env.isAndroid ? 'android_pwa' : 'web_browser',
          timestamp: new Date().toISOString(),
          error: `Fallback from ${selectedMethod}: ${errorMsg}`,
        });

        try {
          await this.executePrint('ticket', data, fallbackMethod, options);
          this.queue.updateJobStatus(jobId, 'success');
          return jobId;
        } catch (fallbackError) {
          continue;
        }
      }

      // All methods failed
      this.queue.updateJobStatus(jobId, 'failed', errorMsg);
      this.addLog({
        id: this.generateId(),
        jobId,
        ticketId: data.id,
        action: 'print_failed',
        printerType: selectedMethod,
        environment: env.isWindows ? 'windows_desktop' : env.isAndroid ? 'android_pwa' : 'web_browser',
        timestamp: new Date().toISOString(),
        error: errorMsg,
      });
      throw new Error(`Toutes les méthodes d'impression ont échoué: ${errorMsg}`);
    }
  }

  /**
   * Print a receipt (caisse close).
   */
  async printReceipt(data: PrintReceiptData, options: PrintOptions = {}): Promise<string> {
    const env = detectEnvironment();
    const selectedMethod = options.printerType || 'laser_a4';

    const jobId = this.queue.addJob('receipt', selectedMethod, data, options);

    try {
      await this.executePrint('receipt', data, selectedMethod, options);
      this.queue.updateJobStatus(jobId, 'success');
      return jobId;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.queue.updateJobStatus(jobId, 'failed', errorMsg);
      throw error;
    }
  }

  /**
   * Execute the actual print based on type and method.
   */
  private async executePrint(
    type: PrintJobType,
    data: PrintTicketData | PrintReceiptData,
    method: PrinterType,
    options: PrintOptions,
  ): Promise<void> {
    switch (method) {
      case 'browser':
        await this.browserPrint(type, data, options);
        break;
      case 'pdf':
        await this.generatePdf(type, data);
        break;
      case 'thermal_58mm':
      case 'thermal_80mm':
        // For thermal in browser, use browser print with thermal CSS
        await this.browserPrint(type, data, { ...options, printerType: method });
        break;
      case 'laser_a4':
      case 'laser_a5':
        await this.browserPrint(type, data, { ...options, printerType: method });
        break;
      default:
        await this.browserPrint(type, data, options);
    }
  }

  /**
   * Browser-based printing using window.open + @media print CSS.
   * This is the most reliable cross-platform method.
   */
  private async browserPrint(
    type: PrintJobType,
    data: PrintTicketData | PrintReceiptData,
    options: PrintOptions,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const printWindow = window.open('', '_blank', 'width=500,height=800');
      if (!printWindow) {
        reject(new Error('Popup bloqué. Autorisez les popups pour imprimer.'));
        return;
      }

      const html = this.generatePrintHTML(type, data, options.printerType || 'browser');
      printWindow.document.write(html);
      printWindow.document.close();

      // Wait for content to load
      printWindow.onload = () => {
        // Small delay to ensure fonts and images are rendered
        setTimeout(() => {
          try {
            printWindow.focus();
            printWindow.print();
            setTimeout(() => printWindow.close(), 500);
            resolve();
          } catch (err) {
            printWindow.close();
            reject(new Error('Erreur lors de l\'impression'));
          }
        }, 300);
      };

      // Fallback if onload doesn't fire
      setTimeout(() => {
        try {
          printWindow.focus();
          printWindow.print();
          setTimeout(() => printWindow.close(), 500);
          resolve();
        } catch {
          reject(new Error('Délai d\'impression dépassé'));
        }
      }, 2000);
    });
  }

  /**
   * Generate PDF and trigger download.
   * Uses server-side PDF generation via API.
   */
  private async generatePdf(
    type: PrintJobType,
    data: PrintTicketData | PrintReceiptData,
  ): Promise<void> {
    let url: string;

    if (type === 'ticket') {
      const ticketData = data as PrintTicketData;
      url = `/api/print/ticket?id=${ticketData.id}`;
    } else if (type === 'receipt') {
      const receiptData = data as PrintReceiptData;
      url = `/api/print/receipt?sessionId=${receiptData.cashSessionId}`;
    } else {
      throw new Error('Type non supporté pour la génération PDF');
    }

    // Get auth token
    const authStore = (await import('@/stores/auth-store')).useAuthStore.getState();
    const headers: Record<string, string> = {};
    if (authStore.accessToken) {
      headers['Authorization'] = `Bearer ${authStore.accessToken}`;
    }

    const response = await fetch(url, { headers });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(errorData?.error || `Erreur serveur (${response.status})`);
    }

    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/pdf')) {
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = type === 'ticket'
        ? `ticket_${(data as PrintTicketData).ticketNumber}.pdf`
        : `recu_${(data as PrintReceiptData).receiptNumber}.pdf`;
      link.click();
      URL.revokeObjectURL(blobUrl);
    } else {
      throw new Error('Le serveur n\'a pas retourné un PDF');
    }
  }

  /**
   * Generate the print HTML with proper CSS for thermal/A4.
   */
  generatePrintHTML(
    type: PrintJobType,
    data: PrintTicketData | PrintReceiptData,
    printerType: PrinterType,
  ): string {
    if (type === 'ticket') {
      return this.generateTicketHTML(data as PrintTicketData, printerType);
    } else if (type === 'receipt') {
      return this.generateReceiptHTML(data as PrintReceiptData, printerType);
    }
    return '<html><body><p>Format non supporté</p></body></html>';
  }

  // ── Ticket HTML Generation ─────────────────────

  private generateTicketHTML(ticket: PrintTicketData, printerType: PrinterType): string {
    const isThermal = printerType === 'thermal_58mm' || printerType === 'thermal_80mm';
    const paperWidth = isThermal ? (printerType === 'thermal_58mm' ? 58 : 80) : 80;
    const margin = isThermal ? 3 : 5;
    const contentWidth = paperWidth - margin * 2;
    const fontSize = isThermal ? '10px' : '12px';
    const titleSize = isThermal ? '14px' : '16px';
    const smallSize = isThermal ? '7px' : '9px';

    const typeLabel = ticket.type === 'SUBSCRIPTION' ? 'ABONNEMENT' : 'TICKET UNITÉ';
    const statusLabel = this.getStatusLabel(ticket.status);
    const paymentLabel = ticket.paymentMethod === 'cash' ? 'Espèces'
      : ticket.paymentMethod === 'mobile' ? 'Mobile Money' : 'Carte';

    const formatFr = (d: string) => new Date(d).toLocaleDateString('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });

    const formatPrice = (n: number) => new Intl.NumberFormat('fr-FR').format(n) + ' FCFA';

    // We'll embed the QR code as a data URL via the qrcode library
    // Since we're in browser, we'll use a canvas approach
    // For now, we'll generate an inline SVG placeholder that the window will replace
    const qrPlaceholder = `
      <div id="qr-container" style="text-align:center;margin:8px 0;">
        <div style="display:inline-block;padding:6px;border:1px solid #ddd;border-radius:8px;background:white;">
          <canvas id="qr-canvas" width="120" height="120"></canvas>
        </div>
        <div style="font-size:${smallSize};color:#999;margin-top:4px;">${ticket.ticketNumber}</div>
      </div>
      <script>
        // Generate QR code inline
        (function() {
          var script = document.createElement('script');
          script.src = 'https://cdn.jsdelivr.net/npm/qrcode@1.5.4/build/qrcode.min.js';
          script.onload = function() {
            if (typeof QRCode !== 'undefined') {
              QRCode.toCanvas(document.getElementById('qr-canvas'), '${ticket.qrToken}', {
                width: 120, margin: 1, color: { dark: '#000', light: '#fff' }
              });
            }
          };
          document.head.appendChild(script);
        })();
      </script>
    `;

    return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Ticket ${ticket.ticketNumber}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Courier New', Courier, monospace;
      color: #1a1a1a;
      width: ${paperWidth}mm;
      margin: 0 auto;
      padding: 0;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .ticket {
      border: ${isThermal ? '1px dashed #ccc' : '2px solid #333'};
      border-radius: ${isThermal ? '4px' : '12px'};
      overflow: hidden;
      max-width: ${paperWidth}mm;
      margin: 0;
    }
    .header {
      background: #0f4c75;
      color: white;
      padding: ${isThermal ? '6px 8px' : '12px 16px'};
      text-align: center;
    }
    .header .logo { font-size: ${titleSize}; font-weight: 800; letter-spacing: -0.5px; }
    .header .sub { font-size: ${smallSize}; font-weight: 400; opacity: 0.8; }
    .header .badge-row { display: flex; justify-content: center; gap: 6px; margin-top: 4px; }
    .header .badge {
      display: inline-block; padding: 1px 6px; border-radius: 3px;
      font-size: ${smallSize}; font-weight: 700;
    }
    .badge-type { background: #00b894; }
    .badge-status { background: #6c5ce7; }
    .badge-line { background: #fdcb6e; color: #2d3436; }
    .section { padding: ${margin}mm ${margin}mm; border-bottom: 1px dashed #ccc; }
    .section:last-child { border-bottom: none; }
    .route {
      text-align: center; font-size: ${fontSize};
      padding: ${isThermal ? '4px 0' : '8px 0'};
    }
    .route .label { font-size: ${smallSize}; color: #888; margin-bottom: 2px; }
    .route .stations {
      display: flex; align-items: center; justify-content: center; gap: 6px;
      font-size: ${isThermal ? '11px' : '14px'}; font-weight: 700;
    }
    .route .arrow { color: #00b894; }
    .price-section { text-align: center; padding: ${isThermal ? '3px 0' : '8px 0'}; }
    .price-section .amount { font-size: ${isThermal ? '18px' : '28px'}; font-weight: 800; color: #00b894; }
    .price-section .label { font-size: ${smallSize}; color: #888; }
    .details { font-size: ${smallSize}; }
    .details .row { display: flex; justify-content: space-between; padding: 1.5px 0; }
    .details .row .label { color: #888; }
    .details .row .value { font-weight: 600; }
    .footer {
      text-align: center; padding: ${isThermal ? '3px 0' : '6px 0'};
      font-size: ${isThermal ? '6px' : '8px'}; color: #aaa;
    }
    .cut-line {
      border: none; border-top: 1px dashed #ccc; margin: 4px 0;
    }

    @media print {
      @page {
        size: ${paperWidth}mm auto;
        margin: 0;
      }
      body { width: ${paperWidth}mm; }
      .ticket { border: none; max-width: 100%; }
      .cut-line { display: none; }
    }
  </style>
</head>
<body>
  <div class="ticket">
    <!-- HEADER -->
    <div class="header">
      <div class="logo">🚌 SmartTicket Bus</div>
      <div class="sub">TICKET DE TRANSPORT</div>
      <div class="badge-row">
        <span class="badge badge-type">${typeLabel}</span>
        <span class="badge badge-status">${statusLabel}</span>
        ${ticket.lineNumber ? `<span class="badge badge-line">Ligne ${ticket.lineNumber}</span>` : ''}
      </div>
    </div>

    <!-- ROUTE -->
    <div class="section route">
      <div class="label">TRAJET</div>
      <div class="stations">
        <span>${ticket.fromZone}</span>
        <span class="arrow">→</span>
        <span>${ticket.toZone}</span>
      </div>
      ${ticket.fromStop && ticket.toStop ? `<div style="font-size:${smallSize};color:#888;margin-top:2px;">${ticket.fromStop} → ${ticket.toStop}</div>` : ''}
    </div>

    <!-- PRICE -->
    <div class="section price-section">
      <div class="amount">${formatPrice(ticket.price)}</div>
      <div class="label">Prix du trajet</div>
    </div>

    <!-- QR CODE -->
    <div class="section" style="padding: 6px ${margin}mm;">
      ${qrPlaceholder}
    </div>

    <!-- DETAILS -->
    <div class="section details">
      <div class="row"><span class="label">N° Ticket</span><span class="value">${ticket.ticketNumber}</span></div>
      ${ticket.passengerName ? `<div class="row"><span class="label">Passager</span><span class="value">${ticket.passengerName}</span></div>` : ''}
      <div class="row"><span class="label">Paiement</span><span class="value">${paymentLabel}</span></div>
      ${ticket.paymentMethod === 'cash' ? `<div class="row"><span class="label">Payé</span><span class="value">${formatPrice(ticket.amountPaid)}</span></div>` : ''}
      ${ticket.paymentMethod === 'cash' && ticket.changeGiven > 0 ? `<div class="row"><span class="label">Monnaie</span><span class="value">${formatPrice(ticket.changeGiven)}</span></div>` : ''}
      <div class="row"><span class="label">Vendeur</span><span class="value">${ticket.soldByName}</span></div>
      <div class="row"><span class="label">Validité</span><span class="value">${formatFr(ticket.validFrom)} → ${formatFr(ticket.validTo)}</span></div>
    </div>

    <!-- FOOTER -->
    <div class="footer">
      SmartTicket Bus — Système de billetterie intelligent<br/>
      Émis le ${formatFr(new Date().toISOString())}
    </div>
  </div>

  <hr class="cut-line" />
</body>
</html>`;
  }

  // ── Receipt HTML Generation ─────────────────────

  private generateReceiptHTML(receipt: PrintReceiptData, printerType: PrinterType): string {
    const isThermal = printerType === 'thermal_58mm' || printerType === 'thermal_80mm';
    const paperWidth = isThermal ? (printerType === 'thermal_58mm' ? 58 : 80) : 210;
    const margin = isThermal ? 3 : 15;
    const smallSize = isThermal ? '7px' : '10px';
    const fontSize = isThermal ? '9px' : '12px';

    const formatPrice = (n: number) => new Intl.NumberFormat('fr-FR').format(n) + ' FCFA';
    const formatFr = (d: string) => new Date(d).toLocaleDateString('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });

    const ticketRows = receipt.tickets.map((t, i) => `
      <tr style="border-bottom:1px dashed #ddd;">
        <td style="padding:3px 2px;font-size:${smallSize};">${i + 1}</td>
        <td style="padding:3px 2px;font-size:${smallSize};">${t.fromZone} → ${t.toZone}</td>
        <td style="padding:3px 2px;font-size:${smallSize};text-align:right;">${formatPrice(t.price)}</td>
        <td style="padding:3px 2px;font-size:${smallSize};text-align:right;">${formatFr(t.soldAt)}</td>
      </tr>
    `).join('');

    return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Reçu ${receipt.receiptNumber}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Courier New', Courier, monospace;
      color: #1a1a1a;
      width: ${paperWidth}mm;
      margin: 0 auto;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .receipt {
      max-width: ${paperWidth}mm;
      border: ${isThermal ? '1px dashed #ccc' : '2px solid #333'};
      border-radius: ${isThermal ? '4px' : '8px'};
      overflow: hidden;
    }
    .header {
      background: #0f4c75; color: white;
      padding: ${isThermal ? '6px 8px' : '16px 20px'};
      text-align: center;
    }
    .header h1 { font-size: ${isThermal ? '12px' : '18px'}; font-weight: 700; }
    .header p { font-size: ${smallSize}; opacity: 0.8; }
    .section { padding: ${margin}mm; border-bottom: 1px solid #eee; }
    .section:last-child { border-bottom: none; }
    .summary-grid { display: grid; grid-template-columns: 1fr 1fr; gap: ${isThermal ? '4px' : '8px'}; }
    .summary-item {
      padding: ${isThermal ? '3px 0' : '8px 0'};
      border-bottom: 1px solid #f0f0f0;
    }
    .summary-item .label { font-size: ${smallSize}; color: #888; }
    .summary-item .value { font-size: ${fontSize}; font-weight: 700; }
    .summary-item .value.positive { color: #00b894; }
    .summary-item .value.negative { color: #d63031; }
    table { width: 100%; border-collapse: collapse; }
    th { text-align: left; padding: 4px 2px; font-size: ${smallSize}; color: #888; border-bottom: 1px solid #ddd; }
    .total-row {
      background: #f0f8ff; padding: ${isThermal ? '4px 2px' : '8px 4px'};
      font-weight: 700; font-size: ${fontSize};
      display: flex; justify-content: space-between;
    }
    .footer { text-align: center; padding: ${margin}mm; font-size: ${smallSize}; color: #aaa; }
    .signature-area {
      display: flex; justify-content: space-around; margin-top: ${isThermal ? '8px' : '20px'};
      padding-top: ${isThermal ? '8px' : '16px'};
    }
    .signature-line {
      text-align: center; width: 40%;
    }
    .signature-line .line {
      border-top: 1px solid #333; margin-bottom: 4px;
    }
    .signature-line .text { font-size: ${smallSize}; color: #666; }

    @media print {
      @page { size: ${paperWidth}mm auto; margin: 0; }
      body { width: ${paperWidth}mm; }
      .receipt { border: none; }
    }
  </style>
</head>
<body>
  <div class="receipt">
    <div class="header">
      <h1>🚌 SmartTicket Bus</h1>
      <p>REÇU DE CLÔTURE DE CAISSE</p>
      <p style="margin-top:4px;">${receipt.receiptNumber}</p>
    </div>

    <div class="section">
      <div class="summary-grid">
        <div class="summary-item">
          <div class="label">Opérateur</div>
          <div class="value">${receipt.operatorName}</div>
        </div>
        <div class="summary-item">
          <div class="label">Date</div>
          <div class="value">${formatFr(receipt.date)}</div>
        </div>
        <div class="summary-item">
          <div class="label">Fond de caisse</div>
          <div class="value">${formatPrice(receipt.openingBalance)}</div>
        </div>
        <div class="summary-item">
          <div class="label">Total ventes</div>
          <div class="value positive">${formatPrice(receipt.totalRevenue)}</div>
        </div>
        <div class="summary-item">
          <div class="label">Espèces</div>
          <div class="value">${formatPrice(receipt.totalCashReceived)}</div>
        </div>
        <div class="summary-item">
          <div class="label">Mobile Money</div>
          <div class="value">${formatPrice(receipt.totalMobileMoney)}</div>
        </div>
        <div class="summary-item">
          <div class="label">Carte</div>
          <div class="value">${formatPrice(receipt.totalCard)}</div>
        </div>
        <div class="summary-item">
          <div class="label">Monnaie rendue</div>
          <div class="value">${formatPrice(receipt.totalChangeGiven)}</div>
        </div>
        ${receipt.actualCash !== undefined ? `
        <div class="summary-item">
          <div class="label">Caisse réelle</div>
          <div class="value">${formatPrice(receipt.actualCash)}</div>
        </div>
        <div class="summary-item">
          <div class="label">Écart</div>
          <div class="value ${(receipt.difference || 0) < 0 ? 'negative' : 'positive'}">${formatPrice(receipt.difference || 0)}</div>
        </div>
        ` : ''}
      </div>
    </div>

    <div class="section">
      <h3 style="font-size:${fontSize};margin-bottom:6px;">Détail des tickets (${receipt.totalSales})</h3>
      <table>
        <thead>
          <tr>
            <th>#</th><th>Trajet</th><th style="text-align:right;">Prix</th><th style="text-align:right;">Heure</th>
          </tr>
        </thead>
        <tbody>
          ${ticketRows}
        </tbody>
      </table>
      <div class="total-row" style="margin-top:6px;">
        <span>TOTAL</span>
        <span>${formatPrice(receipt.totalRevenue)}</span>
      </div>
    </div>

    <div class="section">
      <div class="signature-area">
        <div class="signature-line">
          <div class="line"></div>
          <div class="text">Opérateur</div>
        </div>
        <div class="signature-line">
          <div class="line"></div>
          <div class="text">Responsable</div>
        </div>
      </div>
    </div>

    <div class="footer">
      SmartTicket Bus — Système de billetterie intelligent<br/>
      Document généré le ${formatFr(new Date().toISOString())}
    </div>
  </div>
</body>
</html>`;
  }

  // ── Helpers ─────────────────────────────────────

  private getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      VALID: 'VALIDE', USED: 'UTILISÉ', EXPIRED: 'EXPIRÉ',
      CANCELLED: 'ANNULÉ', INVALID: 'INVALIDE',
    };
    return labels[status] || status;
  }

  // ── Logging ─────────────────────────────────────

  getLogs(): PrintLogEntry[] {
    return [...this._logs];
  }

  clearLogs(): void {
    this._logs = [];
  }

  private addLog(entry: PrintLogEntry): void {
    this._logs.push(entry);
    if (this._logs.length > this._maxLogs) {
      this._logs = this._logs.slice(-this._maxLogs);
    }
  }

  // ── Queue Access ────────────────────────────────

  getQueueState() {
    return this.queue.getState();
  }

  private generateId(): string {
    return `log_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }
}

// Export singleton
export const printService = new PrintServiceClass();
