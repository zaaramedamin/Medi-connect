import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = process.env.SENDER_EMAIL ?? 'noreply@mediconnect.app';

export async function sendAppointmentConfirmation(
  patientEmail: string,
  patientName: string,
  doctorName: string,
  appointmentDate: string,
  appointmentTime: string
) {
  return resend.emails.send({
    from: FROM_EMAIL,
    to: patientEmail,
    subject: 'Appointment Confirmed — MediConnect',
    html: `
      <h2>Appointment Confirmed</h2>
      <p>Hi ${patientName},</p>
      <p>Your appointment with <strong>Dr. ${doctorName}</strong> has been confirmed.</p>
      <p><strong>Date:</strong> ${appointmentDate}<br/>
         <strong>Time:</strong> ${appointmentTime}</p>
      <p>Please arrive 10 minutes early. You can manage your appointment from your dashboard.</p>
      <p>— MediConnect Team</p>
    `,
  });
}

export async function sendAppointmentReminder(
  patientEmail: string,
  patientName: string,
  doctorName: string,
  appointmentTime: string,
  hoursUntil: number
) {
  const label = hoursUntil >= 20 ? '24-hour' : hoursUntil >= 1 ? '2-hour' : 'now';
  return resend.emails.send({
    from: FROM_EMAIL,
    to: patientEmail,
    subject: `Appointment Reminder (${label}) — MediConnect`,
    html: `
      <h2>Appointment Reminder</h2>
      <p>Hi ${patientName},</p>
      <p>Your appointment with <strong>Dr. ${doctorName}</strong> is at <strong>${appointmentTime}</strong>.</p>
      <p>— MediConnect Team</p>
    `,
  });
}
