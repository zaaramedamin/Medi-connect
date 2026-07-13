import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  ArrowLeft, HeartPulse, Pill, Plus, X, Save, Stethoscope, FileText, ShieldAlert,
  ChevronDown, FileSignature, Ban, ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckboxChip } from '@/components/ui/checkbox';
import { useConfirm } from '@/components/ui/confirm-dialog';
import {
  getPatientFile, savePatientChart, addConsultation, revokeDocument,
} from '@/services/api';
import { IssueDocumentDialog } from './IssueDocumentDialog';
import { useT } from '@/i18n';
import { formatDate, initialsOf } from '@/lib/utils';
import type { Consultation, Medication, DocumentSummary } from '@/types';

// The chronic-condition checkboxes. English keys; labels pass through t().
const CHRONIC_CONDITIONS = [
  'Diabetes', 'Hypertension', 'Asthma', 'Heart disease', 'Kidney disease',
  'Thyroid disorder', 'Epilepsy', 'Cancer', 'Depression / anxiety', 'Arthritis',
];

function age(dob: string | null): string {
  if (!dob) return '—';
  const d = new Date(dob);
  const years = Math.floor((Date.now() - d.getTime()) / (365.25 * 24 * 3600 * 1000));
  return String(years);
}

export default function PatientFile() {
  const { patientId } = useParams<{ patientId: string }>();
  const navigate = useNavigate();
  const t = useT();

  const { data: file, isLoading, isError, error } = useQuery({
    queryKey: ['records', 'patient', patientId],
    queryFn: () => getPatientFile(patientId!),
    enabled: !!patientId,
    retry: false,
  });

  if (isLoading) {
    return <div className="container flex justify-center py-16"><span className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" /></div>;
  }
  if (isError) {
    return (
      <div className="container max-w-2xl py-16 text-center">
        <ShieldAlert className="mx-auto mb-4 h-10 w-10 text-destructive" />
        <p className="font-medium">{(error as Error).message}</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate('/doctor/dashboard')}>{t('Back to dashboard')}</Button>
      </div>
    );
  }
  if (!file) return null;

  const { patient } = file;

  return (
    <div className="container max-w-4xl py-8">
      <button onClick={() => navigate('/doctor/dashboard')} className="mb-4 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> {t('Back to dashboard')}
      </button>

      {/* Identity header */}
      <div className="mb-6 flex items-start gap-4 rounded-2xl border bg-card p-6">
        <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-secondary text-xl font-bold text-secondary-foreground">
          {initialsOf(patient.name)}
        </span>
        <div className="flex-1">
          <h1 className="text-xl font-bold">{patient.name}</h1>
          <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span>{t('Age')}: {age(patient.date_of_birth)}</span>
            {patient.gender && <span className="capitalize">{t(patient.gender)}</span>}
            {patient.blood_type && <span>{t('Blood type')}: {patient.blood_type}</span>}
            {patient.phone && <span>{patient.phone}</span>}
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <ChartCard file={file} />
        <NewConsultation patientId={patientId!} />
        <History consultations={file.consultations} documents={file.documents} patientName={patient.name} />
      </div>
    </div>
  );
}

// ── Standing chart ───────────────────────────────────────────────────
function ChartCard({ file }: { file: NonNullable<Awaited<ReturnType<typeof getPatientFile>>> }) {
  const t = useT();
  const queryClient = useQueryClient();
  const chart = file.chart;

  const [conditions, setConditions] = useState<string[]>(chart?.chronic_conditions ?? []);
  const [meds, setMeds] = useState<Medication[]>(chart?.current_medications ?? []);
  const [allergies, setAllergies] = useState(chart?.clinical_allergies ?? '');
  const [notes, setNotes] = useState(chart?.notes ?? '');

  const save = useMutation({
    mutationFn: () => savePatientChart(file.patient.id, {
      chronic_conditions: conditions,
      current_medications: meds.filter(m => m.name.trim()),
      clinical_allergies: allergies.trim() || null,
      notes: notes.trim() || null,
    }),
    onSuccess: () => {
      toast.success(t('Chart saved.'));
      queryClient.invalidateQueries({ queryKey: ['records', 'patient', file.patient.id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggle = (c: string) => setConditions(cs => cs.includes(c) ? cs.filter(x => x !== c) : [...cs, c]);
  const addMed = () => setMeds(m => [...m, { name: '', dose: '', frequency: '' }]);
  const setMed = (i: number, k: keyof Medication, v: string) => setMeds(m => m.map((x, j) => j === i ? { ...x, [k]: v } : x));
  const removeMed = (i: number) => setMeds(m => m.filter((_, j) => j !== i));

  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2 text-base"><HeartPulse className="h-4 w-4 text-primary" />{t('Medical chart')}</CardTitle></CardHeader>
      <CardContent className="space-y-5">
        <div>
          <p className="mb-2 text-sm font-medium">{t('Chronic conditions')}</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {CHRONIC_CONDITIONS.map(c => (
              <CheckboxChip key={c} label={t(c)} checked={conditions.includes(c)} onChange={() => toggle(c)} />
            ))}
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="flex items-center gap-1.5 text-sm font-medium"><Pill className="h-4 w-4" />{t('Current medications')}</p>
            <Button type="button" size="sm" variant="outline" onClick={addMed}><Plus className="mr-1 h-3.5 w-3.5" />{t('Add')}</Button>
          </div>
          {meds.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('None recorded.')}</p>
          ) : (
            <div className="space-y-2">
              {meds.map((m, i) => (
                <div key={i} className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-2">
                  <Input placeholder={t('Medicine')} value={m.name} onChange={e => setMed(i, 'name', e.target.value)} />
                  <Input className="w-24" placeholder={t('Dose')} value={m.dose ?? ''} onChange={e => setMed(i, 'dose', e.target.value)} />
                  <Input className="w-28" placeholder={t('Frequency')} value={m.frequency ?? ''} onChange={e => setMed(i, 'frequency', e.target.value)} />
                  <button type="button" onClick={() => removeMed(i)} className="p-1.5 text-muted-foreground hover:text-destructive" aria-label={t('Remove')}><X className="h-4 w-4" /></button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <p className="mb-1.5 text-sm font-medium">{t('Allergies (clinical)')}</p>
          <Input value={allergies} onChange={e => setAllergies(e.target.value)} placeholder={t('e.g. Penicillin, iodine contrast')} />
        </div>
        <div>
          <p className="mb-1.5 text-sm font-medium">{t('Background notes')}</p>
          <Textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)} placeholder={t('Relevant history, family history, lifestyle…')} />
        </div>

        <Button onClick={() => save.mutate()} disabled={save.isPending}>
          <Save className="mr-2 h-4 w-4" />{save.isPending ? t('Saving…') : t('Save chart')}
        </Button>
      </CardContent>
    </Card>
  );
}

// ── New consultation ─────────────────────────────────────────────────
function NewConsultation({ patientId }: { patientId: string }) {
  const t = useT();
  const queryClient = useQueryClient();
  const empty = { reason: '', symptoms: '', examination: '', diagnosis: '', plan: '', bp: '', temperature: '', weight: '', heart_rate: '' };
  const [form, setForm] = useState(empty);
  const set = (k: keyof typeof form, v: string) => setForm(f => ({ ...f, [k]: v }));

  const add = useMutation({
    mutationFn: () => addConsultation(patientId, {
      reason: form.reason.trim() || undefined,
      symptoms: form.symptoms.trim() || undefined,
      examination: form.examination.trim() || undefined,
      diagnosis: form.diagnosis.trim() || undefined,
      plan: form.plan.trim() || undefined,
      vitals: (form.bp || form.temperature || form.weight || form.heart_rate)
        ? { bp: form.bp, temperature: form.temperature, weight: form.weight, heart_rate: form.heart_rate }
        : undefined,
    }),
    onSuccess: () => {
      toast.success(t('Consultation recorded.'));
      setForm(empty);
      queryClient.invalidateQueries({ queryKey: ['records', 'patient', patientId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const canSave = form.reason.trim() || form.symptoms.trim() || form.diagnosis.trim();

  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Stethoscope className="h-4 w-4 text-primary" />{t('New consultation')}</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Labeled label={t('Reason for visit')}><Input value={form.reason} onChange={e => set('reason', e.target.value)} /></Labeled>
          <Labeled label={t('Diagnosis')}><Input value={form.diagnosis} onChange={e => set('diagnosis', e.target.value)} /></Labeled>
        </div>
        <Labeled label={t('Symptoms')}><Textarea rows={2} value={form.symptoms} onChange={e => set('symptoms', e.target.value)} /></Labeled>
        <Labeled label={t('Examination findings')}><Textarea rows={2} value={form.examination} onChange={e => set('examination', e.target.value)} /></Labeled>
        <Labeled label={t('Plan')}><Textarea rows={2} value={form.plan} onChange={e => set('plan', e.target.value)} /></Labeled>
        <div>
          <p className="mb-1.5 text-sm font-medium">{t('Vitals')}</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Input placeholder={t('BP')} value={form.bp} onChange={e => set('bp', e.target.value)} />
            <Input placeholder={t('Temp °C')} value={form.temperature} onChange={e => set('temperature', e.target.value)} />
            <Input placeholder={t('Weight kg')} value={form.weight} onChange={e => set('weight', e.target.value)} />
            <Input placeholder={t('HR bpm')} value={form.heart_rate} onChange={e => set('heart_rate', e.target.value)} />
          </div>
        </div>
        <Button onClick={() => add.mutate()} disabled={!canSave || add.isPending}>
          <Plus className="mr-2 h-4 w-4" />{add.isPending ? t('Saving…') : t('Record consultation')}
        </Button>
      </CardContent>
    </Card>
  );
}

// ── History (consultations + issued documents) ───────────────────────
function History({ consultations, documents, patientName }: { consultations: Consultation[]; documents: DocumentSummary[]; patientName: string }) {
  const t = useT();
  if (!consultations.length) {
    return (
      <Card><CardContent className="py-12 text-center text-muted-foreground">{t('No consultations recorded yet.')}</CardContent></Card>
    );
  }
  const docsByConsultation = new Map<number, DocumentSummary[]>();
  for (const d of documents) {
    if (d.consultation_id != null) {
      const arr = docsByConsultation.get(d.consultation_id) ?? [];
      arr.push(d);
      docsByConsultation.set(d.consultation_id, arr);
    }
  }

  return (
    <div>
      <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold"><FileText className="h-5 w-5 text-primary" />{t('Consultation history')}</h2>
      <div className="space-y-3">
        {consultations.map(c => (
          <ConsultationRow key={c.id} consultation={c} documents={docsByConsultation.get(c.id) ?? []} patientName={patientName} />
        ))}
      </div>
    </div>
  );
}

function ConsultationRow({ consultation, documents, patientName }: { consultation: Consultation; documents: DocumentSummary[]; patientName: string }) {
  const t = useT();
  const queryClient = useQueryClient();
  const askConfirm = useConfirm();
  const [open, setOpen] = useState(false);
  const [issueOpen, setIssueOpen] = useState(false);

  const revoke = useMutation({
    mutationFn: (id: number) => revokeDocument(id),
    onSuccess: () => {
      toast.success(t('Document revoked.'));
      queryClient.invalidateQueries({ queryKey: ['records', 'patient', consultation.patient_id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const confirmRevoke = async (id: number, reference: string) => {
    const ok = await askConfirm({
      title: t('Revoke this document?'),
      detail: reference,
      description: t('It stays on file marked as revoked, but is no longer valid. This cannot be undone.'),
      variant: 'destructive',
      confirmLabel: t('Revoke'),
    });
    if (ok) revoke.mutate(id);
  };

  return (
    <Card>
      <button type="button" onClick={() => setOpen(o => !o)} className="flex w-full items-center gap-3 p-4 text-left">
        <div className="flex-1">
          <p className="font-medium">{consultation.diagnosis || consultation.reason || t('Consultation')}</p>
          <p className="text-xs text-muted-foreground">{formatDate(consultation.visit_date)}</p>
        </div>
        {documents.length > 0 && <Badge variant="secondary" className="text-xs">{documents.length} {t(documents.length !== 1 ? 'documents' : 'document')}</Badge>}
        <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <CardContent className="space-y-3 border-t pt-4 text-sm">
          {consultation.reason && <Detail label={t('Reason for visit')} value={consultation.reason} />}
          {consultation.symptoms && <Detail label={t('Symptoms')} value={consultation.symptoms} />}
          {consultation.examination && <Detail label={t('Examination findings')} value={consultation.examination} />}
          {consultation.diagnosis && <Detail label={t('Diagnosis')} value={consultation.diagnosis} />}
          {consultation.plan && <Detail label={t('Plan')} value={consultation.plan} />}
          {consultation.vitals && Object.values(consultation.vitals).some(Boolean) && (
            <Detail label={t('Vitals')} value={[
              consultation.vitals.bp && `${t('BP')} ${consultation.vitals.bp}`,
              consultation.vitals.temperature && `${consultation.vitals.temperature}°C`,
              consultation.vitals.weight && `${consultation.vitals.weight}kg`,
              consultation.vitals.heart_rate && `${consultation.vitals.heart_rate}bpm`,
            ].filter(Boolean).join(' · ')} />
          )}

          {documents.length > 0 && (
            <div className="rounded-lg border bg-muted/30 p-3">
              <p className="mb-2 text-xs font-medium text-muted-foreground">{t('Issued documents')}</p>
              <ul className="space-y-1.5">
                {documents.map(d => (
                  <li key={d.id} className="flex items-center gap-2">
                    <FileSignature className="h-3.5 w-3.5 shrink-0 text-primary" />
                    <Link to={`/records/document/${d.id}`} className="flex items-center gap-1 font-medium text-primary hover:underline">
                      {t(docTypeLabel(d.type))} · {d.reference} <ExternalLink className="h-3 w-3" />
                    </Link>
                    {d.revoked_at
                      ? <Badge variant="destructive" className="ml-auto text-[10px]">{t('Revoked')}</Badge>
                      : <button onClick={() => confirmRevoke(d.id, d.reference)} className="ml-auto text-xs text-muted-foreground hover:text-destructive"><Ban className="mr-0.5 inline h-3 w-3" />{t('Revoke')}</button>}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <Button size="sm" onClick={() => setIssueOpen(true)}>
            <FileSignature className="mr-1.5 h-4 w-4" />{t('Issue a document')}
          </Button>
        </CardContent>
      )}

      <IssueDocumentDialog
        open={issueOpen}
        onOpenChange={setIssueOpen}
        consultation={consultation}
        patientName={patientName}
      />
    </Card>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[8rem_1fr] gap-2">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <span className="whitespace-pre-line">{value}</span>
    </div>
  );
}

function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1"><label className="text-sm font-medium">{label}</label>{children}</div>;
}

export function docTypeLabel(type: string): string {
  return { report: 'Consultation report', prescription: 'Prescription', certificate: 'Medical certificate', referral: 'Referral letter' }[type] ?? type;
}
