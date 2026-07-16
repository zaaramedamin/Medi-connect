import { AlertTriangle, Ban } from 'lucide-react';
import { useT } from '@/i18n';
import type { PenaltySummary } from '@/types';

/**
 * Compact reliability flag shown next to a patient's name in the doctor and
 * admin lists — blacklisted / banned / previously-missed.
 */
export function PenaltyFlag({ penalty }: { penalty: PenaltySummary | null }) {
  const t = useT();
  if (!penalty) return null;

  if (penalty.blacklisted) {
    return <Chip tone="bad" icon={Ban} label={t('Blacklisted')} />;
  }
  if (penalty.is_banned) {
    return <Chip tone="bad" icon={Ban} label={t('Banned')} />;
  }
  if (penalty.total_missed > 0) {
    return <Chip tone="warn" icon={AlertTriangle} label={t('Missed {n}', { n: penalty.total_missed })} title={t('{n} missed appointment(s)', { n: penalty.total_missed })} />;
  }
  return null;
}

function Chip({ tone, icon: Icon, label, title }: { tone: 'bad' | 'warn'; icon: React.ElementType; label: string; title?: string }) {
  const cls = tone === 'bad' ? 'bg-destructive/10 text-destructive' : 'bg-amber-500/10 text-amber-600';
  return (
    <span title={title} className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${cls}`}>
      <Icon className="h-3 w-3" />{label}
    </span>
  );
}
