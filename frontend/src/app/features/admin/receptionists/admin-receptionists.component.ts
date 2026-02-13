import { Component, OnInit, signal, inject, computed, effect } from "@angular/core"
import { CommonModule } from "@angular/common"
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from "@angular/forms"
import { AdminShellComponent } from "../shared/admin-shell"
import { AdminService, User } from "@app/core/services/admin.service"
import { ToastService } from "@app/core/services/toast.service"

interface InvitationRecord {
  id: string
  firstName: string
  lastName: string
  email: string
  phoneNumber?: string
  department?: string
  status: 'pending' | 'accepted' | 'expired' | 'revoked'
  createdAt: string
  expiresAt: string
  acceptedAt?: string
  resendCount: number
  emailDelivered: boolean
  invitedBy?: { firstName: string; lastName: string }
  acceptedUserId?: string
}

@Component({
  selector: "app-admin-receptionists",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, AdminShellComponent],
  templateUrl: "./admin-receptionists.component.html",
  styleUrls: ["./admin-receptionists.component.scss"],
})
export class AdminReceptionistsComponent implements OnInit {
  private adminService = inject(AdminService)
  private fb = inject(FormBuilder)
  private toast = inject(ToastService)

  // State signals
  receptionists = signal<User[]>([])
  invitations = signal<InvitationRecord[]>([])
  loading = signal(false)
  inviteLoading = signal(false)
  togglingId = signal<string | null>(null)
  actionLoadingId = signal<string | null>(null)
  inviteLink = signal<string | null>(null)
  inviteEmail = signal<string | null>(null)
  invitePreviewUrl = signal<string | null>(null)
  selectedUser = signal<User | null>(null)
  modalMode = signal<'invite' | 'edit'>('invite')

  // Modal state
  showInviteModal = signal(false)
  showBulkModal = signal(false)
  showRevokeModal = signal(false)
  showMoreMenuId = signal<string | null>(null)
  revokeTarget = signal<{ id: string, name: string } | null>(null)
  inviteStep = signal<'form' | 'success'>('form')

  // Stats
  inviteStats = signal<{
    pending: number
    accepted: number
    expired: number
    revoked: number
    totalSent: number
    acceptanceRate: number
    averageAcceptanceTimeHours: number
  }>({ pending: 0, accepted: 0, expired: 0, revoked: 0, totalSent: 0, acceptanceRate: 0, averageAcceptanceTimeHours: 0 })

  // Active tab
  activeTab = signal<'members' | 'invitations'>('members')
  invitationFilter = signal<string>('all')

  constructor() {
    effect(() => {
   6   // Accessing the signal to create a dependency
      this.invitationFilter();
      this.loadInvitations();
    });
  }

  // Forms
  filterForm!: FormGroup
  inviteForm!: FormGroup
  revokeForm!: FormGroup
  bulkInvites = signal<Array<{ firstName: string; lastName: string; email: string; phoneNumber: string }>>([])

  // Computed
  filteredInvitations = computed(() => {
    // Note: We are now using server-side filtering for Invitations as well
    return this.invitations()
  })

  pendingReceptionists = computed(() => {
    return this.receptionists().filter(u => u.isActive && (u as any).mustChangePassword)
  })

  activeReceptionists = computed(() => {
    return this.receptionists().filter(u => u.isActive)
  })

  ngOnInit(): void {
    this.filterForm = this.fb.group({
      search: [""],
      status: ["all"],
    })

    this.inviteForm = this.fb.group({
      firstName: ["", [Validators.required, Validators.minLength(2)]],
      lastName: ["", [Validators.required, Validators.minLength(2)]],
      email: ["", [Validators.required, Validators.email]],
      phoneNumber: [""],
      department: [""],
      personalMessage: [""],
    })

    this.revokeForm = this.fb.group({
      reason: [""],
    })

    this.filterForm.valueChanges.subscribe(() => {
      this.loadReceptionists()
    })

    this.loadReceptionists()
    this.loadInvitationStats()
    this.loadInvitations()
  }

  // ============================================================
  // Data Loading - Fully Backend Driven
  // ============================================================

  loadReceptionists() {
    const { search, status } = this.filterForm.value
    this.loading.set(true)

    // Server-side filtering via search parameter
    this.adminService
      .getAllUsers(1, 100, "receptionist", search)
      .subscribe({
        next: (res) => {
          let list = res.data || []

          // Additional layer of logic for 'mustChangePassword' state
          if (status === "active") list = list.filter((u) => u.isActive && !(u as any).mustChangePassword)
          if (status === "inactive") list = list.filter((u) => !u.isActive)
          if (status === "pending") list = list.filter((u) => u.isActive && (u as any).mustChangePassword)

          this.receptionists.set(list)
          this.loading.set(false)
        },
        error: (err) => {
          console.error("Failed to load receptionists", err)
          this.toast.error(err.error?.message || "Failed to load team members")
          this.loading.set(false)
        },
      })
  }

  loadInvitationStats() {
    this.adminService.getReceptionistInvitationStats().subscribe({
      next: (stats) => {
        this.inviteStats.set(stats)
      },
      error: () => { },
    })
  }

  loadInvitations() {
    const filter = this.invitationFilter()
    this.adminService.listReceptionistInvitations({
      limit: 100,
      status: filter !== 'all' ? filter : undefined
    }).subscribe({
      next: (res) => {
        this.invitations.set(res.invitations || [])
      },
      error: () => { },
    })
  }

  // ============================================================
  // Invitation Actions
  // ============================================================

  openInviteModal() {
    this.selectedUser.set(null)
    this.modalMode.set('invite')
    this.inviteForm.reset()
    this.inviteStep.set('form')
    this.inviteLink.set(null)
    this.inviteEmail.set(null)
    this.invitePreviewUrl.set(null)
    this.showInviteModal.set(true)
  }

  openEditModal(user: User) {
    this.selectedUser.set(user)
    this.modalMode.set('edit')
    this.inviteStep.set('form')
    this.inviteForm.patchValue({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phoneNumber: user.phoneNumber || '',
      department: (user as any).department || '',
    })
    this.showInviteModal.set(true)
  }

  closeInviteModal() {
    this.showInviteModal.set(false)
    this.inviteStep.set('form')
    this.selectedUser.set(null)
  }

  handleInviteSubmit() {
    if (this.modalMode() === 'invite') {
      this.inviteReceptionist()
    } else {
      this.updateReceptionist()
    }
  }

  updateReceptionist() {
    const user = this.selectedUser()
    if (!user || this.inviteForm.invalid) return

    this.inviteLoading.set(true)
    const payload = {
      firstName: this.inviteForm.value.firstName.trim(),
      lastName: this.inviteForm.value.lastName.trim(),
      email: this.inviteForm.value.email.trim().toLowerCase(),
      phoneNumber: this.inviteForm.value.phoneNumber?.trim() || null,
      department: this.inviteForm.value.department?.trim() || null,
    }

    this.adminService.updateUser(user.id, payload).subscribe({
      next: () => {
        this.toast.success(`Updated ${payload.firstName} successfully!`)
        this.closeInviteModal()
        this.inviteLoading.set(false)
        this.loadReceptionists()
      },
      error: (err) => {
        this.toast.error(err.error?.message || "Update failed")
        this.inviteLoading.set(false)
      }
    })
  }

  inviteReceptionist() {
    if (this.inviteForm.invalid) {
      this.inviteForm.markAllAsTouched()
      this.toast.warning("Please fill in all required fields correctly.")
      return
    }

    this.inviteLoading.set(true)
    const payload = {
      firstName: this.inviteForm.value.firstName.trim(),
      lastName: this.inviteForm.value.lastName.trim(),
      email: this.inviteForm.value.email.trim().toLowerCase(),
      phoneNumber: this.inviteForm.value.phoneNumber?.trim() || undefined,
      department: this.inviteForm.value.department?.trim() || undefined,
      personalMessage: this.inviteForm.value.personalMessage?.trim() || undefined,
    }

    this.adminService.inviteReceptionist(payload).subscribe({
      next: (res) => {
        const msg = res.emailSent
          ? `🎉 Invitation sent to ${payload.email}!`
          : `✅ Invitation created. Share the link manually.`
        this.toast.success(msg)

        if (!res.emailSent && res.inviteLink) {
          this.inviteLink.set(res.inviteLink)
          this.inviteEmail.set(payload.email)
        } else {
          this.inviteLink.set(null)
          this.inviteEmail.set(null)
        }
        this.invitePreviewUrl.set(res.previewUrl || null)
        this.inviteStep.set('success')
        this.inviteLoading.set(false)
        this.loadReceptionists()
        this.loadInvitationStats()
        this.loadInvitations()
      },
      error: (err) => {
        this.toast.error(err.error?.message || "Unable to send invitation")
        this.inviteLoading.set(false)
      },
    })
  }

  resendInvite(user: User) {
    this.actionLoadingId.set(user.id)
    this.adminService.resendReceptionistInvite(user.id).subscribe({
      next: (res) => {
        const msg = res.emailSent
          ? `📧 Invitation resent to ${user.email}`
          : `✅ New invite link generated. Share it manually.`
        this.toast.success(msg)
        if (!res.emailSent && res.inviteLink) {
          this.inviteLink.set(res.inviteLink)
          this.inviteEmail.set(user.email)
          this.showInviteModal.set(true)
          this.inviteStep.set('success')
        }
        this.actionLoadingId.set(null)
        this.loadReceptionists()
        this.loadInvitationStats()
        this.loadInvitations()
      },
      error: (err) => {
        this.toast.error(err.error?.message || "Failed to resend invitation")
        this.actionLoadingId.set(null)
      },
    })
  }

  openRevokeModal(target: User | InvitationRecord) {
    const id = (target as User).id || (target as InvitationRecord).acceptedUserId
    const name = (target as User).firstName ? `${(target as User).firstName} ${(target as User).lastName}` : `${(target as InvitationRecord).firstName} ${(target as InvitationRecord).lastName}`

    if (!id) {
      this.toast.error("User ID not found for this invitation")
      return
    }

    this.revokeTarget.set({ id, name })
    this.revokeForm.reset()
    this.showRevokeModal.set(true)
  }

  closeRevokeModal() {
    this.showRevokeModal.set(false)
    this.revokeTarget.set(null)
  }

  confirmRevoke() {
    const target = this.revokeTarget()
    if (!target) return

    this.actionLoadingId.set(target.id)
    const reason = this.revokeForm.value.reason || undefined

    this.adminService.revokeReceptionistInvite(target.id, reason).subscribe({
      next: (res) => {
        this.toast.success(res.message || "Invitation revoked successfully.")
        this.closeRevokeModal()
        this.actionLoadingId.set(null)
        this.loadReceptionists()
        this.loadInvitationStats()
        this.loadInvitations()
      },
      error: (err) => {
        this.toast.error(err.error?.message || "Failed to revoke invitation")
        this.actionLoadingId.set(null)
      },
    })
  }

  // ============================================================
  // User Actions
  // ============================================================

  toggleActive(user: User) {
    const newStatus = !user.isActive
    this.togglingId.set(user.id)

    this.adminService.setUserActive(user.id, newStatus).subscribe({
      next: () => {
        this.toast.success(`✨ ${user.firstName} ${newStatus ? 'Activated' : 'Deactivated'} Successfully!`)
        this.loadReceptionists()
        this.togglingId.set(null)
      },
      error: (err) => {
        this.toast.error(err.error?.message || "Failed to update status")
        this.togglingId.set(null)
      }
    })
  }

  removeReceptionist(id: string) {
    if (!confirm("Are you sure you want to remove this receptionist? This action cannot be undone.")) return

    this.loading.set(true)
    this.adminService.deleteUser(id).subscribe({
      next: () => {
        this.toast.success("Receptionist removed successfully.")
        this.loadReceptionists()
        this.loadInvitationStats()
      },
      error: (err) => {
        this.toast.error(err.error?.message || "Failed to delete teammate")
        this.loading.set(false)
      }
    })
  }

  // ============================================================
  // Bulk Invite
  // ============================================================

  openBulkModal() {
    this.bulkInvites.set([{ firstName: '', lastName: '', email: '', phoneNumber: '' }])
    this.showBulkModal.set(true)
  }

  closeBulkModal() {
    this.showBulkModal.set(false)
  }

  addBulkRow() {
    this.bulkInvites.update(list => [...list, { firstName: '', lastName: '', email: '', phoneNumber: '' }])
  }

  removeBulkRow(index: number) {
    this.bulkInvites.update(list => list.filter((_, i) => i !== index))
  }

  updateBulkRow(index: number, field: string, value: string) {
    this.bulkInvites.update(list => {
      const updated = [...list]
      updated[index] = { ...updated[index], [field]: value }
      return updated
    })
  }

  submitBulkInvite() {
    const invites = this.bulkInvites().filter(i => i.firstName && i.lastName && i.email)
    if (invites.length === 0) {
      this.toast.warning("Please add at least one valid invite.")
      return
    }

    this.inviteLoading.set(true)
    this.adminService.bulkInviteReceptionists(invites).subscribe({
      next: (res) => {
        if (res.summary.succeeded > 0) {
          this.toast.success(`🎉 ${res.summary.succeeded} of ${res.summary.total} invitations sent successfully!`)
        }
        if (res.summary.failed > 0) {
          const failedEmails = res.failed.map((f: any) => `${f.email}: ${f.reason}`).join('\n')
          this.toast.error(`${res.summary.failed} invitations failed:\n${failedEmails}`)
        }
        this.closeBulkModal()
        this.inviteLoading.set(false)
        this.loadReceptionists()
        this.loadInvitationStats()
        this.loadInvitations()
      },
      error: (err) => {
        this.toast.error(err.error?.message || "Bulk invite failed")
        this.inviteLoading.set(false)
      },
    })
  }

  // ============================================================
  // Helpers
  // ============================================================

  getInitials(user: any) {
    const first = user.firstName?.[0] || user.first_name?.[0] || ""
    const last = user.lastName?.[0] || user.last_name?.[0] || ""
    return `${first}${last}`.toUpperCase() || "?"
  }

  copyInviteLink() {
    const link = this.inviteLink()
    if (!link) return
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(link).then(
        () => this.toast.success('✅ Invite link copied to clipboard!'),
        () => this.toast.error('Failed to copy invite link.')
      )
      return
    }
    const textarea = document.createElement('textarea')
    textarea.value = link
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.focus()
    textarea.select()
    try {
      document.execCommand('copy')
      this.toast.success('✅ Invite link copied to clipboard!')
    } catch {
      this.toast.error('Failed to copy invite link.')
    } finally {
      document.body.removeChild(textarea)
    }
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'pending': return '#f59e0b'
      case 'accepted': return '#10b981'
      case 'expired': return '#6b7280'
      case 'revoked': return '#ef4444'
      default: return '#6b7280'
    }
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'pending': return 'Pending'
      case 'accepted': return 'Accepted'
      case 'expired': return 'Expired'
      case 'revoked': return 'Revoked'
      default: return status
    }
  }

  getTimeAgo(date: string): string {
    if (!date) return ''
    const now = new Date()
    const then = new Date(date)
    const diff = now.getTime() - then.getTime()
    const minutes = Math.floor(diff / 60000)
    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    if (days < 30) return `${days}d ago`
    return then.toLocaleDateString()
  }

  isPending(user: User): boolean {
    return user.isActive && !!(user as any).mustChangePassword
  }

  setActiveTab(tab: 'members' | 'invitations') {
    this.activeTab.set(tab)
    if (tab === 'invitations') {
      this.loadInvitations()
    }
  }
}
