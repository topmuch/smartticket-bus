import { useAuthStore } from '@/stores/auth-store';

// ============================================
// Backend URL Mapping
// Routes all /api/... calls to Express backend on port 3001
// ============================================
const BACKEND_PORT = 3001;

/**
 * Convert a frontend API path to the Express backend URL.
 * Handles path mapping and query param transformation.
 */
export function toBackendUrl(
  path: string,
  options?: { method?: string; body?: any }
): string {
  // Auth endpoints: /api/auth/* → /api/auth/* (same structure on backend)
  if (path.startsWith('/api/auth/')) {
    const separator = path.includes('?') ? '&' : '?';
    return `${path}${separator}XTransformPort=${BACKEND_PORT}`;
  }

  // Public info endpoints
  if (path === '/api/public/info') {
    return `/api/v1/public/info?XTransformPort=${BACKEND_PORT}`;
  }

  // Map /api/fares/* to /api/v1/tariffs/*
  if (path.includes('/api/fares')) {
    path = path.replace('/api/fares', '/api/v1/tariffs');
  }
  // Map /api/tickets POST (sell) to /api/v1/sell
  else if (path === '/api/tickets' && options?.method === 'POST') {
    path = '/api/v1/sell';
  }
  // Map /api/tickets/validate POST (scan) to /api/v1/scan
  else if (path === '/api/tickets/validate' && options?.method === 'POST') {
    path = '/api/v1/scan';
  }
  // Map /api/tickets/generate-qr POST → handled in view (GET /api/v1/tickets/:id/qr)
  else if (path === '/api/tickets/generate-qr') {
    path = path; // kept as-is, view handles the conversion
  }
  // Generic /api/* → /api/v1/* mapping
  else if (!path.startsWith('/api/v1/')) {
    path = path.replace('/api/', '/api/v1/');
  }

  // Append XTransformPort
  const separator = path.includes('?') ? '&' : '?';
  return `${path}${separator}XTransformPort=${BACKEND_PORT}`;
}

/**
 * Convert camelCase keys to snake_case recursively.
 */
function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, (c) => '_' + c.toLowerCase());
}

function normalizeRequestKeys(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(normalizeRequestKeys);
  }
  if (obj && typeof obj === 'object') {
    const result: any = {};
    for (const key of Object.keys(obj)) {
      const snakeKey = camelToSnake(key);
      result[snakeKey] = normalizeRequestKeys(obj[key]);
    }
    return result;
  }
  return obj;
}

/**
 * Transform request body from camelCase (frontend) to snake_case (Express backend)
 * for specific endpoints.
 */
function transformRequestBody(path: string, body: any): any {
  if (!body) return body;

  // Pricing/calculate: transform camelCase to snake_case
  if (path.includes('/pricing/calculate')) {
    const transformed: any = {};
    if (body.fromZoneId) transformed.from_zone_id = body.fromZoneId;
    if (body.toZoneId) transformed.to_zone_id = body.toZoneId;
    return transformed;
  }

  // Lines, Stops, Schedules CRUD: general camelCase → snake_case conversion
  if (path.includes('/lines') || path.includes('/stops') || path.includes('/schedules')) {
    if (body && typeof body === 'object' && !body.controls && !body.from_zone_id) {
      return normalizeRequestKeys(body);
    }
  }

  // Scan endpoint: qrString → qr_string
  if (path.includes('/api/v1/scan') || path.includes('/api/tickets/validate')) {
    const { qrString, ...rest } = body;
    if (qrString) return { qr_string: qrString, ...rest };
  }

  // Controls sync: transform frontend field names to Express backend fields
  if (path.includes('/controls/sync') && Array.isArray(body?.controls)) {
    const transformedControls = body.controls.map((ctrl: any) => ({
      ticket_id: ctrl.ticketId || ctrl.ticket_id,
      qr_data: ctrl.qrString || ctrl.qr_data,
      result: ctrl.result,
      reason: ctrl.reason,
      latitude: ctrl.latitude,
      longitude: ctrl.longitude,
    }));
    return { controls: transformedControls };
  }

  // Sell endpoint: transform camelCase to snake_case
  if (path.includes('/api/v1/sell') || (path.includes('/api/tickets') && body.fromStopId)) {
    const transformed: any = {};
    if (body.fromStopId) transformed.from_zone_id = body.fromStopId;
    if (body.toStopId) transformed.to_zone_id = body.toStopId;
    if (body.price) transformed.price = body.price;
    if (body.amountPaid) transformed.amount_paid = body.amountPaid;
    if (body.paymentMethod) transformed.payment_method = body.paymentMethod;
    if (body.passengerName) transformed.passenger_name = body.passengerName;
    if (body.passengerPhone) transformed.passenger_phone = body.passengerPhone;
    if (body.passengerPhoto) transformed.passenger_photo_url = body.passengerPhoto;
    if (body.lineId) transformed.line_id = body.lineId;
    if (body.fareId) transformed.fare_id = body.fareId;
    if (body.durationDays) transformed.duration_days = body.durationDays;
    if (body.notes) transformed.notes = body.notes;
    return transformed;
  }

  return body;
}

/**
 * Convert snake_case keys to camelCase recursively.
 * Handles common database field patterns like is_active, created_at, etc.
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
 * Normalize Express backend response to match what frontend components expect.
 */
function transformResponse(path: string, data: any): any {
  if (!data || !data.success) return data;

  // Tariffs → normalize snake_case fields to camelCase for frontend components
  if (path.includes('/tariffs') && Array.isArray(data.data)) {
    data.data = data.data.map((t: any) => ({
      ...t,
      fromZoneId: t.from_zone_id,
      toZoneId: t.to_zone_id,
      fromZone: {
        id: t.from_zone_id,
        name: t.from_zone_name,
        code: t.from_zone_code,
        color: t.from_zone_code_color || '#6b7280',
      },
      toZone: {
        id: t.to_zone_id,
        name: t.to_zone_name,
        code: t.to_zone_code,
        color: t.to_zone_code_color || '#6b7280',
      },
      isActive: t.is_active === 1 || t.is_active === true,
    }));
  }

  // Sell ticket response: normalize to frontend-expected format
  if (path.includes('/api/v1/sell')) {
    const d = data.data;
    if (d) {
      data.data = {
        id: d.ticket_id,
        ticketNumber: d.ticket_number,
        qrCode: d.qr_code,
        price: d.price,
        amountPaid: d.amount_paid,
        changeGiven: d.change,
        validFrom: d.valid_from,
        validTo: d.valid_until,
        passengerName: d.passenger_name,
        type: 'single',
        status: 'VALID',
        fromZone: d.from_zone,
        toZone: d.to_zone,
      };
    }
  }

  // Cash sessions: normalize snake_case and flatten operator_name to nested object
  if (path.includes('/cash-sessions') && Array.isArray(data.data)) {
    data.data = data.data.map((s: any) => ({
      ...normalizeKeys(s),
      closingBalance: s.actual_cash ?? s.closing_balance ?? null,
      operator: s.operator_name ? { name: s.operator_name } : null,
    }));
  }

  // Cash session open/close: single object response
  if (path.includes('/cash-sessions') && !Array.isArray(data.data) && typeof data.data === 'object') {
    data.data = {
      ...normalizeKeys(data.data),
      closingBalance: data.data.actual_cash ?? data.data.closing_balance ?? null,
      operator: data.data.operator_name ? { name: data.data.operator_name } : null,
    };
  }

  // Users: normalize snake_case fields
  if (path.includes('/users') && (Array.isArray(data.data) || data.pagination)) {
    if (Array.isArray(data.data)) {
      data.data = data.data.map(normalizeKeys);
    }
  }

  // Zones: normalize snake_case and add isActive boolean
  if (path.includes('/zones') && !path.includes('/tariffs') && Array.isArray(data.data)) {
    data.data = data.data.map((z: any) => ({
      ...normalizeKeys(z),
      isActive: z.is_active === 1 || z.is_active === true,
    }));
  }

  // Stops: normalize snake_case, add isActive, nest zone info
  if (path.includes('/stops') && Array.isArray(data.data)) {
    data.data = data.data.map((s: any) => ({
      ...normalizeKeys(s),
      zoneId: s.zone_id,
      zone: s.zone_name ? {
        id: s.zone_id,
        name: s.zone_name,
        code: s.zone_code,
        color: s.zone_color || '#6b7280',
      } : null,
      lat: s.latitude,
      lng: s.longitude,
      isActive: s.is_active === 1 || s.is_active === true,
    }));
  }

  // Lines: normalize snake_case and add isActive
  if (path.includes('/lines') && Array.isArray(data.data)) {
    data.data = data.data.map((l: any) => ({
      ...normalizeKeys(l),
      isActive: l.is_active === 1 || l.is_active === true,
      _count: {
        lineStops: l.stops_count || 0,
        schedules: l.schedule_count || 0,
      },
    }));
  }

  // Line detail: single line with schedules/stops
  if (path.match(/\/lines\/[\w-]+$/) && data.data && !Array.isArray(data.data)) {
    const lineData = data.data;
    data.data = {
      ...normalizeKeys(lineData),
      isActive: lineData.is_active === 1 || lineData.is_active === true,
      _count: {
        lineStops: lineData.stops_count || 0,
        schedules: lineData.schedule_count || 0,
      },
      lineStops: (lineData.lineStops || []).map((ls: any) => ({
        ...normalizeKeys(ls),
        stopId: ls.to_stop_id || ls.stopId,
        order: ls.stop_order || ls.order,
        stop: ls.stop_name ? {
          id: ls.to_stop_id,
          name: ls.stop_name,
          code: ls.stop_code,
          zoneId: ls.zone_id,
          lat: ls.latitude,
          lng: ls.longitude,
          zone: ls.zone_name ? {
            id: ls.zone_id,
            name: ls.zone_name,
            code: ls.zone_code,
            color: ls.zone_color || '#6b7280',
          } : null,
        } : null,
      })),
      schedules: (lineData.schedules || []).map(normalizeKeys),
    };
  }

  // Scan/validate ticket response: normalize to frontend ValidationResult
  if (path.includes('/api/v1/scan')) {
    if (data.success && data.data) {
      data.data = {
        ticket: {
          id: data.data.control_id || '',
          ticketNumber: data.data.ticket_number || '',
          type: 'single',
          status: data.data.result === 'VALID' ? 'VALID' : data.data.result,
          price: data.data.price || 0,
          validFrom: '',
          validTo: data.data.valid_until || '',
          passengerName: data.data.passenger_name || null,
          passengerPhone: null,
          passengerPhoto: null,
          fromStop: data.data.from_zone ? { name: data.data.from_zone } : null,
          toStop: data.data.to_zone ? { name: data.data.to_zone } : null,
          line: null,
        },
        result: data.data.result || 'INVALID',
        reason: data.data.message || data.data.reason,
      };
    } else if (!data.success) {
      // Map error response to ValidationResult format
      const result = data.result || 'INVALID';
      data.data = {
        ticket: {
          id: '',
          ticketNumber: data.data?.ticket_number || '',
          type: 'single',
          status: result,
          price: 0,
          validFrom: '',
          validTo: data.data?.valid_until || '',
          passengerName: null,
          passengerPhone: null,
          passengerPhoto: null,
          fromStop: null,
          toStop: null,
          line: null,
        },
        result,
        reason: data.message || data.error || 'Erreur de validation',
      };
    }
  }

  // Offline data: normalize response
  if (path.includes('/offline/data') && data.data) {
    const d = data.data;
    data.data = {
      blacklist: (d.blacklist || []).map((b: any) => ({
        ticketId: b.ticket_id,
        reason: b.status || 'CANCELLED',
      })),
      whitelist: (d.whitelist || []).map((w: any) => ({
        ticketId: w.ticket_id,
        expiresAt: new Date(w.end_date).getTime(),
      })),
    };
  }

  // Controls sync response: map syncedCount
  if (path.includes('/controls/sync') && data.data) {
    data.data = {
      syncedCount: data.data.synced || data.data.synced_count || 0,
      batchId: data.data.batch_id,
    };
  }

  // Schedules: normalize snake_case fields
  if (path.includes('/schedules') && (Array.isArray(data.data) || (data.data && !data.data.ticket))) {
    if (Array.isArray(data.data)) {
      data.data = data.data.map(normalizeKeys);
    } else if (data.data && typeof data.data === 'object' && !data.data.ticket) {
      data.data = normalizeKeys(data.data);
    }
  }

  // Pricing/calculate: normalize response
  if (path.includes('/pricing/calculate') && data.data) {
    const d = data.data;
    data.data = {
      ...normalizeKeys(d),
      fromZoneName: d.from_zone_name,
      toZoneName: d.to_zone_name,
      fareId: d.id || null,
      message: '',
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

  // Transform request body
  let body = options.body;
  if (body && typeof body === 'string') {
    try {
      const parsed = JSON.parse(body);
      const transformed = transformRequestBody(endpoint, parsed);
      if (transformed !== parsed) {
        body = JSON.stringify(transformed);
      }
    } catch {
      // not JSON, keep as-is
    }
  }

  // Build the backend URL
  const method = options.method || 'GET';
  const backendUrl = toBackendUrl(endpoint, {
    method,
    body: body ? (typeof body === 'string' ? JSON.parse(body) : body) : undefined,
  });

  try {
    const res = await fetch(backendUrl, { ...options, headers, body });

    // Handle 401 - try refresh
    if (res.status === 401 && accessToken) {
      const refreshed = await refreshAuth();
      if (refreshed) {
        const newToken = useAuthStore.getState().accessToken;
        headers['Authorization'] = `Bearer ${newToken}`;
        const retryRes = await fetch(backendUrl, { ...options, headers, body });
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
