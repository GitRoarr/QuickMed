
import { Component, inject } from "@angular/core";
import { RouterOutlet } from "@angular/router";
import { ToastContainerComponent } from "@shared/components/toast/toast-container.component";
import { AdminThemeService } from "./core/services/admin-theme.service";

@Component({
  selector: "app-root",
  standalone: true,
  imports: [RouterOutlet, ToastContainerComponent],
  template: `
    <router-outlet></router-outlet>
    <app-toast-container></app-toast-container>
  `,
})
export class AppComponent {
  // Ensure theme is loaded and applied globally
  private readonly theme = inject(AdminThemeService);
}