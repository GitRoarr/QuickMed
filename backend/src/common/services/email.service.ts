import { Injectable, InternalServerErrorException } from "@nestjs/common";
import * as nodemailer from "nodemailer";

interface EmailResult {
  sent: boolean;
  fallbackLink?: string;
  previewUrl?: string;
}

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    (async () => {
      // If SMTP is configured, use it
      if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
        this.transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: +(process.env.SMTP_PORT || 587),
          secure: process.env.SMTP_PORT === '465',
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
        });
        return;
      }

      // In non-production, create a test account (Ethereal) to preview emails
      if (process.env.NODE_ENV !== 'production') {
        try {
          const testAccount = await nodemailer.createTestAccount();
          this.transporter = nodemailer.createTransport({
            host: testAccount.smtp.host,
            port: testAccount.smtp.port,
            secure: testAccount.smtp.secure,
            auth: {
              user: testAccount.user,
              pass: testAccount.pass,
            },
          });
          console.info('[EmailService] Using Ethereal test account for email preview');
          return;
        } catch (err) {
          console.warn('[EmailService] Failed to create test account for emails', err);
        }
      }

      // No transporter available
      console.warn('[EmailService] SMTP not configured. Email sending will be disabled.');
      this.transporter = null;
    })();
  }

  async sendMail(to: string, subject: string, html: string): Promise<EmailResult> {
    const extractLink = () => html.match(/href="([^"]+)"/)?.[1];

    if (!this.transporter) {
      console.log(`[EmailService] Email would be sent to ${to}: ${subject}`);
      return { sent: false, fallbackLink: extractLink() };
    }

    try {
      const info = await this.transporter.sendMail({
        from: `"Clinic Admin" <${process.env.SMTP_USER || 'no-reply@example.com'}>` ,
        to,
        subject,
        html,
      });

      const previewUrl = nodemailer.getTestMessageUrl(info) || undefined;
      console.log(`[EmailService] Email sent successfully to ${to}` + (previewUrl ? ` (preview: ${previewUrl})` : ''));
      return { sent: true, previewUrl };
    } catch (err) {
      console.error('Email sending error:', err);
      if (process.env.NODE_ENV !== 'production') {
        const fallback = extractLink();
        console.log(`[EmailService] Development mode - Invite link: ${fallback || 'N/A'}`);
        return { sent: false, fallbackLink: fallback };
      }
      throw new InternalServerErrorException('Failed to send email');
    }
  }

  async sendDoctorInvite(to: string, inviteLink: string): Promise<EmailResult> {
    const subject = 'Your Doctor Account Invitation';
    const html = `
      <h3>Welcome!</h3>
      <p>You have been invited as a doctor. Click the link below to set your password and activate your account:</p>
      <a href="${inviteLink}">Set Your Password</a>
      <p>The link expires in 7 days.</p>
    `;
    return this.sendMail(to, subject, html);
  }
}
