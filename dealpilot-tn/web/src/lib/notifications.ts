import { Resend } from "resend";
import twilio from "twilio";

const resend = new Resend(process.env.RESEND_API_KEY!);
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID!, process.env.TWILIO_AUTH_TOKEN!
);

export async function sendEmail(to: string, subject: string, html: string) {
  await resend.emails.send({
    from: "DealPilot <alerts@dealpilot-tn.vercel.app>",
    to,
    subject,
    html,
  });
}

export async function sendSMS(to: string, body: string) {
  await twilioClient.messages.create({
    from: process.env.TWILIO_PHONE_NUMBER!,
    to,
    body,
  });
}
