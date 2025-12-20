import { Component } from "@angular/core"
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
  reviewCharLimit = 500
  doctorOptions = signal<{ id: string; name: string }[]>([])
  selectedDoctorId = signal<string | null>(null)

  constructor(
    private authService: AuthService,
    private router: Router,
    private themeService: ThemeService,
    private landingMetrics: LandingMetricsService,
    private reviewService: ReviewService,
    private userService: UserService,
  ) {}

  ngOnInit(): void {
    this.loadSummary()
    this.loadTestimonials()
    this.preloadDoctors()
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
        const normalized = (testimonials || [])
          .map((t) => ({
            ...t,
            comment: (t.comment || '').trim(),
          }))
          .filter((t) => t.comment.length > 0)

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
    this.authService.logout()
  }

  navigateToDashboard(): void {
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
    }
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


}
