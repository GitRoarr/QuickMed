import { Injectable, InternalServerErrorException } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: +process.env.SMTP_PORT,
      secure: false, 
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  async sendMail(to: string, subject: string, html: string) {
    try {
      await this.transporter.sendMail({
        from: `"Clinic Admin" <${process.env.SMTP_USER}>`,
        to,
        subject,
        html,
      });
    } catch (err) {
      console.error('Email sending error:', err);
      throw new InternalServerErrorException('Failed to send email');
    }
  }

  async sendDoctorInvite(to: string, inviteLink: string) {
    const subject = 'Your Doctor Account Invitation';
    const html = `
      <h3>Welcome!</h3>
      <p>You have been invited as a doctor. Click the link below to set your password and activate your account:</p>
      <a href="${inviteLink}">Set Your Password</a>
      <p>The link expires in 7 days.</p>
    `;
    await this.sendMail(to, subject, html);
  }
}
