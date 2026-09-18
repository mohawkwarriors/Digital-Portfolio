import React, { useState } from 'react';
import { Lock, ShieldCheck, AlertCircle, X, Key, Check, Eye, EyeOff, Sparkles } from 'lucide-react';

export const AUTHORIZED_OWNER_EMAIL = 'saahiressa@gmail.com';
export const DEFAULT_OWNER_PASSKEY = 'Saahir2026';
export const ACCEPTED_PASSKEYS = [
  'Saahir2026',
  'saahir2026',
  's44h1r2026!P@ss',
  'saahir2026!Pass',
  'saahir2026!P@ss'
];

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [passkey, setPasskey] = useState('');
  const [showPasskey, setShowPasskey] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const cleanPasskey = passkey.trim();

    // 1. Server-side validation via /api/auth
    try {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: AUTHORIZED_OWNER_EMAIL,
          passkey: cleanPasskey,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setIsSuccess(true);
          localStorage.setItem('portfolio_owner_authorized', 'true');
          localStorage.setItem('portfolio_owner_email', data.email || AUTHORIZED_OWNER_EMAIL);

          setTimeout(() => {
            setIsSuccess(false);
            onSuccess();
          }, 400);
          return;
        }
      }
    } catch (err) {
      // Network error or static server environment (e.g. GitHub Pages)
      console.warn('Backend auth unreachable, checking client credentials');
    }

    // 2. Resilient fallback verification for static hosting (GitHub Pages, etc.)
    const customStoredPasskey = localStorage.getItem('portfolio_owner_passkey');
    const validList = [
      DEFAULT_OWNER_PASSKEY,
      ...ACCEPTED_PASSKEYS,
      customStoredPasskey
    ].filter(Boolean) as string[];

    const matchesAnyPasskey = validList.some(
      validKey => cleanPasskey === validKey || cleanPasskey.toLowerCase() === validKey.toLowerCase()
    );

    if (matchesAnyPasskey) {
      setIsSuccess(true);
      localStorage.setItem('portfolio_owner_authorized', 'true');
      localStorage.setItem('portfolio_owner_email', AUTHORIZED_OWNER_EMAIL);

      setTimeout(() => {
        setIsSuccess(false);
        onSuccess();
      }, 400);
    } else {
      setError('Incorrect passkey. Please try again.');
    }

    setIsSubmitting(false);
  };

  return (
    <div 
      id="auth-modal-backdrop" 
      className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div 
        id="auth-modal-dialog"
        className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl shadow-xl w-full max-w-sm p-6 space-y-4 text-stone-900 dark:text-stone-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 flex items-center justify-center text-stone-800 dark:text-stone-200">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <h3 id="auth-modal-title" className="text-base font-semibold text-stone-900 dark:text-stone-100 tracking-tight">
                Owner Authentication
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Enter passkey to edit portfolio
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            id="auth-modal-close"
            aria-label="Close"
            className="p-1 rounded-md text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Notice */}
        <div className="p-3 rounded-lg bg-stone-50 dark:bg-stone-800/60 border border-stone-200/80 dark:border-stone-700/80 text-xs text-stone-600 dark:text-stone-300 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-stone-700 dark:text-stone-300 shrink-0" />
          <span>Restricted to portfolio owner. Enter passkey to proceed.</span>
        </div>

        {/* Error message */}
        {error && (
          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-xs text-red-700 dark:text-red-300 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Form - Only asks for Passkey */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="auth-passkey-input" className="block text-xs font-medium text-stone-700 dark:text-stone-300">
              Security Passkey
            </label>
            <div className="relative">
              <input
                id="auth-passkey-input"
                type={showPasskey ? 'text' : 'password'}
                autoFocus
                required
                value={passkey}
                onChange={(e) => setPasskey(e.target.value)}
                placeholder="Enter passkey..."
                className="w-full pl-8 pr-10 py-2 rounded-lg bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 text-xs focus:bg-white dark:focus:bg-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-900 dark:focus:ring-stone-400 transition-all font-mono"
              />
              <Key className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-2.5" />
              <button
                type="button"
                onClick={() => setShowPasskey(!showPasskey)}
                className="p-1 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 absolute right-2.5 top-2 cursor-pointer"
                title={showPasskey ? 'Hide passkey' : 'Show passkey'}
              >
                {showPasskey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              id="auth-submit-btn"
              disabled={isSubmitting || isSuccess}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 dark:bg-stone-100 dark:hover:bg-stone-200 dark:text-stone-900 disabled:opacity-50 text-white text-xs font-medium shadow-2xs transition-colors cursor-pointer"
            >
              {isSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400 dark:text-emerald-600" />
                  <span>Verified</span>
                </>
              ) : isSubmitting ? (
                <span>Verifying...</span>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5" />
                  <span>Unlock</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
