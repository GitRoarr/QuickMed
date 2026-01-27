import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, Index } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';

@Entity('doctor_analytics')
@Index(['doctorId', 'date'], { unique: true })
export class DoctorAnalytics extends BaseEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    doctorId: string;

    @ManyToOne(() => User, { nullable: false })
    doctor: User;

    @Column({ type: 'date' })
    date: Date; // date of these analytics

    @Column({ type: 'int', default: 0 })
    totalPatients: number; // total patients seen

    @Column({ type: 'int', default: 0 })
    completedAppointments: number;

    @Column({ type: 'int', default: 0 })
    missedAppointments: number; // no-shows or cancellations

    @Column({ type: 'int', default: 0 })
    pendingAppointments: number;

    @Column({ type: 'int', default: 0 })
    totalConsultationMinutes: number; // total time spent in consultations

    @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
    averageConsultationMinutes: number; // calculated average

    @Column({ type: 'int', default: 0 })
    videoConsultations: number;

    @Column({ type: 'int', default: 0 })
    inPersonConsultations: number;

    @Column({ type: 'jsonb', nullable: true })
    appointmentTypeBreakdown: { type: string; count: number }[]; // breakdown by appointment type

    @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
    totalRevenue: number; // if tracking revenue
}
