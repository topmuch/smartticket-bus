const API_BASE = '/api/v1';
const XFORM_PORT = 'XTransformPort=3001';

// ── Token helpers ──────────────────────────────────────────────
function getTokens() {
  try {
    const raw = localStorage.getItem('counter_tokens');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function setTokens(tokens) {
  localStorage.setItem('counter_tokens', JSON.stringify(tokens));
}

function clearTokens() {
  localStorage.removeItem('counter_tokens');
  localStorage.removeItem('counter_user');
}

export function getAccessToken() {
  return getTokens()?.access_token || null;
}

// ── Token refresh with queue ───────────────────────────────────
let isRefreshing = false;
let refreshSubscribers = [];

function onRefreshed(newToken) {
  refreshSubscribers.forEach((cb) => cb(newToken));
  refreshSubscribers = [];
}

async function refreshAccessToken() {
  if (isRefreshing) {
    return new Promise((resolve) => {
      refreshSubscribers.push(resolve);
    });
  }

  isRefreshing = true;
  try {
    const tokens = getTokens();
    if (!tokens?.refresh_token) {
      clearTokens();
      window.location.reload();
      return null;
    }

    const res = await fetch(`${API_BASE}/auth/refresh?${XFORM_PORT}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: tokens.refresh_token }),
    });

    if (!res.ok) {
      clearTokens();
      window.location.reload();
      return null;
    }

    const data = await res.json();
    const newAccessToken = data.data?.access_token;
    setTokens({ ...tokens, access_token: newAccessToken });
    onRefreshed(newAccessToken);
    return newAccessToken;
  } catch {
    clearTokens();
    window.location.reload();
    return null;
  } finally {
    isRefreshing = false;
  }
}

// ── Core fetch wrapper ─────────────────────────────────────────
async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}?${XFORM_PORT}`;
  const token = getAccessToken();

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    ...options,
    headers,
  };

  let res = await fetch(url, config);

  // Auto-refresh on 401
  if (res.status === 401 && !endpoint.includes('/auth/login')) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      headers['Authorization'] = `Bearer ${newToken}`;
      res = await fetch(url, { ...config, headers });
    }
  }

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({ message: 'Erreur réseau' }));
    const err = new Error(errorBody.message || `Erreur ${res.status}`);
    err.status = res.status;
    err.body = errorBody;
    throw err;
  }

  // Handle 204 No Content
  if (res.status === 204) {
    return { success: true, data: null };
  }

  return res.json();
}

// ── Auth API ───────────────────────────────────────────────────
export async function login(email, password) {
  const data = await apiRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  if (data.success && data.data?.tokens) {
    setTokens(data.data.tokens);
    if (data.data.user) {
      localStorage.setItem('counter_user', JSON.stringify(data.data.user));
    }
  }
  return data;
}

export function logout() {
  clearTokens();
}

export function getStoredUser() {
  try {
    const raw = localStorage.getItem('counter_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// ── Cash Sessions ──────────────────────────────────────────────
export async function getCashSessions() {
  return apiRequest('/cash-sessions');
}

export async function openCashSession(openingBalance) {
  return apiRequest('/cash-sessions', {
    method: 'POST',
    body: JSON.stringify({ opening_balance: Number(openingBalance) }),
  });
}

export async function closeCashSession(sessionId, actualCash) {
  return apiRequest(`/cash-sessions/${sessionId}/close`, {
    method: 'PUT',
    body: JSON.stringify({ actual_cash: Number(actualCash) }),
  });
}

// ── Ticket Sales ───────────────────────────────────────────────
export async function sellTicket(payload) {
  return apiRequest('/sell', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

// ── Tickets ────────────────────────────────────────────────────
export async function getTickets(params = {}) {
  const query = new URLSearchParams(params).toString();
  const endpoint = `/tickets${query ? `?${query}` : ''}`;
  return apiRequest(endpoint);
}

// ── Public Data (no auth required) ─────────────────────────────
export async function getZones() {
  return apiRequest('/zones');
}

export async function getFares() {
  return apiRequest('/public/fares');
}

export default apiRequest;
