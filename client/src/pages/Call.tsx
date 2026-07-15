import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Loader2, VideoOff, ArrowLeft, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getCallRoom } from '@/services/api';
import { useAuthStore } from '@/stores/authStore';
import { ApiError } from '@/services/api';
import { useT } from '@/i18n';
import { formatTime } from '@/lib/utils';

// Jitsi's iframe bootstrap. Loaded on demand from the meeting domain — not
// bundled — so it only touches the network on an actual video visit.
interface JitsiApi {
  dispose: () => void;
  addEventListener: (event: string, cb: () => void) => void;
}
declare global {
  interface Window {
    JitsiMeetExternalAPI?: new (domain: string, options: Record<string, unknown>) => JitsiApi;
  }
}

function loadJitsiScript(domain: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.JitsiMeetExternalAPI) return resolve();
    const src = `https://${domain}/external_api.js`;
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Failed to load the video library')));
      return;
    }
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Failed to load the video library'));
    document.body.appendChild(s);
  });
}

export default function Call() {
  const { appointmentId } = useParams<{ appointmentId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const t = useT();
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  const { data: call, isLoading, error } = useQuery({
    queryKey: ['call', appointmentId],
    queryFn: () => getCallRoom(Number(appointmentId)),
    enabled: !!appointmentId,
    retry: false,
  });

  useEffect(() => {
    if (!call || !containerRef.current) return;
    let api: JitsiApi | null = null;
    let cancelled = false;

    loadJitsiScript(call.domain)
      .then(() => {
        if (cancelled || !containerRef.current || !window.JitsiMeetExternalAPI) return;
        api = new window.JitsiMeetExternalAPI(call.domain, {
          roomName: call.room,
          parentNode: containerRef.current,
          userInfo: { displayName: call.display_name },
          configOverwrite: { prejoinPageEnabled: true, disableDeepLinking: true },
          interfaceConfigOverwrite: { MOBILE_APP_PROMO: false },
        });
        api.addEventListener('videoConferenceLeft', () => navigate(-1));
        setStatus('ready');
      })
      .catch(() => setStatus('error'));

    return () => { cancelled = true; api?.dispose(); };
  }, [call, navigate]);

  // The room isn't open yet (>10 min early) — friendly wait, not a dead error.
  if (error instanceof ApiError && error.code === 'CALL_NOT_OPEN') {
    const opensAt = error.details?.opens_at as string | undefined;
    return (
      <Centered>
        <Clock className="mb-3 h-10 w-10 text-primary" />
        <h1 className="text-xl font-bold">{t('The call isn’t open yet')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {opensAt ? t('You can join from {time}.', { time: formatTime(opensAt) }) : t('Please come back closer to your appointment time.')}
        </p>
        <Button variant="outline" className="mt-4" onClick={() => navigate(-1)}><ArrowLeft className="mr-1.5 h-4 w-4" />{t('Back')}</Button>
      </Centered>
    );
  }

  if (error) {
    return (
      <Centered>
        <VideoOff className="mb-3 h-10 w-10 text-destructive" />
        <h1 className="text-xl font-bold">{t('Can’t join this call')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{(error as Error).message}</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate(-1)}><ArrowLeft className="mr-1.5 h-4 w-4" />{t('Back')}</Button>
      </Centered>
    );
  }

  return (
    <div className="fixed inset-0 top-16 z-40 bg-zinc-900">
      {(isLoading || status === 'loading') && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-300">
          <Loader2 className="mb-3 h-8 w-8 animate-spin" />
          <p className="text-sm">{t('Connecting to your consultation…')}</p>
        </div>
      )}
      {status === 'error' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-300">
          <VideoOff className="mb-3 h-8 w-8 text-destructive" />
          <p className="text-sm">{t('The video failed to load. Check your connection and try again.')}</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate(-1)}>{t('Back')}</Button>
        </div>
      )}
      <div ref={containerRef} className="h-full w-full" />
      {!user && null}
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="container flex min-h-[60vh] max-w-md flex-col items-center justify-center py-16 text-center">{children}</div>;
}
