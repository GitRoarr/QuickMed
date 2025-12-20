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
      const emailMode = (process.env.EMAIL_MODE || 'auto').toLowerCase();

      if (['log', 'disable', 'off'].includes(emailMode)) {
        console.info('[EmailService] Email mode set to log-only; skipping SMTP setup.');
        this.transporter = null;
        return;
      }

      // If SMTP is configured, use it
      if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
        try {
          console.log('[EmailService] Initializing SMTP connection...');
          console.log('[EmailService] SMTP_HOST:', process.env.SMTP_HOST);
          console.log('[EmailService] SMTP_PORT:', process.env.SMTP_PORT || 587);
          console.log('[EmailService] SMTP_USER:', process.env.SMTP_USER);
          
          this.transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: +(process.env.SMTP_PORT || 587),
            secure: process.env.SMTP_PORT === '465',
            auth: {
              user: process.env.SMTP_USER,
              pass: process.env.SMTP_PASS,
            },
            // Add connection timeout and retry options
            connectionTimeout: 10000,
            greetingTimeout: 10000,
            socketTimeout: 10000,
            // Gmail specific settings
            tls: {
              rejectUnauthorized: false, // For development only
            },
          });
          
          // Verify connection
          console.log('[EmailService] Verifying SMTP connection...');
          await this.transporter.verify();
          console.info('[EmailService] ✅ SMTP connection verified successfully');
          return;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.error('[EmailService] ❌ Failed to initialize SMTP:', errorMessage);
          console.error('[EmailService] Error details:', error);
          console.warn('[EmailService] ⚠️  Email sending will be disabled. Check SMTP credentials.');
          console.warn('[EmailService] 💡 For Gmail: Use App Password, not regular password');
          console.warn('[EmailService] 💡 Generate App Password: https://myaccount.google.com/apppasswords');
          this.transporter = null;
        }
      } else {
        console.warn('[EmailService] ⚠️  SMTP not configured in .env file');
        console.warn('[EmailService] Required: SMTP_HOST, SMTP_USER, SMTP_PASS');
      }

      // In non-production, create a test account (Ethereal) to preview emails
      if (process.env.NODE_ENV !== 'production' && emailMode === 'auto') {
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
      console.warn(`[EmailService] ⚠️  No transporter available. Email would be sent to ${to}: ${subject}`);
      const fallback = extractLink();
      console.log(`[EmailService] 📋 Fallback invite link: ${fallback || 'N/A'}`);
      return { sent: false, fallbackLink: fallback };
    }

    try {
      console.log(`[EmailService] 📧 Attempting to send email to: ${to}`);
      const info = await this.transporter.sendMail({
        from: `"QuickMed Admin" <${process.env.SMTP_USER || 'no-reply@example.com'}>` ,
        to,
        subject,
        html,
      });

      const previewUrl = nodemailer.getTestMessageUrl(info) || undefined;
      if (previewUrl) {
        console.log(`[EmailService] ✅ Email sent successfully to ${to}`);
        console.log(`[EmailService] 👀 Preview URL: ${previewUrl}`);
      } else {
        console.log(`[EmailService] ✅ Email sent successfully to ${to} (Message ID: ${info.messageId})`);
      }
      return { sent: true, previewUrl };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      const errorStack = err instanceof Error ? err.stack : undefined;
      
      console.error('[EmailService] ❌ Email sending failed!');
      console.error('[EmailService] Error message:', errorMessage);
      if (errorStack) {
        console.error('[EmailService] Error stack:', errorStack);
      }
      
      // Check for common Gmail errors
      if (errorMessage.includes('Invalid login') || errorMessage.includes('535')) {
        console.error('[EmailService] 🔐 Authentication failed!');
        console.error('[EmailService] 💡 For Gmail: You must use an App Password, not your regular password');
        console.error('[EmailService] 💡 Steps:');
        console.error('[EmailService]    1. Go to: https://myaccount.google.com/apppasswords');
        console.error('[EmailService]    2. Generate a new App Password for "Mail"');
        console.error('[EmailService]    3. Replace SMTP_PASS in .env with the 16-character App Password');
      } else if (errorMessage.includes('ECONNECTION') || errorMessage.includes('ETIMEDOUT')) {
        console.error('[EmailService] 🌐 Connection error!');
        console.error('[EmailService] 💡 Check your internet connection and SMTP_HOST');
      } else if (errorMessage.includes('EAUTH')) {
        console.error('[EmailService] 🔐 Authentication error!');
        console.error('[EmailService] 💡 Verify SMTP_USER and SMTP_PASS are correct');
      }
      
      // Extract link for fallback
      const fallback = extractLink();
      
      console.warn(`[EmailService] 📋 Returning fallback invite link: ${fallback || 'N/A'}`);
      return { sent: false, fallbackLink: fallback };
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

  async sendPasswordResetEmail(to: string, resetLink: string, firstName?: string): Promise<EmailResult> {
    const subject = 'Reset Your Password - QuickMed';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #16a34a;">Password Reset Request</h2>
        <p>Hello ${firstName || 'there'},</p>
        <p>We received a request to reset your password for your QuickMed account.</p>
        <p>Click the button below to reset your password:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetLink}" style="background-color: #16a34a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">Reset Password</a>
        </div>
        <p style="color: #6b7280; font-size: 14px;">This link will expire in 1 hour.</p>
        <p style="color: #6b7280; font-size: 14px;">If you did not request a password reset, please ignore this email. Your password will remain unchanged.</p>
        <p style="color: #6b7280; font-size: 14px;">For security reasons, if you continue to receive these emails, please contact support.</p>
      </div>
    `;
    return this.sendMail(to, subject, html);
  }
}
