const API_BASE = '/api/v1';

class ApiService {
  constructor() {
    this.token = localStorage.getItem('st_token') || null;
    this.refreshToken = localStorage.getItem('st_refresh_token') || null;
    this.user = JSON.parse(localStorage.getItem('st_user') || 'null');
  }

  get authenticated() {
    return !!this.token;
  }

  async request(method, path, body = null, expectStatus = null) {
    const url = `${API_BASE}${path}?XTransformPort=3001`;
    const headers = { 'Content-Type': 'application/json' };
    if (this.token) headers['Authorization'] = `Bearer ${this.token}`;

    const opts = { method, headers };
    if (body) opts.body = JSON.stringify(body);

    try {
      const res = await fetch(url, opts);
      const data = await res.json();

      if (expectStatus !== null) return { status: res.status, data };

      if (res.status === 401 && this.refreshToken) {
        const refreshed = await this.refreshAuth();
        if (refreshed) return this.request(method, path, body);
      }

      if (!res.ok) {
        return { status: res.status, data, success: false };
      }

      return { status: res.status, data, success: data.success !== false };
    } catch (err) {
      console.error('API Error:', err);
      return { status: 0, data: { message: 'Erreur réseau. Vérifiez votre connexion.' }, success: false };
    }
  }

  async login(email, password) {
    const res = await this.request('POST', '/auth/login', { email, password });
    if (res.data?.data?.tokens) {
      this.token = res.data.data.tokens.access_token;
      this.refreshToken = res.data.data.tokens.refresh_token;
      this.user = res.data.data.user;
      localStorage.setItem('st_token', this.token);
      localStorage.setItem('st_refresh_token', this.refreshToken);
      localStorage.setItem('st_user', JSON.stringify(this.user));
    }
    return res;
  }

  async refreshAuth() {
    try {
      const url = `${API_BASE}/auth/refresh?XTransformPort=3001`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: this.refreshToken })
      });
      const data = await res.json();
      if (data.data?.access_token) {
        this.token = data.data.access_token;
        localStorage.setItem('st_token', this.token);
        return true;
      }
      this.logout();
      return false;
    } catch {
      return false;
    }
  }

  async verifyTicket(qrToken, locationLat = null, locationLng = null) {
    const body = { qr_token: qrToken };
    if (locationLat) body.location_lat = locationLat;
    if (locationLng) body.location_lng = locationLng;
    return await this.request('POST', '/scan/verify', body);
  }

  async getControlStats() {
    return await this.request('GET', '/controls/stats');
  }

  async syncOfflineControls(controls) {
    return await this.request('POST', '/controls/sync', { controls });
  }

  async getOfflineData() {
    return await this.request('GET', '/offline/data');
  }

  logout() {
    this.token = null;
    this.refreshToken = null;
    this.user = null;
    localStorage.removeItem('st_token');
    localStorage.removeItem('st_refresh_token');
    localStorage.removeItem('st_user');
  }
}

export const api = new ApiService();
export default api;
