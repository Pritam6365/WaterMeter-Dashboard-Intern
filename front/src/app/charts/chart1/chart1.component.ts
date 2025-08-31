import { Component, OnInit, AfterViewInit, ViewChild, ElementRef, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Chart, registerables } from 'chart.js/auto';
import { DropdownDataService, Division, Year } from '../../shared/dropdown-data.service';
import { ChartsService } from '../charts.services';
import { catchError, finalize } from 'rxjs/operators';
import { of, forkJoin } from 'rxjs';

Chart.register(...registerables);

@Component({
  selector: 'app-chart1',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chart1.component.html',
  styleUrls: ['./chart1.component.scss']
})
export class Chart1Component implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('canvas', { static: false }) canvasRef!: ElementRef<HTMLCanvasElement>;

  divisions: Division[] = [];
  years: Year[] = [];
  selectedDivision = '';
  selectedYear = '';
  chart?: Chart;
  loading = false;
  showLoadButton = false;
  viewInitialized = false;
  errorMessage = '';
  connectionTested = false;

  constructor(
    private dropdowns: DropdownDataService,
    private charts: ChartsService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    console.log('Chart1: Component initializing...');
    this.testConnectionAndLoadData();
  }

  ngAfterViewInit() {
    console.log('Chart1: View initialized');
    this.viewInitialized = true;
  }

  private testConnectionAndLoadData() {
    console.log('Chart1: Testing connection...');
    
    this.dropdowns.testConnection().pipe(
      catchError((error: any) => {
        console.error('Chart1: Connection test failed:', error);
        this.errorMessage = `Cannot connect to server at ${error.url || 'unknown URL'}. Please ensure the backend server is running on port 3000.`;
        this.cdr.detectChanges();
        return of(null);
      })
    ).subscribe({
      next: (response) => {
        if (response) {
          console.log('Chart1: Connection successful:', response);
          this.connectionTested = true;
          this.loadDropdownData();
        }
      }
    });
  }

  private loadDropdownData() {
    console.log('Chart1: Loading dropdown data...');
    
    forkJoin({
      divisions: this.dropdowns.getDivisions(),
      years: this.dropdowns.getYears()
    }).pipe(
      catchError((error: any) => {
        console.error('Chart1: Error loading dropdown data:', error);
        this.errorMessage = 'Failed to load dropdown data. Server might be down or unreachable.';
        this.cdr.detectChanges();
        return of({ divisions: [], years: [] });
      })
    ).subscribe({
      next: (data: any) => {
        console.log('Chart1: Dropdown data received:', data);
        
        this.divisions = data.divisions || [];
        this.years = data.years || [];
        
        if (this.divisions.length === 0 && this.years.length === 0) {
          this.errorMessage = 'No data available. Please check if the server is running and database contains data.';
        } else if (this.divisions.length === 0) {
          this.errorMessage = 'No divisions data available.';
        } else if (this.years.length === 0) {
          this.errorMessage = 'No years data available.';
        } else {
          this.errorMessage = '';
          console.log(`Chart1: Loaded ${this.divisions.length} divisions and ${this.years.length} years`);
        }
        
        this.cdr.detectChanges();
      }
    });
  }

  onSelectionChange() {
    console.log('Chart1: Selection changed - Division:', this.selectedDivision, 'Year:', this.selectedYear);
    this.showLoadButton = !!(this.selectedDivision && this.selectedYear);
    this.destroyChart();
    
    if (!this.errorMessage.includes('server') && !this.errorMessage.includes('data available')) {
      this.errorMessage = '';
    }
  }

  loadChart() {
    console.log('Chart1: Loading chart...');
    
    if (!this.selectedDivision || !this.selectedYear) {
      this.errorMessage = 'Please select both Division and Year';
      return;
    }

    if (!this.viewInitialized || !this.canvasRef) {
      console.log('Chart1: View not ready, retrying...');
      setTimeout(() => this.loadChart(), 200);
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    
    this.charts.getChart1Data(this.selectedDivision, this.selectedYear)
      .pipe(
        catchError((error: any) => {
          console.error('Chart1: API Error:', error);
          this.errorMessage = `Failed to load chart data: ${error.status ? `Server error ${error.status}` : 'Network error'}`;
          return of([]);
        }),
        finalize(() => {
          this.loading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (data: any[]) => {
          console.log('Chart1: Chart data received:', data);
          if (data && data.length > 0) {
            this.renderChart(data);
            this.errorMessage = '';
          } else {
            this.errorMessage = 'No chart data available for the selected Division and Year combination.';
          }
        }
      });
  }

  renderChart(data: any[]) {
    console.log('Chart1: Rendering chart with', data.length, 'data points');
    
    const labels = data.map(d => d.label || 'Unknown');
    const values = data.map(d => Number(d.value || 0));
    
    this.destroyChart();

    const ctx = this.canvasRef.nativeElement.getContext('2d');
    if (!ctx) {
      this.errorMessage = 'Failed to initialize chart canvas';
      return;
    }

    try {
      this.chart = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: labels,
          datasets: [{
            label: 'Industry Consumption',
            data: values,
            backgroundColor: '#0d6efd',
            borderColor: '#0d6efd',
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: { 
              title: { 
                display: true, 
                text: 'Industry' 
              }
            },
            y: { 
              title: { 
                display: true, 
                text: 'Industry Consumption' 
              }, 
              beginAtZero: true 
            }
          },
          plugins: {
            title: {
              display: true,
              text: `Industry Analysis - ${this.selectedDivision} (${this.selectedYear})`
            }
          }
        }
      });
      console.log('Chart1: Chart created successfully');
    } catch (error) {
      console.error('Chart1: Error creating chart:', error);
      this.errorMessage = 'Failed to create chart visualization';
    }
  }

  private destroyChart() {
    if (this.chart) {
      this.chart.destroy();
      this.chart = undefined;
    }
  }

  retry() {
    console.log('Chart1: Retrying...');
    this.errorMessage = '';
    this.connectionTested = false;
    this.dropdowns.clearCache();
    this.testConnectionAndLoadData();
  }

  ngOnDestroy() {
    this.destroyChart();
  }
}
