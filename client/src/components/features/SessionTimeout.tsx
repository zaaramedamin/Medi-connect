import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ShieldAlert } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/authStore';
import { useT } from '@/i18n';

// An idle session is signed out after this long with no activity; a warning
// appears WARN_MS before that. The app holds patient records, so an unattended
// screen shouldn't stay authenticated indefinitely.
const IDLE_MS = 30 * 60 * 1000; // 30 minutes
const WARN_MS = 60 * 1000; // warn 1 minute before
const POLL_MS = 1000;

// Shared across tabs: activity in one tab keeps the others alive, and the
// deadline survives a tab reload.
const KEY = 'medi-last-activity';
const ACTIVITY_EVENTS = ['pointerdown', 'keydown', 'scroll', 'wheel', 'touchstart', 'pointermove'] as const;

function now() { return Date.now(); }
function readLastActivity(): number {
  const v = Number(localStorage.getItem(KEY));
  return Number.isFinite(v) && v > 0 ? v : now();
}

/**
 * Signs the user out after IDLE_MS of inactivity, with a one-minute warning and
 * a "Stay signed in" button. Rendered once, high in the tree; it does nothing
 * until someone is logged in.
 */
export function SessionTimeout() {
  const { user, signOut } = useAuthStore();
  const navigate = useNavigate();
  const t = useT();

  const [warning, setWarning] = useState(false);
  const [remaining, setRemaining] = useState(WARN_MS);
  // Throttle localStorage writes so a mousemove burst doesn't thrash it.
  const lastWrite = useRef(0);

  const bump = useCallback(() => {
    const ts = now();
    if (ts - lastWrite.current > 2000) {
      localStorage.setItem(KEY, String(ts));
      lastWrite.current = ts;
    }
  }, []);

  const stayActive = useCallback(() => {
    const ts = now();
    localStorage.setItem(KEY, String(ts));
    lastWrite.current = ts;
    setWarning(false);
  }, []);

  const expire = useCallback(async () => {
    setWarning(false);
    localStorage.removeItem(KEY);
    await signOut();
    toast.info(t('You were signed out after 30 minutes of inactivity.'));
    navigate('/login', { replace: true });
  }, [signOut, navigate, t]);

  useEffect(() => {
    if (!user) return;

    // Fresh clock the moment a session begins.
    localStorage.setItem(KEY, String(now()));

    const onActivity = () => {
      bump();
      // Any genuine activity clears the warning without needing the button.
      setWarning(w => (w ? false : w));
    };
    for (const ev of ACTIVITY_EVENTS) window.addEventListener(ev, onActivity, { passive: true });

    const tick = setInterval(() => {
      const idle = now() - readLastActivity();
      if (idle >= IDLE_MS) {
        void expire();
      } else if (idle >= IDLE_MS - WARN_MS) {
        setWarning(true);
        setRemaining(IDLE_MS - idle);
      } else {
        setWarning(false);
      }
    }, POLL_MS);

    return () => {
      clearInterval(tick);
      for (const ev of ACTIVITY_EVENTS) window.removeEventListener(ev, onActivity);
    };
  }, [user, bump, expire]);

  if (!user || !warning) return null;

  const seconds = Math.max(0, Math.ceil(remaining / 1000));

  return (
    <Dialog open onOpenChange={open => { if (!open) stayActive(); }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <div className="mb-1 flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-500/10 text-amber-600">
              <ShieldAlert className="h-5 w-5" />
            </span>
            <DialogTitle className="text-left text-base">{t('Still there?')}</DialogTitle>
          </div>
          <DialogDescription className="text-left">
            {t('For your security you will be signed out in {seconds} seconds.', { seconds })}
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="outline" onClick={() => void expire()}>{t('Sign out now')}</Button>
          <Button onClick={stayActive}>{t('Stay signed in')}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
