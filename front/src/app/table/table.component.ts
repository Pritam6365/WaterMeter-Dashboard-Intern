import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common'; // <-- Add this import
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

@Component({
  selector: 'dashboard-table',
  standalone: true,
  imports: [CommonModule], // <-- THIS LINE is mandatory
  templateUrl: './table.component.html',
  styleUrls: []
})
export class TableComponent implements OnInit {
  rowData: any[] = [];

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.http.get<any[]>(`${environment.apiBaseUrl}/alldata`).subscribe({
      next: (data) => (this.rowData = data),
      error: (err) => {
        console.error('Failed to load table data', err);
        this.rowData = [];
      }
    });
  }
}
