import React, { useState, useEffect } from 'react';
import { Lock, ShieldCheck, AlertCircle, X, Sparkles, Check, Key, Copy } from 'lucide-react';
import { syncFirebaseSession, loginWithPasskey, AUTHORIZED_OWNER_EMAIL } from '../utils/authClient';
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
  const [showPasskey, setShowPasskey] = useState(false);
  const [passkey, setPasskey] = useState('');
  const [isPasskeyLoading, setIsPasskeyLoading] = useState(false);
  const [copiedHost, setCopiedHost] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setIsSuccess(false);
      setIsGoogleLoading(false);
      setIsPasskeyLoading(false);
      setPasskey('');
      setCopiedHost(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const currentHost = typeof window !== 'undefined' ? window.location.hostname : '';

  const handleCopyHost = () => {
    if (currentHost) {
      navigator.clipboard.writeText(currentHost);
      setCopiedHost(true);
      setTimeout(() => setCopiedHost(false), 2000);
    }
  };

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
        if (res.error?.includes('Domain unauthorized')) {
          setShowPasskey(true);
        }
      }
    } catch (err: any) {
      setError(err?.message || 'Google Sign-In authentication error.');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handlePasskeySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passkey.trim() || isPasskeyLoading) return;
    setError(null);
    setIsPasskeyLoading(true);

    try {
      const res = await loginWithPasskey(passkey.trim());
      if (res.success) {
        setIsSuccess(true);
        setTimeout(() => {
          setIsSuccess(false);
          onSuccess();
        }, 400);
      } else {
        setError(res.message || 'Invalid passkey.');
      }
    } catch (err: any) {
      setError('Error authenticating with passkey.');
    } finally {
      setIsPasskeyLoading(false);
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
                Authenticate to manage portfolio content
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
            <div className="space-y-1.5 leading-relaxed">
              <span>{error}</span>
              {currentHost && (
                <div className="pt-1 flex items-center gap-2">
                  <span className="font-mono text-[10px] bg-red-100 dark:bg-red-900/50 px-1.5 py-0.5 rounded text-red-800 dark:text-red-200 truncate max-w-[200px]">
                    {currentHost}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyHost}
                    className="inline-flex items-center gap-1 text-[10px] font-medium text-red-700 dark:text-red-300 hover:underline cursor-pointer"
                  >
                    {copiedHost ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    {copiedHost ? 'Copied' : 'Copy'}
                  </button>
                </div>
              )}
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

        {/* Authentication Options */}
        <div className="space-y-3 pt-1">
          <button
            type="button"
            id="google-sign-in-btn"
            onClick={handleGoogleSignIn}
            disabled={isGoogleLoading || isSuccess}
            className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-900 text-white hover:bg-stone-800 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-200 text-xs font-semibold shadow-xs transition-all cursor-pointer disabled:opacity-60"
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

          {/* Passkey Fallback Section */}
          <div className="pt-2">
            {!showPasskey ? (
              <button
                type="button"
                id="toggle-passkey-btn"
                onClick={() => setShowPasskey(true)}
                className="w-full text-center text-xs text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200 transition-colors py-1 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Key className="w-3 h-3" />
                <span>Or log in with Admin Passkey</span>
              </button>
            ) : (
              <form onSubmit={handlePasskeySubmit} className="space-y-2.5 pt-2 border-t border-stone-100 dark:border-stone-800">
                <div className="flex items-center justify-between text-[11px] text-stone-500 dark:text-stone-400">
                  <span className="font-medium flex items-center gap-1">
                    <Key className="w-3 h-3" />
                    Admin Passkey
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowPasskey(false)}
                    className="text-[10px] text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 cursor-pointer"
                  >
                    Hide
                  </button>
                </div>
                <div className="flex gap-2">
                  <input
                    type="password"
                    id="admin-passkey-input"
                    value={passkey}
                    onChange={(e) => setPasskey(e.target.value)}
                    placeholder="Enter passkey..."
                    autoFocus
                    className="flex-1 px-3 py-2 text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:outline-hidden focus:ring-1 focus:ring-stone-400"
                  />
                  <button
                    type="submit"
                    id="submit-passkey-btn"
                    disabled={isPasskeyLoading || !passkey.trim()}
                    className="px-3 py-2 rounded-xl bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 text-xs font-semibold hover:bg-stone-800 dark:hover:bg-stone-200 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {isPasskeyLoading ? '...' : 'Unlock'}
                  </button>
                </div>
                <p className="text-[10px] text-stone-400 dark:text-stone-500">
                  Passkey allows instant access on any domain without Google OAuth whitelisting.
                </p>
              </form>
            )}
          </div>
        </div>

        {/* Security badge footer */}
        <div className="pt-2 border-t border-stone-100 dark:border-stone-800 text-center">
          <p className="text-[10px] text-stone-400 font-mono flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-3 h-3 text-emerald-500" />
            <span>Secure Admin Authentication</span>
          </p>
        </div>
      </div>
    </div>
  );
};
