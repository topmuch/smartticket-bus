import { useAuthStore } from '@/stores/auth-store';

// ============================================
// Local URL Routing
// ALL endpoints are served by Next.js API routes.
// No Express backend exists — no port transformation needed.
// ============================================

/**
 * Convert a frontend API path to a local Next.js API route URL.
 * All endpoints are local — no XTransformPort is ever added.
 */
export function toBackendUrl(path: string): string {
  // Auth endpoints: return as-is (local Next.js auth routes)
  if (path.startsWith('/api/auth/')) {
    return path;
  }

  // Public info: /api/public/info → /api/v1/public/info (local route)
  if (path === '/api/public/info') {
    return '/api/v1/public/info';
  }

  // All other endpoints: return as-is (local routing)
  return path;
}

// ============================================
// Request / Response transformation
// Since all routes are local and use camelCase Prisma data,
// request bodies and most responses pass through unchanged.
// Only specific format mismatches are normalized below.
// ============================================

/**
 * Transform request body for a given endpoint.
 * Since all routes are local and accept camelCase, return body as-is.
 */
function transformRequestBody(_path: string, body: any): any {
  return body;
}

/**
 * Convert snake_case keys to camelCase recursively.
 * Used only for the /api/v1/public/info endpoint which manually returns snake_case.
 */
function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

function normalizeKeys(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(normalizeKeys);
  }
  if (obj && typeof obj === 'object') {
    const result: any = {};
    for (const key of Object.keys(obj)) {
      const camelKey = snakeToCamel(key);
      result[camelKey] = normalizeKeys(obj[key]);
    }
    return result;
  }
  return obj;
}

/**
 * Normalize local API response to match what frontend components expect.
 * Most responses pass through unchanged since local routes return camelCase Prisma data.
 * Only specific format mismatches are handled here.
 */
function transformResponse(path: string, data: any): any {
  if (!data || !data.success) return data;

  // ── Public info ──────────────────────────────────────────────
  // /api/v1/public/info returns snake_case keys manually (not Prisma-generated)
  if (path.includes('/public/info') && data.data && !Array.isArray(data.data)) {
    data.data = normalizeKeys(data.data);
  }

  // ── POST /api/tickets (sell ticket) ──────────────────────────
  // Local route returns full ticket with nested relations, qrString, qrToken.
  // Guichet/TicketCard expects SoldTicket with flat fields.
  if (path === '/api/tickets' && data.data && !Array.isArray(data.data) && data.data.qrToken) {
    const d = data.data;
    data.data = {
      id: d.id,
      ticketNumber: d.ticketNumber,
      qrCode: d.qrString || d.qrToken,
      price: d.price,
      amountPaid: d.amountPaid,
      changeGiven: d.changeGiven,
      validFrom: d.validFrom,
      validTo: d.validTo,
      passengerName: d.passengerName || null,
      type: d.type,
      status: d.status,
      fromZone: typeof d.fromZone === 'object' && d.fromZone ? d.fromZone.name : (d.fromZone || ''),
      toZone: typeof d.toZone === 'object' && d.toZone ? d.toZone.name : (d.toZone || ''),
    };
  }

  // ── POST /api/tickets/validate (scan ticket) ─────────────────
  // Local route returns flat { success, valid, result, reason, ticket }.
  // QR scanner expects nested { success, data: { ticket, result, reason } }.
  if (path === '/api/tickets/validate') {
    const result = data.result || 'INVALID';
    const reason = data.reason || data.error || '';

    if (data.ticket) {
      // Successful parse — ticket was found
      data.data = {
        ticket: {
          id: data.ticket.id || '',
          ticketNumber: data.ticket.ticketNumber || '',
          type: data.ticket.type || 'UNIT',
          status: result === 'VALID' ? 'VALID' : result,
          price: data.ticket.price || 0,
          validFrom: data.ticket.validFrom || '',
          validTo: data.ticket.validTo || '',
          passengerName: data.ticket.passengerName || null,
          passengerPhone: data.ticket.passengerPhone || null,
          passengerPhoto: null,
          fromStop: data.ticket.fromStop ? { name: data.ticket.fromStop.name } : null,
          toStop: data.ticket.toStop ? { name: data.ticket.toStop.name } : null,
          line: data.ticket.line ? { name: data.ticket.line.name || data.ticket.line.number } : null,
        },
        result,
        reason,
      };
    } else {
      // Ticket not found or invalid QR
      data.data = {
        ticket: {
          id: '',
          ticketNumber: '',
          type: 'UNIT',
          status: result,
          price: 0,
          validFrom: '',
          validTo: '',
          passengerName: null,
          passengerPhone: null,
          passengerPhoto: null,
          fromStop: null,
          toStop: null,
          line: null,
        },
        result,
        reason: reason || 'Ticket introuvable ou invalide',
      };
    }
  }

  // ── GET /api/cash-sessions (list) ────────────────────────────
  // Local route returns sessions with actualCash field.
  // CashSessionView component expects closingBalance.
  if (path.includes('/cash-sessions') && Array.isArray(data.data)) {
    data.data = data.data.map((s: any) => ({
      ...s,
      closingBalance: s.actualCash ?? null,
    }));
  }

  // ── POST /api/cash-sessions (open) & PUT /api/cash-sessions/close (close) ──
  // Single cash session object response — add closingBalance alias
  if (
    path.includes('/cash-sessions') &&
    !Array.isArray(data.data) &&
    data.data &&
    typeof data.data === 'object' &&
    !data.data.tickets
  ) {
    data.data = {
      ...data.data,
      closingBalance: data.data.actualCash ?? null,
    };
  }

  return data;
}

// ============================================
// Main API Fetch Wrapper
// ============================================
export async function apiFetch<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ success: boolean; data?: T; error?: string }> {
  const { accessToken, refreshAuth, logout } = useAuthStore.getState();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  // Build the local URL — all endpoints are local, no body transformation needed
  const backendUrl = toBackendUrl(endpoint);

  try {
    const res = await fetch(backendUrl, { ...options, headers, body: options.body });

    // Handle 401 - try refresh
    if (res.status === 401 && accessToken) {
      const refreshed = await refreshAuth();
      if (refreshed) {
        const newToken = useAuthStore.getState().accessToken;
        headers['Authorization'] = `Bearer ${newToken}`;
        const retryRes = await fetch(backendUrl, { ...options, headers, body: options.body });
        const retryData = await retryRes.json();
        return transformResponse(endpoint, retryData);
      } else {
        logout();
        return { success: false, error: 'Session expirée. Veuillez vous reconnecter.' };
      }
    }

    const data = await res.json();
    return transformResponse(endpoint, data);
  } catch (error) {
    return { success: false, error: 'Erreur réseau. Vérifiez votre connexion.' };
  }
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount) + ' FCFA';
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

export function formatDateShort(date: string | Date): string {
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(date));
}

export function getRoleLabel(role: string): string {
  const labels: Record<string, string> = {
    SUPERADMIN: 'Super Administrateur',
    OPERATOR: 'Opérateur Guichet',
    CONTROLLER: 'Contrôleur',
  };
  return labels[role] || role;
}

export function getRoleColor(role: string): string {
  const colors: Record<string, string> = {
    SUPERADMIN: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    OPERATOR: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    CONTROLLER: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  };
  return colors[role] || 'bg-gray-100 text-gray-800';
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    VALID: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    USED: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    EXPIRED: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
    CANCELLED: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    INVALID: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    OPEN: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    CLOSED: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
}

export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    VALID: 'Valide',
    USED: 'Utilisé',
    EXPIRED: 'Expiré',
    CANCELLED: 'Annulé',
    INVALID: 'Invalide',
    OPEN: 'Ouvert',
    CLOSED: 'Fermé',
  };
  return labels[status] || status;
}

export function getDayName(day: number): string {
  const days = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
  return days[day] || '';
}
