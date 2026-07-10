import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getDoctorSlots } from '@/services/api';
import { useI18n } from '@/i18n';
import { cn, formatTime } from '@/lib/utils';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isBefore, startOfDay } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Props {
  doctorId: string;
  onSelectSlot: (slot: string) => void;
}

const WEEKDAYS = {
  en: ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'],
  fr: ['Di', 'Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa'],
};

export function BookingCalendar({ doctorId, onSelectSlot }: Props) {
  const { t, lang } = useI18n();
  const locale = lang === 'fr' ? fr : undefined;
  const today = new Date();
  const [month, setMonth] = useState(today);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const dateStr = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : null;

  const { data: slots, isLoading: slotsLoading } = useQuery({
    queryKey: ['slots', doctorId, dateStr],
    queryFn: () => getDoctorSlots(doctorId, dateStr!),
    enabled: !!dateStr,
  });

  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startPad = getDay(monthStart); // 0=Sun

  const isPastDay = (d: Date) => isBefore(d, startOfDay(today));

  return (
    <div className="space-y-6">
      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={() => setMonth(m => subMonths(m, 1))} aria-label={t('Previous month')}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="font-medium capitalize">{format(month, 'MMMM yyyy', { locale })}</span>
        <Button variant="ghost" size="icon" onClick={() => setMonth(m => addMonths(m, 1))} aria-label={t('Next month')}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {(lang === 'fr' ? WEEKDAYS.fr : WEEKDAYS.en).map((d, i) => (
          <div key={i} className="text-center text-xs font-medium text-muted-foreground py-1">{d}</div>
        ))}
        {Array(startPad).fill(null).map((_, i) => <div key={`pad-${i}`} />)}
        {days.map(day => {
          const isSelected = selectedDate && format(day, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd');
          const isPast = isPastDay(day);
          return (
            <button
              key={day.toISOString()}
              type="button"
              disabled={isPast}
              onClick={() => setSelectedDate(day)}
              className={cn(
                'rounded-md py-2 text-sm transition-colors',
                isPast && 'opacity-30 cursor-not-allowed',
                !isPast && 'hover:bg-primary/10',
                isSelected && 'bg-primary text-primary-foreground hover:bg-primary/90 font-semibold',
              )}
              aria-label={format(day, 'PPP', { locale })}
              aria-pressed={!!isSelected}
            >
              {format(day, 'd')}
            </button>
          );
        })}
      </div>

      {/* Time slots */}
      {selectedDate ? (
        <div>
          <p className="text-sm font-medium mb-3 capitalize">{t('Available times')} — {format(selectedDate, 'EEEE, MMMM d', { locale })}</p>
          {slotsLoading ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {[...Array(8)].map((_, i) => <div key={i} className="h-9 rounded-md bg-muted animate-pulse" />)}
            </div>
          ) : !slots?.length ? (
            <p className="text-sm text-muted-foreground">{t('No available times for this day.')}</p>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {slots.map(slot => (
                <button
                  key={slot.time}
                  type="button"
                  disabled={!slot.available}
                  onClick={() => onSelectSlot(slot.time)}
                  className={cn(
                    'rounded-md border py-2 text-sm font-medium transition-colors',
                    slot.available
                      ? 'hover:border-primary hover:bg-primary/5 hover:text-primary'
                      : 'opacity-40 cursor-not-allowed line-through'
                  )}
                >
                  {formatTime(slot.time)}
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">{t('Select a date to see available times')}</p>
      )}
    </div>
  );
}
