import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('admin_themes')
export class Theme {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50, unique: true, default: 'default' })
  name: string;

  @Column({ type: 'varchar', length: 20, default: 'light' })
  mode: 'light' | 'dark';

  // Primary colors
  @Column({ type: 'varchar', length: 7, default: '#10b981' })
  primaryColor: string;

  @Column({ type: 'varchar', length: 7, default: '#059669' })
  primaryHover: string;

  @Column({ type: 'varchar', length: 7, default: '#d1fae5' })
  primaryLight: string;

  // Background colors
  @Column({ type: 'varchar', length: 7, default: '#ffffff' })
  backgroundLight: string;

  @Column({ type: 'varchar', length: 7, default: '#f5f5f5' })
  sidebarBg: string;

  @Column({ type: 'varchar', length: 7, default: '#f0f0f0' })
  backgroundGray: string;

  // Text colors
  @Column({ type: 'varchar', length: 7, default: '#000000' })
  textDark: string;

  @Column({ type: 'varchar', length: 7, default: '#4b5563' })
  textGray: string;

  @Column({ type: 'varchar', length: 7, default: '#6b7280' })
  textMuted: string;

  // Border and shadow
  @Column({ type: 'varchar', length: 7, default: '#e5e5e5' })
  borderColor: string;

  @Column({ type: 'varchar', length: 50, default: '0 2px 5px rgba(0, 0, 0, 0.08)' })
  cardShadow: string;

  // Status colors
  @Column({ type: 'varchar', length: 7, default: '#10b981' })
  statusConfirmed: string;

  @Column({ type: 'varchar', length: 7, default: '#f97316' })
  statusPending: string;

  @Column({ type: 'varchar', length: 7, default: '#3b82f6' })
  statusCompleted: string;

  @Column({ type: 'varchar', length: 7, default: '#ef4444' })
  statusCancelled: string;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
