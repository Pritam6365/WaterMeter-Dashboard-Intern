import { Component, OnInit, AfterViewInit, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Chart, registerables } from 'chart.js/auto';
import { DropdownDataService } from '../../shared/dropdown-data.service';
import { ChartsService } from '../charts.services';
import { catchError } from 'rxjs/operators';
import { of } from 'rxjs';

Chart.register(...registerables);

@Component({
  selector: 'app-chart6',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chart6.component.html',
  styleUrls: ['./chart6.component.scss']
})
export class Chart6Component implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('canvas', { static: false }) canvasRef!: ElementRef<HTMLCanvasElement>;

  divisions: any[] = [];
  years: any[] = [];
  selectedDivision = '';
  selectedYear = '';
  chart?: Chart;
  loading = false;
  showLoadButton = false;
  viewInitialized = false;
  errorMessage = '';

  constructor(
    private dropdowns: DropdownDataService,
    private charts: ChartsService
  ) {}

  ngOnInit() {
    console.log('Chart6: ngOnInit called');
    this.dropdowns.getDivisions().subscribe({
      next: (data: any[]) => {
        console.log('Chart6: Divisions loaded:', data);
        this.divisions = data;
      },
      error: (error: any) => {
        console.error('Chart6: Error loading divisions:', error);
      }
    });
    this.dropdowns.getYears().subscribe({
      next: (data: any[]) => {
        console.log('Chart6: Years loaded:', data);
        this.years = data;
      },
      error: (error: any) => {
        console.error('Chart6: Error loading years:', error);
      }
    });
  }

  ngAfterViewInit() {
    console.log('Chart6: ngAfterViewInit called');
    this.viewInitialized = true;
  }

  onSelectionChange() {
    console.log('Chart6: Selection changed - Division:', this.selectedDivision, 'Year:', this.selectedYear);
    this.showLoadButton = !!(this.selectedDivision && this.selectedYear);
    this.destroyChart();
    this.errorMessage = '';
  }

  loadChart() {
    console.log('Chart6: loadChart called');
    
    if (!this.selectedDivision || !this.selectedYear) {
      this.errorMessage = 'Please select both Division and Year';
      return;
    }

    if (!this.viewInitialized || !this.canvasRef) {
      console.log('Chart6: View not ready, retrying...');
      setTimeout(() => this.loadChart(), 200);
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    console.log('Chart6: Fetching data for division:', this.selectedDivision, 'year:', this.selectedYear);
    
    this.charts.getChart6Data(this.selectedDivision, this.selectedYear)
      .pipe(
        catchError((error: any) => {
          console.error('Chart6: HTTP Error:', error);
          this.errorMessage = `Failed to load chart data: ${error.status || 'Unknown'} ${error.statusText || error.message}`;
          this.loading = false;
          return of([]);
        })
      )
      .subscribe({
        next: (data: any[]) => {
          console.log('Chart6: Data received:', data);
          if (data && data.length > 0) {
            this.renderChart(data);
            this.errorMessage = '';
          } else {
            this.errorMessage = 'No data available for selected criteria';
          }
          this.loading = false;
        }
      });
  }

  renderChart(data: any[]) {
    console.log('Chart6: renderChart called with data:', data);
    
    const labels = data.map(d => d.label);
    const values = data.map(d => Number(d.value));
    
    console.log('Chart6: Chart labels:', labels);
    console.log('Chart6: Chart values:', values);

    this.destroyChart();

    const ctx = this.canvasRef.nativeElement.getContext('2d');
    if (!ctx) {
      console.error('Chart6: Cannot get canvas context');
      this.errorMessage = 'Failed to initialize chart canvas';
      return;
    }

    try {
      this.chart = new Chart(ctx, {
        type: 'bar',
        data: { 
          labels: labels, 
          datasets: [{ 
            label: 'Industry Consumption by Month', 
            data: values, 
            backgroundColor: '#fd7e14',
            borderColor: '#fd7e14',
            borderWidth: 1
          }] 
        },
        options: { 
          responsive: true, 
          maintainAspectRatio: false,
          scales: {
            x: { title: { display: true, text: 'Month' }},
            y: { title: { display: true, text: 'Industry Consumption' }, beginAtZero: true }
          },
          plugins: {
            title: {
              display: true,
              text: `Division ${this.selectedDivision} - Monthly Analysis (${this.selectedYear})`
            }
          }
        }
      });
      console.log('Chart6: Chart created successfully');
    } catch (error) {
      console.error('Chart6: Error creating chart:', error);
      this.errorMessage = 'Failed to create chart';
    }
  }

  private destroyChart() {
    if (this.chart) {
      console.log('Chart6: Destroying existing chart');
      this.chart.destroy();
      this.chart = undefined;
    }
  }

  ngOnDestroy() {
    console.log('Chart6: ngOnDestroy called');
    this.destroyChart();
  }
}
