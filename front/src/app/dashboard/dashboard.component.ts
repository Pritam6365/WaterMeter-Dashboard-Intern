import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardService, DashboardData } from './dashboard.service';
import { catchError } from 'rxjs/operators';
import { of } from 'rxjs';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  dashboardData: any[] = [];
  loading = false;
  errorMessage = '';
  
  // Pagination properties - THESE WERE MISSING
  currentPage = 0;
  pageSize = 20;
  totalRecords = 0;
  totalPages = 0;
  hasMore = true;
  loadingMore = false;

  constructor(private dashboardService: DashboardService) {}

  ngOnInit() {
    console.log('Dashboard: Component initializing');
    this.testConnectionAndLoadData();
  }

  // FIXED: Added trackByFn method that was referenced in template
  trackByFn(index: number, item: any): any {
    return item?.industry_id ?? item?.id ?? index;
  }

  // FIXED: Added getCurrentlyShowing method that was referenced in template
  getCurrentlyShowing(): string {
    return `Showing ${this.dashboardData.length} of ${this.totalRecords} records`;
  }

  // FIXED: Added getProgress method that was referenced in template
  getProgress(): number {
    return this.totalRecords > 0 ? (this.dashboardData.length / this.totalRecords) * 100 : 0;
  }

  // FIXED: Added loadNextPage method that was referenced in template
  loadNextPage() {
    if (!this.hasMore || this.loadingMore) {
      return;
    }

    this.loadingMore = true;
    this.currentPage += 1;
    
    console.log(`Dashboard: Loading next page ${this.currentPage + 1}...`);
    
    this.dashboardService.getAllData(this.currentPage, this.pageSize).pipe(
      catchError((error: any) => {
        console.error('Dashboard: Error loading next page:', error);
        this.errorMessage = error.message || 'Failed to load more data.';
        this.currentPage -= 1; // Revert page increment on error
        this.loadingMore = false;
        return of({ data: [], total: 0, page: 0, pageSize: 20, hasMore: false, totalPages: 0 });
      })
    ).subscribe({
      next: (response: DashboardData) => {
        console.log('Dashboard: Next page loaded successfully:', response);
        
        // Append new data to existing data
        this.dashboardData = [...this.dashboardData, ...response.data];
        this.hasMore = response.hasMore || false;
        this.loadingMore = false;
        
        if (response.data.length === 0) {
          this.hasMore = false;
        }
      }
    });
  }

  private testConnectionAndLoadData() {
    console.log('Dashboard: Testing connection...');
    
    this.dashboardService.testConnection().pipe(
      catchError((error: any) => {
        console.error('Dashboard: Connection test failed:', error);
        this.errorMessage = `Cannot connect to server. Please ensure the backend server is running on port 3000.`;
        return of(null);
      })
    ).subscribe({
      next: (response) => {
        if (response) {
          console.log('Dashboard: Connection successful:', response);
          this.loadInitialData();
        }
      }
    });
  }

  loadInitialData() {
    this.loading = true;
    this.errorMessage = '';
    this.currentPage = 0;
    this.dashboardData = []; // Clear existing data
    
    console.log('Dashboard: Loading initial data...');
    
    this.dashboardService.getAllData(this.currentPage, this.pageSize).pipe(
      catchError((error: any) => {
        console.error('Dashboard: Error loading initial data:', error);
        this.errorMessage = error.message || 'Failed to load dashboard data.';
        this.loading = false;
        return of({ data: [], total: 0, page: 0, pageSize: 20, hasMore: false, totalPages: 0 });
      })
    ).subscribe({
      next: (response: DashboardData) => {
        console.log('Dashboard: Initial data loaded successfully:', response);
        this.dashboardData = response.data || [];
        this.totalRecords = response.total || 0;
        this.totalPages = response.totalPages || 0;
        this.hasMore = response.hasMore || false;
        this.loading = false;
        
        if (this.dashboardData.length === 0 && !this.errorMessage) {
          this.errorMessage = 'No data available to display.';
        }
      }
    });
  }

  retry() {
    console.log('Dashboard: Retrying...');
    this.errorMessage = '';
    this.testConnectionAndLoadData();
  }

  refresh() {
    console.log('Dashboard: Refreshing data...');
    this.loadInitialData();
  }
}
