import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';

export enum InviteStatus {
    PENDING = 'pending',
    ACCEPTED = 'accepted',
    EXPIRED = 'expired',
    REVOKED = 'revoked',
}

@Entity('receptionist_invitations')
export class ReceptionistInvitation extends BaseEntity {
    @Column()
    firstName: string;

    @Column()
    lastName: string;

    @Column()
    email: string;

    @Column({ nullable: true })
    phoneNumber: string;

    @Column({ nullable: true })
    department: string;

    @Column({ nullable: true })
    personalMessage: string;

    @Column()
    inviteToken: string;

    @Column({ type: 'timestamp' })
    expiresAt: Date;

    @Column({
        type: 'enum',
        enum: InviteStatus,
        default: InviteStatus.PENDING,
    })
    status: InviteStatus;

    @Column({ nullable: true })
    invitedById: string;

    @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
    @JoinColumn({ name: 'invitedById' })
    invitedBy: User;

    @Column({ nullable: true })
    acceptedUserId: string;

    @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
    @JoinColumn({ name: 'acceptedUserId' })
    acceptedUser: User;

    @Column({ type: 'timestamp', nullable: true })
    acceptedAt: Date;

    @Column({ type: 'timestamp', nullable: true })
    revokedAt: Date;

    @Column({ nullable: true })
    revokeReason: string;

    @Column({ type: 'int', default: 0 })
    resendCount: number;

    @Column({ type: 'timestamp', nullable: true })
    lastResentAt: Date;

    @Column({ type: 'boolean', default: false })
    emailDelivered: boolean;

    @Column({ nullable: true })
    ipAddress: string;
}
