'use client';

import { useState } from 'react';
import { Bus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAuthStore } from '@/stores/auth-store';

interface LoginDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LoginDialog({ open, onOpenChange }: LoginDialogProps) {
  const login = useAuthStore((s) => s.login);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login(email, password);

    if (result.success) {
      // Reset form and close dialog
      setEmail('');
      setPassword('');
      setError('');
      onOpenChange(false);
    } else {
      setError(result.error || 'Erreur de connexion');
      setLoading(false);
    }
  };

  const fillCredentials = (testEmail: string, testPassword: string) => {
    setEmail(testEmail);
    setPassword(testPassword);
    setError('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="items-center text-center">
          <div className="mb-2 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground mx-auto shadow-lg">
            <Bus className="h-7 w-7" />
          </div>
          <DialogTitle className="text-xl">Connexion</DialogTitle>
          <DialogDescription>
            Entrez vos identifiants pour accéder au système
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="login-email">Adresse e-mail</Label>
            <Input
              id="login-email"
              type="email"
              placeholder="nom@smartticket.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              disabled={loading}
              className="h-11"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="login-password">Mot de passe</Label>
            <Input
              id="login-password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              disabled={loading}
              className="h-11"
            />
          </div>

          {error && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <Button
            type="submit"
            className="w-full h-11 text-base font-semibold"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Connexion en cours...
              </>
            ) : (
              'Se connecter'
            )}
          </Button>
        </form>

        {/* Test Credentials */}
        <div className="pt-2 border-t">
          <p className="text-xs text-muted-foreground mb-3 text-center">
            Comptes de test
          </p>
          <div className="grid grid-cols-1 gap-2">
            <button
              type="button"
              onClick={() =>
                fillCredentials('admin@smartticket.bus', 'Admin@123')
              }
              className="flex items-center gap-2 rounded-lg bg-muted/50 hover:bg-muted p-2.5 text-left transition-colors text-sm"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 text-xs font-bold shrink-0">
                SA
              </span>
              <div className="min-w-0">
                <div className="font-medium text-foreground truncate">
                  Super Administrateur
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  admin@smartticket.bus
                </div>
              </div>
            </button>
            <button
              type="button"
              onClick={() =>
                fillCredentials('guichet1@smartticket.bus', 'Oper@123')
              }
              className="flex items-center gap-2 rounded-lg bg-muted/50 hover:bg-muted p-2.5 text-left transition-colors text-sm"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 text-xs font-bold shrink-0">
                OP
              </span>
              <div className="min-w-0">
                <div className="font-medium text-foreground truncate">
                  Opérateur Guichet
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  guichet1@smartticket.bus
                </div>
              </div>
            </button>
            <button
              type="button"
              onClick={() =>
                fillCredentials('control1@smartticket.bus', 'Control@123')
              }
              className="flex items-center gap-2 rounded-lg bg-muted/50 hover:bg-muted p-2.5 text-left transition-colors text-sm"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 text-xs font-bold shrink-0">
                CT
              </span>
              <div className="min-w-0">
                <div className="font-medium text-foreground truncate">
                  Contrôleur
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  control1@smartticket.bus
                </div>
              </div>
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
