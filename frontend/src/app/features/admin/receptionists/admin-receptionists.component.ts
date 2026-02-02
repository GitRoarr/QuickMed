import { Component, OnInit, signal, inject } from "@angular/core"
import { CommonModule } from "@angular/common"
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from "@angular/forms"
import { AdminShellComponent } from "../shared/admin-shell"
import { AdminService, User } from "@app/core/services/admin.service"
import { ToastService } from "@app/core/services/toast.service"

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

  receptionists = signal<User[]>([])
  loading = signal(false)
  togglingId = signal<string | null>(null)
  inviteLink = signal<string | null>(null)
  inviteEmail = signal<string | null>(null)
  invitePreviewUrl = signal<string | null>(null)
  filterForm!: FormGroup
  inviteForm!: FormGroup

  ngOnInit(): void {
    this.filterForm = this.fb.group({
      search: [""],
      status: ["all"],
    })

    this.inviteForm = this.fb.group({
      firstName: ["", [Validators.required]],
      lastName: ["", [Validators.required]],
      email: ["", [Validators.required, Validators.email]],
      phoneNumber: [""]
    })

    this.filterForm.valueChanges.subscribe(() => this.loadReceptionists())
    this.loadReceptionists()
  }

  loadReceptionists() {
    const { search, status } = this.filterForm.value
    this.loading.set(true)
    this.adminService
      .getAllUsers(1, 100, "receptionist", search)
      .subscribe({
        next: (res) => {
          let list = res.data || []
          if (status === "active") list = list.filter((u) => u.isActive)
          if (status === "inactive") list = list.filter((u) => !u.isActive)
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

  inviteReceptionist() {
    if (this.inviteForm.invalid) {
      this.inviteForm.markAllAsTouched()
      this.toast.warning("Please fill in all required fields.")
      return
    }

    this.loading.set(true)
    const payload = {
      firstName: this.inviteForm.value.firstName,
      lastName: this.inviteForm.value.lastName,
      email: this.inviteForm.value.email,
      phoneNumber: this.inviteForm.value.phoneNumber || undefined,
    }

    this.adminService.inviteReceptionist(payload).subscribe({
      next: (res) => {
        const msg = res.emailSent
          ? `Invitation sent to ${payload.email}.`
          : `Invitation created. Please share the link manually.`
        this.toast.success(msg)
        if (!res.emailSent && res.inviteLink) {
          this.inviteLink.set(res.inviteLink)
          this.inviteEmail.set(payload.email)
          this.invitePreviewUrl.set(res.previewUrl || null)
        } else {
          this.inviteLink.set(null)
          this.inviteEmail.set(null)
          this.invitePreviewUrl.set(res.previewUrl || null)
        }
        this.inviteForm.reset()
        this.loadReceptionists()
      },
      error: (err) => {
        this.toast.error(err.error?.message || "Unable to send invitation")
        this.loading.set(false)
      },
    })
  }

  toggleActive(user: User) {
    const newStatus = !user.isActive
    this.togglingId.set(user.id)

    this.adminService.setUserActive(user.id, newStatus).subscribe({
      next: () => {
        this.toast.success(`✨ Receptionist ${newStatus ? 'Activated' : 'Deactivated'} Successfully! ✨`)
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
      },
      error: (err) => {
        this.toast.error(err.error?.message || "Failed to delete teammate")
        this.loading.set(false)
      }
    })
  }

  getInitials(user: User) {
    if (!user.firstName || !user.lastName) return "?"
    return `${(user.firstName[0] || "")}${(user.lastName[0] || "")}`.toUpperCase()
  }

  copyInviteLink() {
    const link = this.inviteLink()
    if (!link) return
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(link).then(
        () => this.toast.success('Invite link copied to clipboard.'),
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
      this.toast.success('Invite link copied to clipboard.')
    } catch {
      this.toast.error('Failed to copy invite link.')
    } finally {
      document.body.removeChild(textarea)
    }
  }
}
