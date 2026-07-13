import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { FileText, Pill, ClipboardCheck, Send, Plus, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { issueDocument } from '@/services/api';
import { useT } from '@/i18n';
import { cn } from '@/lib/utils';
import type { Consultation, DocumentType, Medication } from '@/types';

const TYPES: { value: DocumentType; label: string; icon: React.ElementType; hint: string }[] = [
  { value: 'report', label: 'Consultation report', icon: FileText, hint: 'A written summary of the visit.' },
  { value: 'prescription', label: 'Prescription', icon: Pill, hint: 'A drug list for the pharmacy.' },
  { value: 'certificate', label: 'Medical certificate', icon: ClipboardCheck, hint: 'Sick leave or fitness.' },
  { value: 'referral', label: 'Referral letter', icon: Send, hint: 'A letter to another doctor.' },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  consultation: Consultation;
  patientName: string;
}

export function IssueDocumentDialog({ open, onOpenChange, consultation, patientName }: Props) {
  const t = useT();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [type, setType] = useState<DocumentType | null>(null);

  // Per-type payload
  const [reportText, setReportText] = useState('');
  const [meds, setMeds] = useState<Medication[]>([{ name: '', dose: '', frequency: '' }]);
  const [certReason, setCertReason] = useState('');
  const [certDays, setCertDays] = useState('');
  const [certFrom, setCertFrom] = useState(new Date().toISOString().slice(0, 10));
  const [referTo, setReferTo] = useState('');
  const [referText, setReferText] = useState('');

  const reset = () => {
    setType(null);
    setReportText(''); setMeds([{ name: '', dose: '', frequency: '' }]);
    setCertReason(''); setCertDays(''); setReferTo(''); setReferText('');
  };

  const issue = useMutation({
    mutationFn: () => {
      const body: Record<string, unknown> =
        type === 'prescription' ? { medications: meds.filter(m => m.name.trim()) }
        : type === 'certificate' ? { reason: certReason.trim(), days: Number(certDays) || null, from: certFrom }
        : type === 'referral' ? { to: referTo.trim(), letter: referText.trim() }
        : { summary: reportText.trim() || consultation.diagnosis || '' };
      return issueDocument(consultation.id, type!, body);
    },
    onSuccess: doc => {
      toast.success(t('Document issued.'), { description: doc.reference });
      queryClient.invalidateQueries({ queryKey: ['records', 'patient', consultation.patient_id] });
      onOpenChange(false);
      reset();
      navigate(`/records/document/${doc.id}`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const valid =
    type === 'prescription' ? meds.some(m => m.name.trim())
    : type === 'certificate' ? certReason.trim() && certDays
    : type === 'referral' ? referTo.trim() && referText.trim()
    : type === 'report' ? true
    : false;

  return (
    <Dialog open={open} onOpenChange={o => { onOpenChange(o); if (!o) reset(); }}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('Issue a document')}</DialogTitle>
          <DialogDescription>
            {t('For {name} — once issued it is dated, referenced and cannot be edited.', { name: patientName })}
          </DialogDescription>
        </DialogHeader>

        {/* Type picker */}
        <div className="grid grid-cols-2 gap-2">
          {TYPES.map(({ value, label, icon: Icon, hint }) => (
            <button
              key={value}
              type="button"
              onClick={() => setType(value)}
              className={cn(
                'flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition-colors',
                type === value ? 'border-primary bg-primary/5' : 'hover:border-primary/40'
              )}
            >
              <Icon className={cn('h-5 w-5', type === value ? 'text-primary' : 'text-muted-foreground')} />
              <span className="text-sm font-medium">{t(label)}</span>
              <span className="text-xs text-muted-foreground">{t(hint)}</span>
            </button>
          ))}
        </div>

        {/* Per-type form */}
        {type === 'report' && (
          <div className="space-y-1">
            <label className="text-sm font-medium">{t('Summary')}</label>
            <Textarea rows={5} value={reportText} onChange={e => setReportText(e.target.value)} placeholder={t('Defaults to the diagnosis if left blank.')} />
          </div>
        )}

        {type === 'prescription' && (
          <div className="space-y-2">
            <label className="text-sm font-medium">{t('Medications')}</label>
            {meds.map((m, i) => (
              <div key={i} className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-2">
                <Input placeholder={t('Medicine')} value={m.name} onChange={e => setMeds(a => a.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} />
                <Input className="w-20" placeholder={t('Dose')} value={m.dose ?? ''} onChange={e => setMeds(a => a.map((x, j) => j === i ? { ...x, dose: e.target.value } : x))} />
                <Input className="w-24" placeholder={t('Frequency')} value={m.frequency ?? ''} onChange={e => setMeds(a => a.map((x, j) => j === i ? { ...x, frequency: e.target.value } : x))} />
                <button type="button" onClick={() => setMeds(a => a.filter((_, j) => j !== i))} className="p-1.5 text-muted-foreground hover:text-destructive"><X className="h-4 w-4" /></button>
              </div>
            ))}
            <Button type="button" size="sm" variant="outline" onClick={() => setMeds(a => [...a, { name: '', dose: '', frequency: '' }])}><Plus className="mr-1 h-3.5 w-3.5" />{t('Add')}</Button>
          </div>
        )}

        {type === 'certificate' && (
          <div className="space-y-3">
            <div className="space-y-1"><label className="text-sm font-medium">{t('Reason')}</label><Input value={certReason} onChange={e => setCertReason(e.target.value)} placeholder={t('e.g. Unfit for work')} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><label className="text-sm font-medium">{t('Days')}</label><Input type="number" min="1" value={certDays} onChange={e => setCertDays(e.target.value)} /></div>
              <div className="space-y-1"><label className="text-sm font-medium">{t('Starting')}</label><Input type="date" value={certFrom} onChange={e => setCertFrom(e.target.value)} /></div>
            </div>
          </div>
        )}

        {type === 'referral' && (
          <div className="space-y-3">
            <div className="space-y-1"><label className="text-sm font-medium">{t('Refer to')}</label><Input value={referTo} onChange={e => setReferTo(e.target.value)} placeholder={t('Specialist or department')} /></div>
            <div className="space-y-1"><label className="text-sm font-medium">{t('Letter')}</label><Textarea rows={4} value={referText} onChange={e => setReferText(e.target.value)} placeholder={t('Clinical context and reason for referral…')} /></div>
          </div>
        )}

        {type && (
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>{t('Cancel')}</Button>
            <Button onClick={() => issue.mutate()} disabled={!valid || issue.isPending}>
              {issue.isPending ? t('Issuing…') : t('Issue document')}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
