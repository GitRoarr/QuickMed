import { Injectable, InternalServerErrorException } from "@nestjs/common";
import * as sgMail from "@sendgrid/mail";

interface EmailResult {
  sent: boolean;
  fallbackLink?: string;
  previewUrl?: string;
}

@Injectable()
export class EmailService {
  private sendGridEnabled = false;
  private readonly fromEmail: string;

  constructor() {
    this.fromEmail = process.env.EMAIL_FROM || "girmaenkuchille@gmail.com";
    const apiKey = process.env.SENDGRID_API_KEY;

    if (!apiKey) {
      console.warn("[EmailService] ⚠️  SENDGRID_API_KEY not configured. Email sending will be disabled.");
      this.sendGridEnabled = false;
      return;
    }

    sgMail.setApiKey(apiKey);
    this.sendGridEnabled = true;
    console.info("[EmailService] ✅ SendGrid initialized successfully");
  }

  async sendEmail(to: string, subject: string, html: string): Promise<EmailResult> {
    const extractLink = () => html.match(/href="([^"]+)"/)?.[1];

    if (!this.sendGridEnabled) {
      console.warn(`[EmailService] ⚠️  SendGrid not configured. Email would be sent to ${to}: ${subject}`);
      const fallback = extractLink();
      console.log(`[EmailService] 📋 Fallback invite link: ${fallback || 'N/A'}`);
      return { sent: false, fallbackLink: fallback };
    }

    try {
      console.log(`[EmailService] 📧 Sending email to: ${to}`);
      await sgMail.send({
        to,
        from: this.fromEmail,
        subject,
        html,
      });
      console.log(`[EmailService] ✅ Email sent successfully to ${to}`);
      return { sent: true };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error('[EmailService] ❌ Email sending failed!');
      console.error('[EmailService] Error message:', errorMessage);
      if (err && typeof err === "object") {
        console.error('[EmailService] Error details:', err);
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
    return this.sendEmail(to, subject, html);
  }

  async sendReceptionistInvite(
    to: string,
    inviteLink: string,
    firstName: string = 'Team Member',
    tempPassword?: string
  ): Promise<EmailResult> {
    const subject = `Welcome to the Team, ${firstName}! - QuickMed Admin Portal`;
    const html = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 0; background-color: #f9fafb; border-radius: 16px; overflow: hidden; border: 1px solid #e5e7eb; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
        <!-- Header / Logo -->
        <div style="background-color: #ffffff; padding: 32px 20px; text-align: center; border-bottom: 1px solid #f3f4f6;">
          <h1 style="color: #16a34a; margin: 0; font-size: 28px; font-weight: 800; letter-spacing: -0.5px;">QuickMed</h1>
          <p style="color: #6b7280; margin: 4px 0 0 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Admin Portal Invitation</p>
        </div>

        <!-- Body Content -->
        <div style="padding: 40px 32px; background-color: #ffffff;">
          <h2 style="color: #111827; margin: 0 0 16px 0; font-size: 22px; font-weight: 700;">Hello ${firstName},</h2>
          <p style="color: #4b5563; line-height: 1.6; margin-bottom: 24px; font-size: 16px;">
            We're thrilled to have you join our front desk squad. Your role as a <strong>Receptionist</strong> is vital to making QuickMed a success, and we can't wait to see the impact you'll make.
          </p>

          ${tempPassword ? `
          <div style="background-color: #ecfdf5; border: 1px solid #bbf7d0; padding: 16px; border-radius: 12px; margin-bottom: 20px;">
            <p style="color: #065f46; margin: 0 0 8px 0; font-size: 14px; font-weight: 700;">Temporary Password</p>
            <p style="color: #065f46; margin: 0; font-size: 16px; font-weight: 800; letter-spacing: 0.5px;">${tempPassword}</p>
            <p style="color: #047857; margin: 8px 0 0 0; font-size: 12px;">Use this to sign in, then set a new password using the link below.</p>
          </div>
          ` : ''}

          <div style="text-align: center; margin: 40px 0;">
            <a href="${inviteLink}" style="background: linear-gradient(135deg, #16a34a, #15803d); color: #ffffff; padding: 16px 36px; text-decoration: none; border-radius: 12px; display: inline-block; font-weight: 700; font-size: 16px; box-shadow: 0 10px 15px -3px rgba(22, 163, 74, 0.3);">Set Your Password & Login</a>
          </div>

          <!-- Feature Highlights -->
          <div style="background-color: #f3f4f6; padding: 24px; border-radius: 12px; margin-top: 32px;">
            <h3 style="color: #111827; margin: 0 0 12px 0; font-size: 14px; text-transform: uppercase;">Quick Tips for Getting Started:</h3>
            <ul style="color: #4b5563; margin: 0; padding-left: 20px; font-size: 14px; line-height: 1.8;">
              <li><strong>Dashboard:</strong> Get a bird's-eye view of today's appointments and clinic status.</li>
              <li><strong>Patient Management:</strong> Easily register new patients and update existing records.</li>
              <li><strong>Scheduling:</strong> Coordinate with doctors and manage multi-specialty bookings.</li>
              <li><strong>Status Tracking:</strong> Keep everyone informed by updating appointment statuses in real-time.</li>
            </ul>
          </div>
        </div>

        <!-- Footer -->
        <div style="padding: 32px; text-align: center; background-color: #f9fafb;">
          <p style="color: #6b7280; font-size: 13px; margin: 0;">This invitation link will expire in 7 days.</p>
          <p style="color: #9ca3af; font-size: 12px; margin: 12px 0 0 0;">&copy; ${new Date().getFullYear()} QuickMed Healthcare Systems. All rights reserved.</p>
        </div>
      </div>
    `;
    return this.sendEmail(to, subject, html);
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
    return this.sendEmail(to, subject, html);
  }
  async sendAdminPasswordResetNotification(to: string, newPassword: string, firstName?: string): Promise<EmailResult> {
    const subject = 'Your Password Has Been Reset - QuickMed';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #16a34a;">Password Reset by Administrator</h2>
        <p>Hello ${firstName || 'there'},</p>
        <p>Your QuickMed account password has been reset by an administrator.</p>
        <p><strong>Your new temporary password is:</strong></p>
        <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; font-family: monospace; font-size: 18px; text-align: center; margin: 20px 0;">
          ${newPassword}
        </div>
        <p>Please use this password to log in. We recommend changing it immediately after logging in.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.FRONTEND_URL || 'http://localhost:4200'}/login" style="background-color: #16a34a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">Login to QuickMed</a>
        </div>
        <p style="color: #6b7280; font-size: 14px;">If you have any questions, please contact your administrator.</p>
      </div>
    `;
    return this.sendEmail(to, subject, html);
  }
}
