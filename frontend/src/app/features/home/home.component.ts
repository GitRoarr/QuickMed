import { Component, HostListener } from "@angular/core"
import { CommonModule } from "@angular/common"
import { FormsModule } from "@angular/forms"
import { Router, RouterLink } from "@angular/router"
import { AuthService } from "@core/services/auth.service"
import { ThemeService } from "@core/services/theme.service"
import { FeaturedTestimonial, LandingMetricsService, PlatformSummary } from "@core/services/landing-metrics.service"
import { ReviewService } from "@core/services/review.service"
import { UserService } from "@core/services/user.service"
import { OnInit, signal } from "@angular/core"

@Component({
  selector: "app-home",
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: "./home.component.html",
  styleUrls: ["./home.component.css"],
})
export class HomeComponent implements OnInit {
  steps = [
    {
      number: 1,
      title: 'Create Profile',
      description: 'Sign up and complete your health profile to get personalized recommendations.'
    },
    {
      number: 2,
      title: 'Find Specialist',
      description: 'Search by specialty, location, or availability to find your perfect doctor.'
    },
    {
      number: 3,
      title: 'Book & Consult',
      description: 'Confirm your appointment and connect with your doctor instantly via the app.'
    }
  ];

  features = [
    {
      icon: 'bi-calendar-check',
      title: 'Smart Booking',
      description: 'Find and book the best specialists in seconds with our intelligent scheduling system.'
    },
    {
      icon: 'bi-lightning-charge',
      title: 'Instant Access',
      description: 'Zero wait times. Get matched with top-tier doctors in your city instantly.'
    },
    {
      icon: 'bi-shield-check',
      title: 'Secure Vault',
      description: 'Keep your medical history encrypted and safe. Accessible only by you and your doctors.'
    },
    {
      icon: 'bi-camera-video',
      title: 'Virtual Care',
      description: 'Consult with doctors from the comfort of your home via HD video calls.'
    }
  ];
  mobileMenuOpen = false;
  currentUser = this.authService.currentUser
  isDarkMode = this.themeService.isDarkMode
  happyPatients = signal<number | null>(null)
  platformRating = signal<number | null>(null)
  testimonials = signal<FeaturedTestimonial[]>([])
  reviewModalOpen = signal(false)
  reviewRating = signal(0)
  reviewHover = signal(0)
  reviewText = signal('')
  reviewSubmitting = signal(false)
  reviewError = signal<string | null>(null)
  reviewSuccess = signal(false)
  reviewSubmitted = signal(false)
  reviewCharLimit = 500
  doctorOptions = signal<{ id: string; name: string }[]>([])
  selectedDoctorId = signal<string | null>(null)
  editProfileOpen = signal(false)
  profileDropdownOpen = signal(false) // <-- ADD THIS
  profileSubmitting = signal(false)
  profileError = signal<string | null>(null)
  avatarPreview = signal<string | null>(null)
  profileFirstName = signal('')
  profileLastName = signal('')
  profileEmail = signal('')
  profilePhone = signal('')
  profileSpecialty = signal('')
  profileBio = signal('')
  isScrolled = signal(false)
  private selectedAvatarFile: File | null = null

  @HostListener('window:scroll', [])
  onWindowScroll() {
    this.isScrolled.set(window.scrollY > 20)
  }

  constructor(
    private authService: AuthService,
    private router: Router,
    private themeService: ThemeService,
    private landingMetrics: LandingMetricsService,
    private reviewService: ReviewService,
    private userService: UserService,
  ) { }

  ngOnInit(): void {
    this.loadSummary()
    this.loadTestimonials()
    this.preloadDoctors()
    this.syncReviewSubmissionState()
  }

  private loadSummary(): void {
    this.landingMetrics.getSummary().subscribe({
      next: (summary: PlatformSummary) => {
        this.happyPatients.set(summary.happyPatients)
        this.platformRating.set(summary.average)
      },
      error: (err) => {
        console.error('Failed to load platform summary', err)
      },
    })
  }

  private loadTestimonials(): void {
    this.landingMetrics.getFeaturedTestimonials(3).subscribe({
      next: (testimonials: FeaturedTestimonial[]) => {
        const normalized = (testimonials || []).map((t) => ({
          ...t,
          comment: (t.comment || '').trim() || 'Great experience with our team.',
        }))
        this.testimonials.set(normalized)
      },
      error: (err) => {
        console.error('Failed to load testimonials', err)
      },
    })
  }

  private preloadDoctors(): void {
    this.userService.getDoctors().subscribe({
      next: (docs: any[]) => {
        const mapped = (docs || []).map((d) => ({
          id: d.id,
          name: `${d.firstName ?? ''} ${d.lastName ?? ''}`.trim() || 'Doctor',
        }))
        this.doctorOptions.set(mapped)
        this.selectedDoctorId.set(mapped[0]?.id ?? null)
      },
      error: (err) => {
        console.error('Failed to load doctors for reviews', err)
        this.doctorOptions.set([])
        this.selectedDoctorId.set(null)
      },
    })
  }

  isHomePage(): boolean {
    try {
      const url = this.router.url || '';
      return url === '/' || url === '' || url.startsWith('/?');
    } catch (e) {
      return false;
    }
  }

  logout(): void {
    this.closeProfileDropdown();
    this.authService.logout();
  }


  toggleTheme(): void {
    this.themeService.toggleTheme()
  }

  openReviewModal(): void {
    const user = this.currentUser()
    if (!user) {
      this.router.navigate(['/login'], { queryParams: { redirect: '/' } })
      return
    }
    if (this.reviewSubmitted()) {
      return
    }
    this.reviewError.set(null)
    this.reviewSuccess.set(false)
    this.reviewRating.set(0)
    this.reviewHover.set(0)
    this.reviewText.set('')
    if (!this.selectedDoctorId()) {
      this.preloadDoctors()
    }
    this.reviewModalOpen.set(true)
  }

  closeReviewModal(): void {
    this.reviewModalOpen.set(false)
  }

  setReviewHover(value: number): void {
    this.reviewHover.set(value)
  }

  setReviewRating(value: number): void {
    this.reviewRating.set(value)
  }

  get reviewCharCount(): number {
    return this.reviewText().length
  }

  canSubmitReview(): boolean {
    return (
      !this.reviewSubmitting() &&
      this.reviewRating() > 0 &&
      this.reviewText().trim().length >= 10 &&
      !!this.selectedDoctorId()
    )
  }

  submitReview(): void {
    if (!this.canSubmitReview()) {
      this.reviewError.set('Please add a rating, a review (10+ characters), and ensure a doctor is available.')
      return
    }

    const doctorId = this.selectedDoctorId()
    if (!doctorId) {
      this.reviewError.set('No doctor available to attach this review. Please try again later.')
      return
    }

    this.reviewSubmitting.set(true)
    this.reviewError.set(null)

    this.reviewService
      .create({
        doctorId,
        rating: this.reviewRating(),
        comment: this.reviewText().trim(),
      })
      .subscribe({
        next: () => {
          this.markReviewSubmitted()
          this.reviewSubmitting.set(false)
          this.reviewSuccess.set(true)
          this.reviewModalOpen.set(false)
          this.loadTestimonials()
        },
        error: (err) => {
          console.error('Failed to submit review', err)
          const msg = err?.error?.message || 'Failed to submit review. Please try again.'
          this.reviewError.set(msg)
          this.reviewSubmitting.set(false)
        },
      })
  }

  private syncReviewSubmissionState(): void {
    const user = this.currentUser()
    if (!user) {
      this.reviewSubmitted.set(false)
      return
    }
    const stored = localStorage.getItem(`review_submitted_${user.id}`)
    this.reviewSubmitted.set(stored === 'true')
  }

  private markReviewSubmitted(): void {
    const user = this.currentUser()
    if (!user) return
    localStorage.setItem(`review_submitted_${user.id}`, 'true')
    this.reviewSubmitted.set(true)
  }
  openEditProfile(): void {
    this.closeProfileDropdown();
    const user = this.currentUser()
    if (!user) {
      this.router.navigate(['/login'], { queryParams: { redirect: '/' } })
      return
    }
    this.profileError.set(null)
    this.profileSubmitting.set(false)
    this.avatarPreview.set(user.avatar || null)
    this.selectedAvatarFile = null
    this.profileFirstName.set(user.firstName || '')
    this.profileLastName.set(user.lastName || '')
    this.profileEmail.set(user.email || '')
    this.profilePhone.set(user.phoneNumber || '')
    this.profileSpecialty.set(user.specialty || '')
    this.profileBio.set(user.bio || '')
    this.editProfileOpen.set(true)
  }
  toggleProfileDropdown(): void { // <-- ADD THIS
    this.profileDropdownOpen.set(!this.profileDropdownOpen())
  }

  closeProfileDropdown(): void { // <-- ADD THIS
    this.profileDropdownOpen.set(false)
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void { // <-- ADD THIS
    const target = event.target as HTMLElement
    const insideTrigger = target.closest('.profile-dropdown-container')
    const insidePanel = target.closest('.profile-dropdown-panel')
    if (!insideTrigger && !insidePanel) {
      this.closeProfileDropdown()
    }
  }

  closeEditProfile(): void {
    this.editProfileOpen.set(false)
  }

  navigateToDashboard(): void {
    this.closeProfileDropdown() // <-- ADD THIS
    const user = this.currentUser()
    if (!user) {
      this.router.navigate(["/login"])
      return
    }
    switch (user.role) {
      case "patient":
        this.router.navigate(["/patient/dashboard"])
        break
      case "doctor":
        this.router.navigate(["/doctor/dashboard"])
        break
      case "admin":
        this.router.navigate(["/admin/dashboard"])
        break
      case "receptionist":
        this.router.navigate(["/receptionist/dashboard"])
        break
    }
  }

  navigateToProfile(): void {
    const user = this.currentUser()
    if (!user) {
      this.router.navigate(['/login'])
      return
    }
    switch (user.role) {
      case 'patient':
        this.router.navigate(['/patient/profile'])
        break
      case 'doctor':
        this.router.navigate(['/doctor/settings'])
        break
      case 'admin':
        this.router.navigate(['/admin/dashboard'])
        break
      case 'receptionist':
        this.router.navigate(['/receptionist/dashboard'])
        break
      default:
        this.router.navigate(['/'])
        break
    }
  }
  getUserAvatar(): string {
    const user = this.currentUser()
    return user?.avatar || 'assets/images/profile-placeholder.png'
  }
  getInitials(firstName?: string, lastName?: string): string {
    if (!firstName && !lastName) return '?'
    const firstInitial = firstName ? firstName.charAt(0).toUpperCase() : ''
    const lastInitial = lastName ? lastName.charAt(0).toUpperCase() : ''
    return `${firstInitial}${lastInitial}`
  }
  navbarClasses() {
    return {
      "bg-light": !this.isDarkMode(),
      "bg-dark": this.isDarkMode(),
      "navbar-light": !this.isDarkMode(),
      "navbar-dark": this.isDarkMode(),
      "text-dark": !this.isDarkMode(),
      "text-white": this.isDarkMode(),
    };
  }

  getStarArray(rating: number): number[] {
    return Array.from({ length: 5 }, (_, idx) => idx < rating ? 1 : 0);
  }

  trackTestimonial(_index: number, testimonial: FeaturedTestimonial): string {
    return testimonial.id;
  }
  onAvatarSelected(event: Event): void {
    const input = event.target as HTMLInputElement
    const file = input.files?.[0] || null
    this.selectedAvatarFile = file
    if (file) {
      const url = URL.createObjectURL(file)
      this.avatarPreview.set(url)
    }
  }

  canSubmitProfile(): boolean {
    return !this.profileSubmitting()
      && this.profileFirstName().trim().length > 0
      && this.profileLastName().trim().length > 0
  }

  submitProfile(): void {
    const user = this.currentUser()
    if (!user) {
      this.router.navigate(['/login'])
      return
    }
    if (!this.canSubmitProfile()) {
      this.profileError.set('Please fill in required fields (first and last name).')
      return
    }
    this.profileSubmitting.set(true)
    this.profileError.set(null)

    const updatePayload: any = {
      firstName: this.profileFirstName().trim(),
      lastName: this.profileLastName().trim(),
      email: this.profileEmail().trim() || undefined,
      phoneNumber: this.profilePhone().trim() || undefined,
    }
    if (user.role === 'doctor') {
      updatePayload.specialty = this.profileSpecialty().trim() || undefined
      updatePayload.bio = this.profileBio().trim() || undefined
    }

    this.userService.update(user.id, updatePayload).subscribe({
      next: (updatedUser) => {
        if (this.selectedAvatarFile) {
          this.userService.updateAvatar(user.id, this.selectedAvatarFile).subscribe({
            next: (avatarUser) => {
              this.authService.setUser(avatarUser)
              this.profileSubmitting.set(false)
              this.editProfileOpen.set(false)
            },
            error: (err) => {
              console.error('Failed to update avatar', err)
              const msg = err?.error?.message || 'Failed to upload avatar.'
              this.profileError.set(msg)
              this.profileSubmitting.set(false)
            },
          })
        } else {
          this.authService.setUser(updatedUser)
          this.profileSubmitting.set(false)
          this.editProfileOpen.set(false)
        }
      },
      error: (err) => {
        console.error('Failed to update profile', err)
        const msg = err?.error?.message || 'Failed to update profile.'
        this.profileError.set(msg)
        this.profileSubmitting.set(false)
      },
    })
  }

}
