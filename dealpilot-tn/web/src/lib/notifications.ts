import { Resend } from "resend";
import twilio from "twilio";

let _resend: Resend | null = null;
function getResend() {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY!);
  return _resend;
}

let _twilioClient: ReturnType<typeof twilio> | null = null;
function getTwilio() {
  if (!_twilioClient) _twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID!, process.env.TWILIO_AUTH_TOKEN!);
  return _twilioClient;
}

export async function sendEmail(to: string, subject: string, html: string) {
  await getResend().emails.send({
    from: "DealPilot <alerts@dealpilot-tn.vercel.app>",
    to,
    subject,
    html,
  });
}

export async function sendSMS(to: string, body: string) {
  await getTwilio().messages.create({
    from: process.env.TWILIO_PHONE_NUMBER!,
    to,
    body,
  });
}
