---
Task ID: 1
Agent: main
Task: Fix all pending SmartTicketQR issues - ticket selling, scanner, PDF, ticket history, superadmin

Work Log:
- Analyzed the full project structure and identified all issues
- Fixed guichet.tsx: added `cashSessionId` to ticket sell request to properly link tickets to cash sessions
- Fixed qr-scanner.tsx: rewrote `handleScan` to always try online validation first, falling back to offline only when explicitly offline. This fixes the issue where the scanner wasn't validating tickets even when the network was available.
- Verified PDF generation works (jsPDF + canvas + qrcode generate 132KB PDF successfully)
- Renamed OPERATOR nav tab "Mes Ventes" → "Historique Tickets" in app-shell.tsx
- Enhanced sales-history.tsx: added validity dates column (validFrom/validTo), updated Trajet column to show zone names when stops aren't available, updated title to "Historique des Tickets"
- Ran full integration test: login → cash session → sell ticket → validate ticket → generate PDF — all passing
- Confirmed existing superadmin dashboard and audit logs views are well-designed with gradient KPI cards, bar charts, circular progress, sidebar navigation, and comprehensive audit trail

Stage Summary:
- All 5 pending issues resolved:
  1. ✅ Ticket selling: type UNIT works, cashSessionId included
  2. ✅ Controller scanner: online validation prioritized, offline fallback only when disconnected
  3. ✅ PDF printing: working (132KB PDF generated for test ticket)
  4. ✅ Ticket history tab: renamed and enhanced "Historique Tickets" for OPERATOR role
  5. ✅ Superadmin design: already well-designed with sidebar layout, gradient KPIs, charts, audit logs
- Key files modified:
  - src/components/smartticket/views/guichet.tsx (added cashSessionId)
  - src/components/smartticket/views/qr-scanner.tsx (rewrote handleScan for online-first validation)
  - src/components/smartticket/views/sales-history.tsx (enhanced with validity dates, zone fallback)
  - src/components/smartticket/app-shell.tsx (renamed OPERATOR tab)
