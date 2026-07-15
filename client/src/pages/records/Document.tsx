import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import QRCode from 'qrcode';
import { Printer, ArrowLeft, ShieldAlert, Stethoscope } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getDocument } from '@/services/api';
import { useT } from '@/i18n';
import { formatDate } from '@/lib/utils';
import type { Medication } from '@/types';

/** Encodes the public verification URL for a document reference as a QR data URL. */
function useVerifyQr(reference: string | undefined): string | null {
  const [qr, setQr] = useState<string | null>(null);
  useEffect(() => {
    if (!reference) return;
    const url = `${window.location.origin}/verify/${encodeURIComponent(reference)}`;
    QRCode.toDataURL(url, { margin: 1, width: 160 }).then(setQr).catch(() => setQr(null));
  }, [reference]);
  return qr;
}

const TYPE_LABEL: Record<string, string> = {
  report: 'Consultation report',
  prescription: 'Prescription',
  certificate: 'Medical certificate',
  referral: 'Referral letter',
};

export default function DocumentView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const t = useT();

  const { data: doc, isLoading, isError, error } = useQuery({
    queryKey: ['records', 'document', id],
    queryFn: () => getDocument(Number(id)),
    enabled: !!id,
    retry: false,
  });

  // Called unconditionally (rules of hooks); no-ops until the reference loads.
  const qr = useVerifyQr(doc?.content?.reference);

  if (isLoading) {
    return <div className="container flex justify-center py-16"><span className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" /></div>;
  }
  if (isError) {
    return (
      <div className="container max-w-lg py-16 text-center">
        <ShieldAlert className="mx-auto mb-4 h-10 w-10 text-destructive" />
        <p className="font-medium">{(error as Error).message}</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate(-1)}>{t('Go back')}</Button>
      </div>
    );
  }
  if (!doc) return null;

  const c = doc.content;
  const revoked = Boolean(doc.revoked_at);
  const body = c.body as Record<string, unknown>;

  return (
    <div className="min-h-screen bg-muted/40 py-8">
      {/* Action bar — hidden when printing */}
      <div className="no-print container mb-4 flex max-w-3xl items-center justify-between">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> {t('Back')}
        </button>
        <Button onClick={() => window.print()}><Printer className="mr-2 h-4 w-4" />{t('Print / Save as PDF')}</Button>
      </div>

      {/* The sheet */}
      <div className="print-sheet container mx-auto max-w-3xl rounded-xl border bg-white p-10 text-[13px] leading-relaxed text-zinc-900 shadow-sm">
        {revoked && (
          <div className="no-print mb-6 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-center text-sm font-semibold text-destructive">
            {t('This document has been revoked and is no longer valid.')}
            {doc.revoked_reason ? ` — ${doc.revoked_reason}` : ''}
          </div>
        )}

        {/* Letterhead */}
        <header className="flex items-start justify-between border-b-2 border-zinc-900 pb-4">
          <div>
            <p className="flex items-center gap-1.5 text-lg font-bold text-primary">
              <Stethoscope className="h-5 w-5" /> {c.doctor.name}
            </p>
            {c.doctor.specialty && <p className="text-zinc-600">{c.doctor.specialty}</p>}
            {c.doctor.clinic && <p className="text-zinc-600">{c.doctor.clinic}</p>}
            <div className="mt-1 text-xs text-zinc-500">
              {c.doctor.address && <p>{c.doctor.address}</p>}
              <p>{[c.doctor.phone, c.doctor.email].filter(Boolean).join('  ·  ')}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold uppercase tracking-wide">{t(TYPE_LABEL[c.type] ?? c.type)}</p>
            <p className="mt-1 text-xs text-zinc-500">{t('Reference')}</p>
            <p className="font-mono text-sm">{c.reference}</p>
            <p className="mt-1 text-xs text-zinc-500">{t('Date')}: {formatDate(c.issued_at)}</p>
          </div>
        </header>

        {/* Patient */}
        <section className="my-5 flex flex-wrap gap-x-8 gap-y-1">
          <div><span className="text-xs text-zinc-500">{t('Patient')}</span><p className="font-semibold">{c.patient.name}</p></div>
          {c.patient.date_of_birth && <div><span className="text-xs text-zinc-500">{t('Date of birth')}</span><p>{formatDate(c.patient.date_of_birth)}</p></div>}
          {c.patient.gender && <div><span className="text-xs text-zinc-500">{t('Gender')}</span><p className="capitalize">{t(c.patient.gender)}</p></div>}
        </section>

        <hr className="border-zinc-200" />

        {/* Body */}
        <main className="my-6 space-y-4">
          {c.type === 'prescription' && <Prescription meds={(body.medications as Medication[]) ?? []} t={t} />}
          {c.type === 'certificate' && <Certificate body={body} patient={c.patient.name} t={t} />}
          {c.type === 'referral' && <Referral body={body} t={t} />}
          {c.type === 'report' && <Report summary={String(body.summary ?? '')} diagnosis={c.consultation.diagnosis} t={t} />}
        </main>

        {/* Signature + verification QR */}
        <footer className="mt-12 flex items-end justify-between gap-6">
          <div className="flex items-end gap-3">
            {qr && (
              <img src={qr} alt="" width={72} height={72} className="rounded border border-zinc-200" />
            )}
            <div className="text-xs text-zinc-400">
              <p className="font-medium text-zinc-500">{t('Verify this document')}</p>
              <p>{t('Scan, or visit {url}', { url: `${window.location.host}/verify` })}</p>
              <p className="font-mono">{c.reference}</p>
            </div>
          </div>
          <div className="text-center">
            <div className="mb-1 h-12 w-48 border-b border-zinc-400" />
            <p className="text-sm font-semibold">{c.doctor.name}</p>
            {c.doctor.specialty && <p className="text-xs text-zinc-500">{c.doctor.specialty}</p>}
          </div>
        </footer>
      </div>
    </div>
  );
}

type T = (s: string, v?: Record<string, string | number>) => string;

function Prescription({ meds, t }: { meds: Medication[]; t: T }) {
  return (
    <div>
      <h2 className="mb-3 text-base font-bold">℞ {t('Prescription')}</h2>
      {meds.length === 0 ? <p className="text-zinc-500">{t('No medications listed.')}</p> : (
        <ol className="space-y-3">
          {meds.map((m, i) => (
            <li key={i} className="flex gap-3">
              <span className="font-bold text-primary">{i + 1}.</span>
              <div>
                <p className="font-semibold">{m.name}</p>
                {(m.dose || m.frequency) && <p className="text-zinc-600">{[m.dose, m.frequency].filter(Boolean).join(' — ')}</p>}
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function Certificate({ body, patient, t }: { body: Record<string, unknown>; patient: string; t: T }) {
  const days = body.days as number | null;
  const from = body.from as string | undefined;
  return (
    <div className="space-y-4">
      <h2 className="text-base font-bold">{t('Medical certificate')}</h2>
      <p>
        {t('I, the undersigned, certify that {name} was examined and is', { name: patient })}{' '}
        <strong>{String(body.reason ?? '')}</strong>
        {days ? ' ' + t('for a period of {days} day(s)', { days }) : ''}
        {from ? ' ' + t('starting {date}', { date: formatDate(from) }) : ''}.
      </p>
      <p className="text-zinc-600">{t('Issued at the patient’s request for whatever purpose it may serve.')}</p>
    </div>
  );
}

function Referral({ body, t }: { body: Record<string, unknown>; t: T }) {
  return (
    <div className="space-y-3">
      <h2 className="text-base font-bold">{t('Referral letter')}</h2>
      {body.to ? <p><span className="text-zinc-500">{t('To')}:</span> <strong>{String(body.to)}</strong></p> : null}
      <p className="whitespace-pre-line">{String(body.letter ?? '')}</p>
    </div>
  );
}

function Report({ summary, diagnosis, t }: { summary: string; diagnosis: string | null; t: T }) {
  return (
    <div className="space-y-3">
      <h2 className="text-base font-bold">{t('Consultation report')}</h2>
      {diagnosis && <p><span className="text-zinc-500">{t('Diagnosis')}:</span> <strong>{diagnosis}</strong></p>}
      <p className="whitespace-pre-line">{summary}</p>
    </div>
  );
}
