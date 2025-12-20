import { Injectable, signal } from '@angular/core'

export type ToastKind = 'success' | 'error' | 'info' | 'warning'
export type ToastPosition = 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'

export interface ToastOptions {
  id: string
  title?: string
  message: string
  kind: ToastKind
  duration: number
  dismissible: boolean
  position: ToastPosition
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private queue = signal<ToastOptions[]>([])
  private timers = new Map<string, ReturnType<typeof setTimeout>>()

  toasts = this.queue.asReadonly()

  success(message: string, opts: Partial<ToastOptions> = {}) {
    this.push({ message, kind: 'success', title: opts.title ?? 'Success' }, opts)
  }

  error(message: string, opts: Partial<ToastOptions> = {}) {
    this.push({ message, kind: 'error', title: opts.title ?? 'Error' }, opts)
  }

  info(message: string, opts: Partial<ToastOptions> = {}) {
    this.push({ message, kind: 'info', title: opts.title ?? 'Heads up' }, opts)
  }

  warning(message: string, opts: Partial<ToastOptions> = {}) {
    this.push({ message, kind: 'warning', title: opts.title ?? 'Warning' }, opts)
  }

  dismiss(id: string) {
    this.clearTimer(id)
    this.queue.update((items) => items.filter((t) => t.id !== id))
  }

  clear(position?: ToastPosition) {
    if (!position) {
      this.queue().forEach((t) => this.clearTimer(t.id))
      this.queue.set([])
      return
    }
    this.queue.update((items) => {
      items
        .filter((t) => t.position === position)
        .forEach((t) => this.clearTimer(t.id))
      return items.filter((t) => t.position !== position)
    })
  }

  private push(base: { message: string; kind: ToastKind; title?: string }, opts: Partial<ToastOptions>) {
    const id = crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`
    const toast: ToastOptions = {
      id,
      message: base.message,
      kind: base.kind,
      title: base.title,
      duration: opts.duration ?? 4200,
      dismissible: opts.dismissible ?? true,
      position: opts.position ?? 'top-right',
    }

    this.queue.update((items) => [...items, toast])

    if (toast.duration > 0) {
      const timer = setTimeout(() => this.dismiss(id), toast.duration)
      this.timers.set(id, timer)
    }
  }

  private clearTimer(id: string) {
    const timer = this.timers.get(id)
    if (timer) {
      clearTimeout(timer)
      this.timers.delete(id)
    }
  }
}
