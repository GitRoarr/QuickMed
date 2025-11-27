import { Injectable } from '@nestjs/common';

@Injectable()
export class SmsService {
  async sendSms(to: string, message: string): Promise<{ sent: boolean; provider?: string }> {
    // If Twilio env vars configured, try to use Twilio
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER) {
      try {
        // lazy-require to avoid adding twilio as mandatory dependency
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const Twilio = require('twilio');
        const client = new Twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
        await client.messages.create({ body: message, from: process.env.TWILIO_PHONE_NUMBER, to });
        console.log(`[SmsService] Sent SMS to ${to} via Twilio`);
        return { sent: true, provider: 'twilio' };
      } catch (err) {
        console.warn('[SmsService] Twilio send failed, falling back to log', err?.message || err);
        console.log(`[SmsService] SMS to ${to}: ${message}`);
        return { sent: false };
      }
    }

    // No provider configured, just log for development
    console.log(`[SmsService] (dev) SMS to ${to}: ${message}`);
    return { sent: false };
  }
}
