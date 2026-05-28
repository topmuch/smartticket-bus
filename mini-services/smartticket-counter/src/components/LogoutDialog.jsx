import { AlertTriangle, LogOut, X } from 'lucide-react';

export default function LogoutDialog({ onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
        onClick={onCancel}
      />

      {/* Dialog */}
      <div className="relative w-full max-w-xs bg-white rounded-2xl shadow-2xl p-5 animate-scale-in">
        <button
          onClick={onCancel}
          className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="text-center mb-4">
          <div className="w-12 h-12 bg-danger/10 rounded-full flex items-center justify-center mx-auto mb-3">
            <AlertTriangle className="w-6 h-6 text-danger" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">Déconnexion</h3>
          <p className="text-sm text-gray-500 mt-1">
            Voulez-vous vraiment vous déconnecter ?
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="btn-outline flex-1 text-sm"
          >
            Annuler
          </button>
          <button
            onClick={onConfirm}
            className="btn-danger flex-1 text-sm flex items-center justify-center gap-1.5"
          >
            <LogOut className="w-4 h-4" />
            Déconnexion
          </button>
        </div>
      </div>
    </div>
  );
}
