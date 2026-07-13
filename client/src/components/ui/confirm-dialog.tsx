import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { AlertTriangle, HelpCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useT } from '@/i18n';
import { cn } from '@/lib/utils';

export interface ConfirmOptions {
  title: string;
  description?: string;
  /** A short line spelling out exactly what changes, e.g. "0.78 → 0.95". */
  detail?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** 'destructive' paints the action red and says it cannot be undone. */
  variant?: 'default' | 'destructive';
  /**
   * Extra friction for irreversible bulk actions: the button stays disabled
   * until the user types this string back. Use sparingly — on a "delete
   * everything", not on a routine delete.
   */
  requireTyped?: string;
}

type Resolver = (ok: boolean) => void;

const ConfirmContext = createContext<((opts: ConfirmOptions) => Promise<boolean>) | null>(null);

/**
 * One dialog for the whole app, driven by a promise:
 *
 *   const confirm = useConfirm();
 *   if (await confirm({ title: 'Delete?', variant: 'destructive' })) mutate();
 *
 * Replaces window.confirm(), which is unstyled, untranslatable, and silently
 * suppressible by the browser.
 */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const t = useT();
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);
  const [typed, setTyped] = useState('');
  const resolver = useRef<Resolver | null>(null);

  const confirm = useCallback((next: ConfirmOptions) => {
    setTyped('');
    setOpts(next);
    return new Promise<boolean>(resolve => {
      resolver.current = resolve;
    });
  }, []);

  // Settling twice is harmless: the second call finds a null resolver. That
  // matters because closing the dialog also fires onOpenChange(false).
  const settle = (ok: boolean) => {
    resolver.current?.(ok);
    resolver.current = null;
    setOpts(null);
  };

  const destructive = opts?.variant === 'destructive';
  const locked = Boolean(opts?.requireTyped) && typed.trim() !== opts?.requireTyped;

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}

      <Dialog open={opts !== null} onOpenChange={open => !open && settle(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="mb-1 flex items-center gap-3">
              <span
                className={cn(
                  'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
                  destructive ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'
                )}
              >
                {destructive ? <AlertTriangle className="h-5 w-5" /> : <HelpCircle className="h-5 w-5" />}
              </span>
              <DialogTitle className="text-left text-base">{opts?.title}</DialogTitle>
            </div>
            {opts?.description && (
              <DialogDescription className="text-left">{opts.description}</DialogDescription>
            )}
          </DialogHeader>

          {opts?.detail && (
            <p className="rounded-lg border bg-muted/50 px-3 py-2 font-mono text-xs break-words">
              {opts.detail}
            </p>
          )}

          {opts?.requireTyped && (
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">
                {t('Type {value} to confirm', { value: opts.requireTyped })}
              </label>
              <Input
                value={typed}
                onChange={e => setTyped(e.target.value)}
                autoComplete="off"
                spellCheck={false}
                placeholder={opts.requireTyped}
              />
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={() => settle(false)}>
              {opts?.cancelLabel ?? t('Cancel')}
            </Button>
            <Button
              variant={destructive ? 'destructive' : 'default'}
              disabled={locked}
              onClick={() => settle(true)}
            >
              {opts?.confirmLabel ?? (destructive ? t('Delete') : t('Confirm'))}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used within a ConfirmProvider');
  return ctx;
}
