import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationTemplate } from './entities/notification-template.entity';

@Injectable()
export class NotificationsSeedService implements OnModuleInit {
  private readonly logger = new Logger(NotificationsSeedService.name);

  constructor(
    @InjectRepository(NotificationTemplate)
    private readonly templateRepository: Repository<NotificationTemplate>,
  ) {}

  async onModuleInit() {
    try {
      const count = await this.templateRepository.count();
      if (count > 0) {
        this.logger.debug('Notification templates already exist, skipping seeder.');
        return;
      }

      const templates: Partial<NotificationTemplate>[] = [
        {
          name: 'appointment_reminder_30m',
          type: 'appointment',
          subject: "Your doctor is ready for you! ⏳",
          message:
            'Your doctor is ready for you! ⏳ Don\'t forget your appointment in {{reminderMinutes}} minutes.',
          variables: ['reminderMinutes', 'appointmentDate', 'appointmentTime', 'doctorName'],
          isActive: true,
        },
        {
          name: 'appointment_confirmed',
          type: 'appointment',
          subject: 'Appointment confirmed! 💚',
          message: "Appointment confirmed! 💚 We\'ll remind you when it\'s time.",
          variables: ['appointmentDate', 'appointmentTime', 'doctorName'],
          isActive: true,
        },
        {
          name: 'appointment_rescheduled',
          type: 'appointment',
          subject: 'Appointment Rescheduled 🔁',
          message: 'Your appointment has been rescheduled. New time: {{appointmentDate}} at {{appointmentTime}} 🔒',
          variables: ['appointmentDate', 'appointmentTime'],
          isActive: true,
        },
        {
          name: 'prescription_new',
          type: 'prescription',
          subject: 'New prescription added 💊',
          message: 'New prescription added to your profile. Stay healthy 💊✨ — {{medicationName}}',
          variables: ['medicationName', 'prescriptionId'],
          isActive: true,
        },
        {
          name: 'prescription_time_to_take',
          type: 'prescription',
          subject: 'Medication Reminder ❤️',
          message: "It\'s time to take your medicine! Your health matters ❤️ — {{medicationName}}",
          variables: ['medicationName', 'dosage'],
          isActive: true,
        },
        {
          name: 'test_results_available',
          type: 'test_result',
          subject: 'Lab Results Ready 🩺📊',
          message: 'Your lab results are in! Tap to view your health insights: {{testName}}',
          variables: ['testName', 'testResultId'],
          isActive: true,
        },
        {
          name: 'doctor_reply',
          type: 'message',
          subject: 'Your doctor just replied! 💬',
          message: 'Your doctor just replied! 💬 Tap to check your message.',
          variables: ['conversationId', 'doctorName'],
          isActive: true,
        },
        {
          name: 'follow_up_recommended',
          type: 'system',
          subject: 'Follow-up Recommended ❤️‍🩹',
          message: 'Reminder: Follow-up visit recommended for better recovery ❤️‍🩹.',
          variables: ['patientId'],
          isActive: true,
        },
        {
          name: 'heartbeat_flash',
          type: 'system',
          subject: 'QuickMed Heartbeat ❤️🔔',
          message: 'QuickMed: Your health heartbeat has an update ❤️🔔.',
          variables: [],
          isActive: true,
        },
        {
          name: 'daily_wellness_tip',
          type: 'system',
          subject: 'Daily Wellness Tip 🌿✨',
          message: "Healthy mind, healthy body! Today\'s tip: {{tip}}",
          variables: ['tip'],
          isActive: true,
        },
      ];

      for (const t of templates) {
        const template = this.templateRepository.create(t as any);
        await this.templateRepository.save(template);
      }

      this.logger.log(`Seeded ${templates.length} notification templates.`);
    } catch (err) {
      this.logger.error('Failed to seed notification templates', err as any);
    }
  }
}
