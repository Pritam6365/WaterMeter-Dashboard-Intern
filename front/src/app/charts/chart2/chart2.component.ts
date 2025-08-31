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
  selector: 'app-chart2',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chart2.component.html'
})
export class Chart2Component implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('canvas', { static: false }) canvasRef!: ElementRef<HTMLCanvasElement>;

  years: any[] = [];
  selectedYear = '';
  chart?: Chart;
  loading = false;
  showLoadButton = false;
  viewInitialized = false;
  errorMessage = '';

  constructor(private dropdowns: DropdownDataService, private charts: ChartsService) {}

  ngOnInit() {
    this.dropdowns.getYears().subscribe({
      next: (data) => {
        this.years = data;
      },
      error: (error) => {
        this.errorMessage = 'Failed to load years';
      }
    });
  }

  ngAfterViewInit() {
    this.viewInitialized = true;
  }

  onSelectionChange() {
    this.showLoadButton = !!this.selectedYear;
    this.destroyChart();
    this.errorMessage = '';
  }

  loadChart() {
    if (!this.selectedYear) {
      this.errorMessage = 'Please select a Year';
      return;
    }

    if (!this.viewInitialized || !this.canvasRef) {
      setTimeout(() => this.loadChart(), 200);
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    
    this.charts.getChart2Data(this.selectedYear)
      .pipe(
        catchError(error => {
          this.errorMessage = `Failed to load chart data: ${error.status || 'Unknown'} ${error.statusText || error.message}`;
          this.loading = false;
          return of([]);
        })
      )
      .subscribe({
        next: (data: any[]) => {
          if (data && data.length > 0) {
            this.renderChart(data);
            this.errorMessage = '';
          } else {
            this.errorMessage = 'No data available for selected year';
          }
          this.loading = false;
        }
      });
  }

  renderChart(data: any[]) {
    console.log('Chart2: renderChart called with data:', data);
    
    // Clean division labels - remove "Division EE_" prefix
    const labels = data.map(d => {
      let label = d.label || `Division ${d.division_id}`;
      // Remove "Division " prefix and "EE_" or similar patterns
      label = label.replace(/^Division\s+/, '');
      label = label.replace(/^[A-Z]{2}_/, '');
      return label;
    });
    
    const values = data.map(d => Number(d.value || d.total_diff));
    
    console.log('Chart2: Chart labels:', labels);
    console.log('Chart2: Chart values:', values);

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
          labels: labels, // Now shows clean names like "Adava", "Angul"
          datasets: [{
            label: 'Industry Consumption', // Changed from 'Meter Reading Difference'
            data: values,
            backgroundColor: '#198754',
            borderColor: '#198754',
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
                text: 'Division' 
              }
            },
            y: { 
              title: { 
                display: true, 
                text: 'Industry Consumption' // Changed from 'Meter Reading Difference'
              }, 
              beginAtZero: true 
            }
          },
          plugins: {
            title: {
              display: true,
              text: `Division Analysis for ${this.selectedYear}`
            }
          }
        }
      });
      console.log('Chart2: Chart created successfully');
    } catch (error) {
      console.error('Chart2: Error creating chart:', error);
      this.errorMessage = 'Failed to create chart';
    }
  }

  private destroyChart() {
    if (this.chart) {
      this.chart.destroy();
      this.chart = undefined;
    }
  }

  ngOnDestroy() {
    this.destroyChart();
  }
}
