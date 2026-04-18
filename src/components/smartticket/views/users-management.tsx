'use client';

import { useState, useEffect } from 'react';
import { apiFetch, formatDate, getRoleLabel, getRoleColor } from '@/lib/api';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  Users,
  Shield,
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────
interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  phone: string | null;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

interface UserFormData {
  name: string;
  email: string;
  password: string;
  role: string;
  phone: string;
}

interface EditUserFormData {
  name: string;
  email: string;
  role: string;
  phone: string;
  isActive: boolean;
}

const emptyAddForm: UserFormData = {
  name: '',
  email: '',
  password: '',
  role: '',
  phone: '',
};

// ── Roles ──────────────────────────────────────────────
const ROLES = ['SUPERADMIN', 'OPERATOR', 'CONTROLLER'] as const;

// ── Loading Skeleton ───────────────────────────────────
function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3 p-4">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4">
          {Array.from({ length: 7 }).map((_, j) => (
            <Skeleton key={j} className="h-8 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// Users Management View
// ═══════════════════════════════════════════════════════
export default function UsersManagementView() {
  // ── State ────────────────────────────────────────────
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');

  // Add dialog
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addForm, setAddForm] = useState<UserFormData>(emptyAddForm);
  const [addSaving, setAddSaving] = useState(false);

  // Edit dialog
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState<EditUserFormData>({
    name: '', email: '', role: '', phone: '', isActive: true,
  });
  const [editSaving, setEditSaving] = useState(false);

  // Delete dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [deleteSaving, setDeleteSaving] = useState(false);

  // ── Fetch Users (initial + on filter change) ─────────
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (roleFilter !== 'all') params.set('role', roleFilter);
      params.set('limit', '100');
      const res = await apiFetch<{ data: User[] }>(`/api/users?${params.toString()}`);
      if (!cancelled) {
        if (res.success) {
          const arr = Array.isArray(res.data) ? res.data : (res.data as any)?.users ?? [];
          setUsers(arr);
        }
        setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [search, roleFilter]);

  // ── Refresh (called after CRUD) ──────────────────────
  function refreshUsers() {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (roleFilter !== 'all') params.set('role', roleFilter);
    params.set('limit', '100');
    apiFetch<{ data: User[] }>(`/api/users?${params.toString()}`).then((res) => {
      if (res.success) {
        const arr = Array.isArray(res.data) ? res.data : (res.data as any)?.users ?? [];
        setUsers(arr);
      }
      setLoading(false);
    });
  }

  // ── Add User ─────────────────────────────────────────
  function openAddUser() {
    setAddForm(emptyAddForm);
    setAddDialogOpen(true);
  }

  async function addUser() {
    setAddSaving(true);
    const res = await apiFetch('/api/users', {
      method: 'POST',
      body: JSON.stringify(addForm),
    });
    if (res.success) {
      setAddDialogOpen(false);
      refreshUsers();
    }
    setAddSaving(false);
  }

  // ── Edit User ────────────────────────────────────────
  function openEditUser(user: User) {
    setEditingUser(user);
    setEditForm({
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone || '',
      isActive: user.isActive,
    });
    setEditDialogOpen(true);
  }

  async function saveEditUser() {
    if (!editingUser) return;
    setEditSaving(true);
    const res = await apiFetch(`/api/users/${editingUser.id}`, {
      method: 'PUT',
      body: JSON.stringify(editForm),
    });
    if (res.success) {
      setEditDialogOpen(false);
      setEditingUser(null);
      refreshUsers();
    }
    setEditSaving(false);
  }

  // ── Delete User ──────────────────────────────────────
  function confirmDeleteUser(user: User) {
    setDeletingUser(user);
    setDeleteDialogOpen(true);
  }

  async function deleteUser() {
    if (!deletingUser) return;
    setDeleteSaving(true);
    const res = await apiFetch(`/api/users/${deletingUser.id}`, { method: 'DELETE' });
    if (res.success) {
      setDeleteDialogOpen(false);
      setDeletingUser(null);
      refreshUsers();
    }
    setDeleteSaving(false);
  }

  // ── Role Filter Tabs ─────────────────────────────────
  const roleTabs = [
    { value: 'all', label: 'Tous', icon: Users },
    { value: 'SUPERADMIN', label: 'Admins', icon: Shield },
    { value: 'OPERATOR', label: 'Opérateurs', icon: Users },
    { value: 'CONTROLLER', label: 'Contrôleurs', icon: Users },
  ];

  // ── Render ───────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Filters & Search */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          {roleTabs.map((tab) => (
            <Button
              key={tab.value}
              variant={roleFilter === tab.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setRoleFilter(tab.value)}
            >
              <tab.icon className="mr-1 size-4" />
              {tab.label}
            </Button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Rechercher par nom ou email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button onClick={openAddUser}>
            <Plus className="mr-1 size-4" />
            Ajouter
          </Button>
        </div>
      </div>

      {/* Users Table */}
      {loading ? (
        <TableSkeleton />
      ) : users.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
          <Users className="mb-3 size-10 text-muted-foreground" />
          <p className="text-lg font-medium">Aucun utilisateur trouvé</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {search || roleFilter !== 'all'
              ? 'Aucun résultat pour ces critères de recherche'
              : 'Commencez par ajouter un utilisateur'}
          </p>
        </div>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Rôle</TableHead>
                <TableHead className="hidden md:table-cell">Téléphone</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="hidden lg:table-cell">Dernière connexion</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell className="text-muted-foreground">{user.email}</TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getRoleColor(user.role)}`}
                    >
                      {getRoleLabel(user.role)}
                    </span>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {user.phone || '—'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.isActive ? 'default' : 'secondary'}>
                      {user.isActive ? 'Actif' : 'Inactif'}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-muted-foreground text-sm">
                    {user.lastLoginAt ? formatDate(user.lastLoginAt) : 'Jamais'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEditUser(user)}>
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => confirmDeleteUser(user)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* ═══════════════ ADD USER DIALOG ═══════════════ */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nouvel utilisateur</DialogTitle>
            <DialogDescription>
              Créez un nouveau compte utilisateur.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="add-name">Nom complet</Label>
              <Input
                id="add-name"
                placeholder="Ex: Jean Dupont"
                value={addForm.name}
                onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="add-email">Email</Label>
              <Input
                id="add-email"
                type="email"
                placeholder="Ex: jean@smartticket.cm"
                value={addForm.email}
                onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="add-password">Mot de passe</Label>
              <Input
                id="add-password"
                type="password"
                placeholder="Minimum 8 caractères"
                value={addForm.password}
                onChange={(e) => setAddForm({ ...addForm, password: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label>Rôle</Label>
              <Select
                value={addForm.role}
                onValueChange={(v) => setAddForm({ ...addForm, role: v })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Sélectionner un rôle" />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {getRoleLabel(r)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="add-phone">Téléphone</Label>
              <Input
                id="add-phone"
                placeholder="Ex: +237 6XX XXX XXX"
                value={addForm.phone}
                onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>Annuler</Button>
            <Button
              onClick={addUser}
              disabled={
                addSaving ||
                !addForm.name ||
                !addForm.email ||
                !addForm.password ||
                !addForm.role
              }
            >
              {addSaving ? 'Création...' : 'Créer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════════ EDIT USER DIALOG ═══════════════ */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Modifier l&apos;utilisateur</DialogTitle>
            <DialogDescription>
              Mettez à jour les informations de {editingUser?.name}.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Nom complet</Label>
              <Input
                id="edit-name"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label>Rôle</Label>
              <Select
                value={editForm.role}
                onValueChange={(v) => setEditForm({ ...editForm, role: v })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Sélectionner un rôle" />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {getRoleLabel(r)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-phone">Téléphone</Label>
              <Input
                id="edit-phone"
                value={editForm.phone}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="edit-active">Utilisateur actif</Label>
              <Switch
                id="edit-active"
                checked={editForm.isActive}
                onCheckedChange={(checked) => setEditForm({ ...editForm, isActive: checked })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Annuler</Button>
            <Button
              onClick={saveEditUser}
              disabled={editSaving || !editForm.name || !editForm.email || !editForm.role}
            >
              {editSaving ? 'Enregistrement...' : 'Modifier'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════════ DELETE USER DIALOG ═══════════════ */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Désactiver l&apos;utilisateur ?</AlertDialogTitle>
            <AlertDialogDescription>
              Voulez-vous vraiment désactiver le compte de{' '}
              <strong>{deletingUser?.name}</strong> ({deletingUser?.email}) ?
              L&apos;utilisateur ne pourra plus se connecter. Cette action est réversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteUser}
              disabled={deleteSaving}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {deleteSaving ? 'Désactivation...' : 'Désactiver'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
