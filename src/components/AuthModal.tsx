import React, { useState, useEffect } from 'react';
import { Lock, ShieldCheck, AlertCircle, X, Key, Check, Eye, EyeOff, Clock, ShieldAlert } from 'lucide-react';
import { loginWithPasskey, AUTHORIZED_OWNER_EMAIL } from '../utils/authClient';

export { AUTHORIZED_OWNER_EMAIL };
// For backward compatibility
export const DEFAULT_OWNER_PASSKEY = '';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [passkey, setPasskey] = useState('');
  const [showPasskey, setShowPasskey] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [remainingAttempts, setRemainingAttempts] = useState<number | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [retryAfterMinutes, setRetryAfterMinutes] = useState<number | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [capsLockActive, setCapsLockActive] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPasskey('');
      setError(null);
      setIsSuccess(false);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.getModifierState && e.getModifierState('CapsLock')) {
      setCapsLockActive(true);
    } else {
      setCapsLockActive(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || isSuccess) return;

    setError(null);
    setIsSubmitting(true);

    const cleanPasskey = passkey.trim();
    if (!cleanPasskey) {
      setError('Please enter your security passkey.');
      setIsSubmitting(false);
      return;
    }

    const result = await loginWithPasskey(AUTHORIZED_OWNER_EMAIL, cleanPasskey, rememberMe);

    if (result.success) {
      setIsSuccess(true);
      setError(null);
      setTimeout(() => {
        setIsSuccess(false);
        onSuccess();
      }, 500);
    } else {
      if (result.locked) {
        setIsLocked(true);
        setRetryAfterMinutes(result.retryAfterMinutes || 15);
        setError(result.message || 'Too many failed attempts. Temporary security lockout active.');
      } else {
        setError(result.message || 'Incorrect security passkey.');
        if (typeof result.remainingAttempts === 'number') {
          setRemainingAttempts(result.remainingAttempts);
        }
      }
    }

    setIsSubmitting(false);
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
                Owner Authentication
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Unlock editing privileges
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

        {/* Verified Owner Identification Pill */}
        <div className="p-2.5 rounded-xl bg-stone-50 dark:bg-stone-800/70 border border-stone-200/80 dark:border-stone-700/80 flex items-center gap-2.5 text-xs">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-[11px] font-mono text-stone-500 dark:text-stone-400 uppercase tracking-wider">Authorized Account</div>
            <div className="font-mono text-xs font-semibold text-stone-800 dark:text-stone-200 truncate">{AUTHORIZED_OWNER_EMAIL}</div>
          </div>
          <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
        </div>

        {/* Lockout Notice */}
        {isLocked && (
          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-xs text-amber-800 dark:text-amber-300 space-y-1">
            <div className="flex items-center gap-1.5 font-semibold">
              <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>Security Lockout Active</span>
            </div>
            <p className="text-[11px] text-amber-700 dark:text-amber-300/90 leading-relaxed">
              Exceeded maximum login attempts. Please wait {retryAfterMinutes || 15} minute(s) before retrying.
            </p>
          </div>
        )}

        {/* Error message */}
        {error && !isLocked && (
          <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-xs text-red-700 dark:text-red-300 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span>{error}</span>
              {remainingAttempts !== null && remainingAttempts > 0 && (
                <div className="text-[11px] text-red-600/80 dark:text-red-400/80">
                  {remainingAttempts} attempt{remainingAttempts === 1 ? '' : 's'} remaining before temporary security lockout.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Caps Lock Alert */}
        {capsLockActive && (
          <div className="px-2.5 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 text-[11px] text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Caps Lock is ON</span>
          </div>
        )}

        {/* Form */}
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
                disabled={isLocked || isSubmitting || isSuccess}
                value={passkey}
                onChange={(e) => setPasskey(e.target.value)}
                onKeyDown={handleKeyDown}
                onKeyUp={handleKeyDown}
                placeholder="Enter owner passkey..."
                className="w-full pl-9 pr-10 py-2.5 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 text-xs focus:bg-white dark:focus:bg-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900 dark:focus:ring-stone-400 transition-all font-mono disabled:opacity-60"
              />
              <Key className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-3" />
              <button
                type="button"
                onClick={() => setShowPasskey(!showPasskey)}
                className="p-1.5 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 absolute right-2 top-1.5 cursor-pointer"
                title={showPasskey ? 'Hide passkey' : 'Show passkey'}
                tabIndex={-1}
              >
                {showPasskey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Remember this device checkbox */}
          <div className="flex items-center justify-between text-xs pt-0.5">
            <label className="flex items-center gap-2 cursor-pointer select-none text-stone-600 dark:text-stone-400">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-3.5 h-3.5 rounded border-stone-300 text-stone-900 focus:ring-stone-900 accent-stone-900"
              />
              <span className="text-[11px]">Remember login for 30 days</span>
            </label>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100 dark:border-stone-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl text-xs font-medium text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              id="auth-submit-btn"
              disabled={isSubmitting || isSuccess || isLocked || !passkey.trim()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 dark:bg-stone-100 dark:hover:bg-stone-200 dark:text-stone-900 text-white text-xs font-medium shadow-xs disabled:opacity-50 transition-colors cursor-pointer"
            >
              {isSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400 dark:text-emerald-600" />
                  <span>Verified & Unlocked</span>
                </>
              ) : isSubmitting ? (
                <span>Verifying...</span>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5" />
                  <span>Unlock Admin</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Security badge footer */}
        <div className="pt-2 text-center">
          <p className="text-[10px] text-stone-400 font-mono flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-3 h-3 text-emerald-500" />
            <span>Cryptographic Session • Anti-Brute-Force Protected</span>
          </p>
        </div>
      </div>
    </div>
  );
};
