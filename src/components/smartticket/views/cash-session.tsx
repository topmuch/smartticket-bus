'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiFetch, formatCurrency, formatDate, getStatusColor, getStatusLabel } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Wallet,
  Clock,
  TrendingUp,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Play,
  Square,
  RefreshCw,
  Loader2,
  Banknote,
  ArrowUpRight,
  ArrowDownRight,
  History,
} from 'lucide-react';

interface CashSession {
  id: string;
  status: string;
  openingBalance: number;
  closingBalance: number | null;
  totalSales: number;
  totalRevenue: number;
  expectedCash: number | null;
  difference: number | null;
  notes: string | null;
  openedAt: string;
  closedAt: string | null;
  operator: { name: string };
  _count?: { tickets: number };
}

export default function CashSessionView() {
  const user = useAuthStore((s) => s.user);
  const [sessions, setSessions] = useState<CashSession[]>([]);
  const [currentSession, setCurrentSession] = useState<CashSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Open session
  const [showOpenDialog, setShowOpenDialog] = useState(false);
  const [openingBalance, setOpeningBalance] = useState('');

  // Close session
  const [showCloseDialog, setShowCloseDialog] = useState(false);
  const [closingCash, setClosingCash] = useState('');
  const [closingNotes, setClosingNotes] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set('operatorId', user?.id || '');
    params.set('limit', '50');

    const res = await apiFetch<CashSession[]>('/api/cash-sessions?' + params.toString());
    if (res.success && res.data) {
      setSessions(res.data);
      const open = res.data.find((s) => s.status === 'OPEN');
      setCurrentSession(open || null);
    }
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleOpenSession = async () => {
    setActionLoading(true);
    const res = await apiFetch('/api/cash-sessions', {
      method: 'POST',
      body: JSON.stringify({ openingBalance: Number(openingBalance) || 0 }),
    });
    setActionLoading(false);

    if (res.success) {
      setShowOpenDialog(false);
      setOpeningBalance('');
      fetchData();
    }
  };

  const handleCloseSession = async () => {
    if (!currentSession) return;
    setActionLoading(true);
    const res = await apiFetch(`/api/cash-sessions/${currentSession.id}`, {
      method: 'PUT',
      body: JSON.stringify({
        closingBalance: Number(closingCash) || 0,
        notes: closingNotes || null,
      }),
    });
    setActionLoading(false);

    if (res.success) {
      setShowCloseDialog(false);
      setClosingCash('');
      setClosingNotes('');
      fetchData();
    }
  };

  const formatDuration = (start: string, end: string | null) => {
    const startTime = new Date(start).getTime();
    const endTime = end ? new Date(end).getTime() : Date.now();
    const diffMs = endTime - startTime;
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}min`;
  };

  return (
    <div className="space-y-4">
      {/* Current Session */}
      {currentSession ? (
        <Card className="border-green-200 bg-green-50/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-green-800">
                  <div className="p-2 rounded-lg bg-green-100">
                    <Play className="w-5 h-5 text-green-600" />
                  </div>
                  Session Ouverte
                </CardTitle>
                <CardDescription>
                  Ouverte à {formatDate(currentSession.openedAt)} — Durée:{' '}
                  {formatDuration(currentSession.openedAt, null)}
                </CardDescription>
              </div>
              <Badge className={`${getStatusColor('OPEN')} text-sm px-3 py-1`}>
                EN COURS
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-white rounded-lg p-3 border">
                <p className="text-xs text-muted-foreground">Caisse départ</p>
                <p className="text-lg font-bold">{formatCurrency(currentSession.openingBalance)}</p>
              </div>
              <div className="bg-white rounded-lg p-3 border">
                <p className="text-xs text-muted-foreground">Ventes</p>
                <p className="text-lg font-bold">{currentSession._count?.tickets || currentSession.totalSales || 0}</p>
              </div>
              <div className="bg-white rounded-lg p-3 border">
                <p className="text-xs text-muted-foreground">Chiffre d&apos;affaires</p>
                <p className="text-lg font-bold text-primary">
                  {formatCurrency(currentSession.totalRevenue)}
                </p>
              </div>
              <div className="bg-white rounded-lg p-3 border">
                <p className="text-xs text-muted-foreground">Caisse attendue</p>
                <p className="text-lg font-bold text-green-700">
                  {formatCurrency(currentSession.openingBalance + currentSession.totalRevenue)}
                </p>
              </div>
            </div>

            <Button
              onClick={() => setShowCloseDialog(true)}
              variant="destructive"
              size="lg"
              className="w-full sm:w-auto"
            >
              <Square className="w-4 h-4" /> Clôturer la Session
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="p-6 flex flex-col items-center justify-center text-center space-y-4">
            <div className="p-4 rounded-full bg-amber-100">
              <Wallet className="w-10 h-10 text-amber-600" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Aucune session ouverte</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Ouvrez une session de caisse pour commencer à vendre des tickets.
              </p>
            </div>
            <Button onClick={() => setShowOpenDialog(true)} size="lg">
              <Play className="w-4 h-4" /> Ouvrir une Session
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Session History */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <History className="w-5 h-5" /> Historique des Sessions
            </CardTitle>
            <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : sessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Wallet className="w-10 h-10 mb-2 opacity-30" />
              <p>Aucune session trouvée</p>
            </div>
          ) : (
            <div className="max-h-[400px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Caisse départ</TableHead>
                    <TableHead className="text-right hidden sm:table-cell">CA</TableHead>
                    <TableHead className="text-right hidden md:table-cell">Caisse clôture</TableHead>
                    <TableHead className="text-right">Écart</TableHead>
                    <TableHead className="hidden lg:table-cell">Durée</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sessions.map((session) => (
                    <TableRow key={session.id} className={session.status === 'OPEN' ? 'bg-green-50/50' : ''}>
                      <TableCell className="text-sm">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                          {formatDate(session.openedAt)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(session.status)} variant="outline">
                          {getStatusLabel(session.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(session.openingBalance)}
                      </TableCell>
                      <TableCell className="text-right hidden sm:table-cell font-medium text-primary">
                        {formatCurrency(session.totalRevenue)}
                      </TableCell>
                      <TableCell className="text-right hidden md:table-cell">
                        {session.closingBalance !== null
                          ? formatCurrency(session.closingBalance)
                          : '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        {session.difference !== null ? (
                          <span
                            className={`flex items-center justify-end gap-1 font-semibold ${
                              session.difference >= 0 ? 'text-green-600' : 'text-red-600'
                            }`}
                          >
                            {session.difference >= 0 ? (
                              <ArrowUpRight className="w-3.5 h-3.5" />
                            ) : (
                              <ArrowDownRight className="w-3.5 h-3.5" />
                            )}
                            {formatCurrency(Math.abs(session.difference))}
                          </span>
                        ) : (
                          '—'
                        )}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                        {formatDuration(session.openedAt, session.closedAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Open Session Dialog */}
      <Dialog open={showOpenDialog} onOpenChange={setShowOpenDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wallet className="w-5 h-5" /> Ouvrir une Session de Caisse
            </DialogTitle>
            <DialogDescription>
              Indiquez le montant initial dans la caisse.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="openingBalance">Solde initial (FCFA)</Label>
              <Input
                id="openingBalance"
                type="number"
                placeholder="0"
                value={openingBalance}
                onChange={(e) => setOpeningBalance(e.target.value)}
                className="text-2xl font-bold text-center h-14"
                min={0}
              />
            </div>
            <div className="flex gap-2 justify-center">
              {[0, 5000, 10000, 20000, 50000].map((amount) => (
                <Button
                  key={amount}
                  variant="outline"
                  size="sm"
                  onClick={() => setOpeningBalance(String(amount))}
                >
                  {amount === 0 ? '0' : `${amount / 1000}k`}
                </Button>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowOpenDialog(false)}>
              Annuler
            </Button>
            <Button
              onClick={handleOpenSession}
              disabled={actionLoading}
              className="bg-green-600 hover:bg-green-700"
            >
              {actionLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Play className="w-4 h-4" /> Ouvrir
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Close Session Dialog */}
      <Dialog open={showCloseDialog} onOpenChange={setShowCloseDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Square className="w-5 h-5" /> Clôturer la Session
            </DialogTitle>
            <DialogDescription>
              Comptez l&apos;argent en caisse et saisissez le montant.
            </DialogDescription>
          </DialogHeader>

          {currentSession && (
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Caisse départ</span>
                  <span className="font-medium">{formatCurrency(currentSession.openingBalance)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Chiffre d&apos;affaires</span>
                  <span className="font-medium text-primary">
                    {formatCurrency(currentSession.totalRevenue)}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between font-semibold">
                  <span>Caisse attendue</span>
                  <span>
                    {formatCurrency(currentSession.openingBalance + currentSession.totalRevenue)}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="closingCash" className="flex items-center gap-1">
                  <Banknote className="w-4 h-4" /> Montant réel en caisse (FCFA)
                </Label>
                <Input
                  id="closingCash"
                  type="number"
                  placeholder="0"
                  value={closingCash}
                  onChange={(e) => setClosingCash(e.target.value)}
                  className="text-2xl font-bold text-center h-14"
                  min={0}
                />
              </div>

              {/* Difference preview */}
              {closingCash && (
                <div
                  className={`rounded-lg p-4 text-center ${
                    Number(closingCash) >= currentSession.openingBalance + currentSession.totalRevenue
                      ? 'bg-green-50 border border-green-200'
                      : 'bg-red-50 border border-red-200'
                  }`}
                >
                  <p className="text-sm font-medium mb-1">Écart</p>
                  <p
                    className={`text-3xl font-bold ${
                      Number(closingCash) >= currentSession.openingBalance + currentSession.totalRevenue
                        ? 'text-green-700'
                        : 'text-red-700'
                    }`}
                  >
                    {formatCurrency(
                      Number(closingCash) - (currentSession.openingBalance + currentSession.totalRevenue)
                    )}
                  </p>
                  {Number(closingCash) < currentSession.openingBalance + currentSession.totalRevenue && (
                    <p className="text-xs text-red-500 mt-1 flex items-center justify-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> Manquant en caisse
                    </p>
                  )}
                  {Number(closingCash) > currentSession.openingBalance + currentSession.totalRevenue && (
                    <p className="text-xs text-green-600 mt-1 flex items-center justify-center gap-1">
                      <CheckCircle className="w-3 h-3" /> Excédent en caisse
                    </p>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="closingNotes">Notes (optionnel)</Label>
                <Input
                  id="closingNotes"
                  placeholder="Remarques sur la session..."
                  value={closingNotes}
                  onChange={(e) => setClosingNotes(e.target.value)}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCloseDialog(false)}>
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={handleCloseSession}
              disabled={actionLoading || !closingCash}
            >
              {actionLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Square className="w-4 h-4" /> Clôturer la Session
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
