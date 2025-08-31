import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../environments/environment';

interface TableRow {
  industryname: string;
  division_id: string;
  industry_id: string;
  month_id: number;
  monthname?: string;
  financial_year?: string;
  initialmeter_reading: number;
  finalmeter_reading: number;
  meterreadingdifference: number;
  currentfinancialyear?: string;
  insert_date?: string;
}

@Component({
  selector: 'dashboard-table',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './table.component.html',
  styleUrls: []
})
export class TableComponent implements OnInit {
  rowData: TableRow[] = [];
  loading = false;
  initialLoading = true;
  error: string | null = null;
  page = 0;
  pageSize = 20;
  allDataLoaded = false;
  totalRecords = 0;

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.resetPagination();
    this.loadNextPage();
  }

  resetPagination() {
    this.page = 0;
    this.allDataLoaded = false;
    this.rowData = [];
    this.totalRecords = 0;
  }

  @HostListener('window:scroll', ['$event'])
  onWindowScroll() {
    if (this.allDataLoaded || this.loading) {
      return;
    }

    const scrollPosition = window.innerHeight + window.scrollY;
    const threshold = document.body.offsetHeight - 100; // Trigger 100px before bottom

    if (scrollPosition >= threshold) {
      this.loadNextPage();
    }
  }

  loadNextPage() {
    if (this.loading || this.allDataLoaded) {
      return;
    }

    this.loading = true;
    this.error = null;

    const params = new HttpParams()
      .set('page', this.page.toString())
      .set('pageSize', this.pageSize.toString());

    const url = `${environment.apiBaseUrl}/alldata`;
    
    console.log(`📄 Loading page ${this.page} with ${this.pageSize} records...`);

    this.http.get<{data: TableRow[], total: number}>(url, { params }).subscribe({
      next: (response) => {
        const data = response.data || response as any; // Handle both response formats
        
        if (Array.isArray(data) && data.length === 0) {
          this.allDataLoaded = true;
          console.log('📄 All data loaded');
        } else {
          this.rowData = this.rowData.concat(data);
          this.totalRecords = response.total || this.totalRecords;
          this.page++;
          console.log(`✅ Loaded ${data.length} records. Total: ${this.rowData.length}`);
          
          if (data.length < this.pageSize) {
            this.allDataLoaded = true;
          }
        }
        
        this.loading = false;
        this.initialLoading = false;
      },
      error: (err) => {
        console.error('❌ Failed to load table data:', err);
        this.error = `Failed to load data: ${err.statusText || err.message}`;
        this.loading = false;
        this.initialLoading = false;
      }
    });
  }

  refresh() {
    this.resetPagination();
    this.initialLoading = true;
    this.loadNextPage();
  }
}
