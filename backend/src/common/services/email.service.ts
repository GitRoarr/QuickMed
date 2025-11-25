import { Injectable, InternalServerErrorException } from "@nestjs/common";
import * as nodemailer from "nodemailer";

interface EmailResult {
  sent: boolean;
  fallbackLink?: string;
}

@Injectable()
export class EmailService {
  private transporter;

  constructor() {
    // Only create transporter if SMTP is configured
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: +process.env.SMTP_PORT || 587,
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
    } else {
      console.warn("[EmailService] SMTP not configured. Email sending will be disabled.");
      this.transporter = null;
    }
  }

  async sendMail(to: string, subject: string, html: string): Promise<EmailResult> {
    if (!this.transporter) {
      console.log(`[EmailService] Email would be sent to ${to}: ${subject}`);
      return { sent: false, fallbackLink: html.match(/href="([^"]+)"/)?.[1] };
    }

    try {
      await this.transporter.sendMail({
        from: `"Clinic Admin" <${process.env.SMTP_USER}>`,
        to,
        subject,
        html,
      });
      console.log(`[EmailService] Email sent successfully to ${to}`);
      return { sent: true };
    } catch (err) {
      console.error("Email sending error:", err);
      // In development, log the link instead of throwing
      if (process.env.NODE_ENV === "development") {
        console.log(`[EmailService] Development mode - Invite link: ${html.match(/href="([^"]+)"/)?.[1] || "N/A"}`);
        return { sent: false, fallbackLink: html.match(/href="([^"]+)"/)?.[1] };
      }
      throw new InternalServerErrorException("Failed to send email");
    }
  }

  async sendDoctorInvite(to: string, inviteLink: string): Promise<EmailResult> {
    const subject = "Your Doctor Account Invitation";
    const html = `
      <h3>Welcome!</h3>
      <p>You have been invited as a doctor. Click the link below to set your password and activate your account:</p>
      <a href="${inviteLink}">Set Your Password</a>
      <p>The link expires in 7 days.</p>
    `;
    return this.sendMail(to, subject, html);
  }
}
