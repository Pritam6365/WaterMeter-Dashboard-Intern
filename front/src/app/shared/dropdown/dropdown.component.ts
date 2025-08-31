import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-dropdown',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dropdown.component.html'
})
export class DropdownComponent {
  @Input() options: any[] = [];
  @Input() labelKey = 'name';
  @Input() valueKey = 'id';
  @Input() placeholder = 'Select';
  @Output() select = new EventEmitter<string>();

  onChange(event: Event) {
    this.select.emit((event.target as HTMLSelectElement).value);
  }
}
