import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'dashboard-ng19-navbar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './navbar.component.html'
})
export class NavbarComponent {
  // Remove the toggleSidebar functionality since we don't need the button
}
