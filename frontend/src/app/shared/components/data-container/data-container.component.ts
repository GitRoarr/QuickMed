import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-data-container',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './data-container.component.html',
  styleUrls: ['./data-container.component.css']
})
export class DataContainerComponent {
  @Input() title: string = 'Data';
  @Input() items: any[] = [];
  @Input() loading: boolean = false;
  @Output() refresh = new EventEmitter<void>();

  onRefresh() {
    this.refresh.emit();
  }
}
