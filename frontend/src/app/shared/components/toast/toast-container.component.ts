import { CommonModule } from '@angular/common'
import { Component, computed, inject } from '@angular/core'
import { ToastService, ToastOptions, ToastPosition } from '@core/services/toast.service'

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './toast-container.component.html',
  styleUrls: ['./toast-container.component.css'],
})
export class ToastContainerComponent {
  private toastService = inject(ToastService)

  positions: ToastPosition[] = ['top-right', 'top-left', 'bottom-right', 'bottom-left']

  toastsByPosition = computed(() => {
    const grouped: Record<ToastPosition, ToastOptions[]> = {
      'top-right': [],
      'top-left': [],
      'bottom-right': [],
      'bottom-left': [],
    }
    this.toastService.toasts().forEach((t) => grouped[t.position].push(t))
    return grouped
  })

  dismiss(id: string) {
    this.toastService.dismiss(id)
  }
}
