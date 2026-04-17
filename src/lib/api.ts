import { useAuthStore } from '@/stores/auth-store';

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

  try {
    const res = await fetch(endpoint, { ...options, headers });
    const data = await res.json();

    // If token expired, try to refresh
    if (res.status === 401 && accessToken) {
      const refreshed = await refreshAuth();
      if (refreshed) {
        const newToken = useAuthStore.getState().accessToken;
        headers['Authorization'] = `Bearer ${newToken}`;
        const retryRes = await fetch(endpoint, { ...options, headers });
        return await retryRes.json();
      } else {
        logout();
        return { success: false, error: 'Session expirée. Veuillez vous reconnecter.' };
      }
    }

    return data;
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
