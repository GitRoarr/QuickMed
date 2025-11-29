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
    const subject = 'Your Doctor Account Invitation - QuickMed';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #16a34a;">Welcome to QuickMed!</h2>
        <p>You have been invited to join QuickMed as a <strong>Doctor</strong>.</p>
        <p>Click the button below to set your password and activate your account:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${inviteLink}" style="background-color: #16a34a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">Set Your Password</a>
        </div>
        <p style="color: #6b7280; font-size: 14px;">This invitation link will expire in 7 days.</p>
        <p style="color: #6b7280; font-size: 14px;">If you did not expect this invitation, please ignore this email.</p>
      </div>
    `;
    return this.sendMail(to, subject, html);
  }

  async sendReceptionistInvite(to: string, inviteLink: string): Promise<EmailResult> {
    const subject = 'Your Receptionist Account Invitation - QuickMed';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #16a34a;">Welcome to QuickMed!</h2>
        <p>You have been invited to join QuickMed as a <strong>Receptionist</strong>.</p>
        <p>Click the button below to set your password and activate your account:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${inviteLink}" style="background-color: #16a34a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">Set Your Password</a>
        </div>
        <p style="color: #6b7280; font-size: 14px;">This invitation link will expire in 7 days.</p>
        <p style="color: #6b7280; font-size: 14px;">If you did not expect this invitation, please ignore this email.</p>
      </div>
    `;
    return this.sendMail(to, subject, html);
  }
}
