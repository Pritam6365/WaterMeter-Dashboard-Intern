import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
// Update the import path to the correct location of DashboardComponent
import { DashboardComponent } from '../dashboard/dashboard.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, DashboardComponent],
  templateUrl: './sidebar.component.html',
  styles: [``] // ✅ No external CSS file
})
export class SidebarComponent {
  title = 'dashboard-app';
}
