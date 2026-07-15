import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ShieldCheck, ShieldX, ShieldAlert, Search, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { verifyDocument } from '@/services/api';
import { useT } from '@/i18n';
import { formatDate } from '@/lib/utils';

const TYPE_LABEL: Record<string, string> = {
  report: 'Consultation report',
  prescription: 'Prescription',
  certificate: 'Medical certificate',
  referral: 'Referral letter',
};

/**
 * Public page — anyone (a pharmacist, an employer) can confirm a MediConnect
 * document is genuine and current by scanning its QR or typing its reference.
 * Shows only authenticity facts; never the patient or any clinical content.
 */
export default function Verify() {
  const { reference: refParam } = useParams<{ reference?: string }>();
  const navigate = useNavigate();
  const t = useT();
  const [input, setInput] = useState(refParam ?? '');

  const reference = (refParam ?? '').trim().toUpperCase();
  const { data, isLoading, isError } = useQuery({
    queryKey: ['verify', reference],
    queryFn: () => verifyDocument(reference),
    enabled: reference.length > 0,
    retry: false,
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const r = input.trim().toUpperCase();
    if (r) navigate(`/verify/${encodeURIComponent(r)}`);
  };

  return (
    <div className="container max-w-lg py-12">
      <div className="mb-8 text-center">
        <ShieldCheck className="mx-auto mb-3 h-10 w-10 text-primary" />
        <h1 className="text-2xl font-bold">{t('Verify a medical document')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t('Confirm a MediConnect document is genuine. Enter its reference or scan its QR code.')}
        </p>
      </div>

      <form onSubmit={submit} className="mb-8 flex gap-2">
        <Input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="MC-PRE-2026-000042"
          className="font-mono"
          autoFocus
        />
        <Button type="submit"><Search className="mr-1.5 h-4 w-4" />{t('Verify')}</Button>
      </form>

      {reference && isLoading && (
        <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      )}

      {reference && isError && (
        <Result icon={ShieldAlert} tone="warn" title={t('Could not check right now')}
          detail={t('Please try again in a moment.')} />
      )}

      {data && !data.found && (
        <Result icon={ShieldX} tone="bad" title={t('No such document')}
          detail={t('No document with reference {ref} was issued by MediConnect.', { ref: reference })} />
      )}

      {data?.found && data.status === 'revoked' && (
        <Result icon={ShieldX} tone="bad" title={t('This document has been revoked')}
          detail={t('It was issued but is no longer valid.')}>
          <Facts data={data} t={t} />
        </Result>
      )}

      {data?.found && data.status === 'valid' && (
        <Result icon={ShieldCheck} tone="good" title={t('Genuine and valid')}
          detail={t('This document was issued by MediConnect and has not been revoked.')}>
          <Facts data={data} t={t} />
        </Result>
      )}
    </div>
  );
}

function Facts({ data, t }: { data: NonNullable<Awaited<ReturnType<typeof verifyDocument>>>; t: (s: string, v?: Record<string, string | number>) => string }) {
  return (
    <dl className="mt-4 space-y-1.5 border-t pt-4 text-sm">
      <Row label={t('Type')} value={t(TYPE_LABEL[data.type ?? ''] ?? data.type ?? '')} />
      <Row label={t('Reference')} value={<span className="font-mono">{data.reference}</span>} />
      {data.issued_at && <Row label={t('Date')} value={formatDate(data.issued_at)} />}
      {data.doctor_name && <Row label={t('Issued by')} value={`${data.doctor_name}${data.doctor_specialty ? ` · ${data.doctor_specialty}` : ''}`} />}
    </dl>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  );
}

function Result({ icon: Icon, tone, title, detail, children }: {
  icon: React.ElementType; tone: 'good' | 'bad' | 'warn'; title: string; detail: string; children?: React.ReactNode;
}) {
  const toneClass = {
    good: 'border-green-500/30 bg-green-500/5',
    bad: 'border-destructive/30 bg-destructive/5',
    warn: 'border-amber-500/30 bg-amber-500/5',
  }[tone];
  const iconClass = { good: 'text-green-600', bad: 'text-destructive', warn: 'text-amber-600' }[tone];

  return (
    <div className={`rounded-2xl border p-6 ${toneClass}`}>
      <div className="flex items-start gap-3">
        <Icon className={`h-6 w-6 shrink-0 ${iconClass}`} />
        <div className="flex-1">
          <p className="font-semibold">{title}</p>
          <p className="mt-0.5 text-sm text-muted-foreground">{detail}</p>
          {children}
        </div>
      </div>
    </div>
  );
}
