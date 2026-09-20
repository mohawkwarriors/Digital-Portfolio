import React, { useState, useEffect } from 'react';
import { Lock, ShieldCheck, AlertCircle, X, Sparkles, Check } from 'lucide-react';
import { syncFirebaseSession, AUTHORIZED_OWNER_EMAIL } from '../utils/authClient';
import { signInWithGoogle } from '../utils/firebase';

export { AUTHORIZED_OWNER_EMAIL };

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setIsSuccess(false);
      setIsGoogleLoading(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    if (isGoogleLoading || isSuccess) return;
    setError(null);
    setIsGoogleLoading(true);

    try {
      const res = await signInWithGoogle();
      if (res.success && res.user) {
        const userEmail = res.user.email?.toLowerCase().trim();
        if (userEmail !== AUTHORIZED_OWNER_EMAIL.toLowerCase().trim()) {
          setError('Access denied. This account does not have administrator privileges.');
          setIsGoogleLoading(false);
          return;
        }

        const idToken = await res.user.getIdToken();
        syncFirebaseSession(idToken, res.user.email || AUTHORIZED_OWNER_EMAIL);
        setIsSuccess(true);
        setTimeout(() => {
          setIsSuccess(false);
          onSuccess();
        }, 400);
      } else {
        setError(res.error || 'Google Sign-In was cancelled or failed.');
      }
    } catch (err: any) {
      setError(err?.message || 'Google Sign-In authentication error.');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <div 
      id="auth-modal-backdrop" 
      className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        id="auth-modal-dialog"
        className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-5 text-stone-900 dark:text-stone-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 flex items-center justify-center text-stone-900 dark:text-stone-100">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <h3 id="auth-modal-title" className="text-base font-semibold text-stone-900 dark:text-stone-100 tracking-tight">
                Admin Login
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Sign in with Google to continue
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            id="auth-modal-close"
            aria-label="Close"
            className="p-1 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-xs text-red-700 dark:text-red-300 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Success message */}
        {isSuccess && (
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-500 shrink-0" />
            <span className="font-medium">Authentication successful! Unlocking admin mode...</span>
          </div>
        )}

        {/* Exclusive Google Sign-In CTA */}
        <div className="space-y-3 pt-1">
          <button
            type="button"
            id="google-sign-in-btn"
            onClick={handleGoogleSignIn}
            disabled={isGoogleLoading || isSuccess}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-900 text-white hover:bg-stone-800 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-200 text-xs font-semibold shadow-xs transition-all cursor-pointer disabled:opacity-60"
          >
            {isGoogleLoading ? (
              <span className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 animate-spin" />
                Signing in with Google...
              </span>
            ) : isSuccess ? (
              <span className="flex items-center gap-2">
                <Check className="w-4 h-4" />
                Authorized
              </span>
            ) : (
              <>
                <svg className="w-4 h-4 shrink-0 bg-white rounded-full p-0.5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.04 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                  />
                </svg>
                <span>Sign in with Google</span>
              </>
            )}
          </button>

          <p className="text-[11px] text-stone-500 dark:text-stone-400 text-center leading-relaxed">
            Please sign in with an authorized Google account to continue.
          </p>
        </div>

        {/* Security badge footer */}
        <div className="pt-2 border-t border-stone-100 dark:border-stone-800 text-center">
          <p className="text-[10px] text-stone-400 font-mono flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-3 h-3 text-emerald-500" />
            <span>Secure OAuth 2.0 Authentication</span>
          </p>
        </div>
      </div>
    </div>
  );
};
