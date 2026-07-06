import { supabaseAdmin } from '../config/supabase';
import { sendAppointmentReminder } from './emailService';

type ReminderType = '24hour' | '2hour';

// Sends a reminder for every confirmed appointment that has entered a window
// (<= N hours away) and hasn't already had that reminder logged.
async function processWindow(type: ReminderType, hours: number) {
  const now = new Date();
  const until = new Date(now.getTime() + hours * 3600 * 1000);

  const { data: appts } = await supabaseAdmin
    .from('appointments')
    .select('id, time_slot, user_id, doctor_id')
    .eq('status', 'confirmed')
    .gt('time_slot', now.toISOString())
    .lte('time_slot', until.toISOString());

  if (!appts?.length) return;

  // Skip appointments that already received this reminder
  const ids = appts.map(a => a.id);
  const { data: logs } = await supabaseAdmin
    .from('reminder_logs')
    .select('appointment_id')
    .eq('reminder_type', type)
    .in('appointment_id', ids);
  const alreadySent = new Set((logs ?? []).map(l => l.appointment_id));

  for (const apt of appts) {
    if (alreadySent.has(apt.id)) continue;

    const [{ data: patient }, { data: doctor }] = await Promise.all([
      supabaseAdmin.auth.admin.getUserById(apt.user_id),
      supabaseAdmin.from('doctors').select('name').eq('id', apt.doctor_id).single(),
    ]);
    if (!patient.user?.email || !doctor) continue;

    const when = new Date(apt.time_slot).toLocaleString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });

    try {
      await sendAppointmentReminder(
        patient.user.email,
        (patient.user.user_metadata?.name as string) ?? 'Patient',
        doctor.name,
        when,
        hours
      );
      await supabaseAdmin.from('reminder_logs').insert({ appointment_id: apt.id, reminder_type: type });
    } catch (err) {
      console.error(`Reminder (${type}) failed for appointment ${apt.id}:`, err);
    }
  }
}

/** Runs both reminder windows. Safe to call on an interval — dedupes via reminder_logs. */
export async function processReminders() {
  const key = process.env.RESEND_API_KEY;
  // Skip when email isn't really configured (missing or placeholder key)
  if (!key || key.includes('xxxx')) return;

  try {
    await processWindow('24hour', 24);
    await processWindow('2hour', 2);
  } catch (err) {
    console.error('processReminders error:', err);
  }
}
