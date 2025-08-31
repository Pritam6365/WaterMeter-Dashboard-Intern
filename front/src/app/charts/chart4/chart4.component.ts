import { Component, OnInit, AfterViewInit, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  Chart, 
  registerables, 
  LineController, 
  LineElement, 
  PointElement, 
  LinearScale, 
  TimeScale,
  Title, 
  Tooltip, 
  Legend 
} from 'chart.js/auto';
import 'chartjs-adapter-date-fns';
import { DropdownDataService, Industry } from '../../shared/dropdown-data.service';
import { ChartsService } from '../charts.services';
import { catchError } from 'rxjs/operators';
import { of } from 'rxjs';

Chart.register(...registerables);

@Component({
  selector: 'app-chart4',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chart4.component.html',
  styleUrls: ['./chart4.component.scss']
})
export class Chart4Component implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('canvas', { static: false }) canvasRef!: ElementRef<HTMLCanvasElement>;

  industries: Industry[] = [];
  selectedIndustry = '';
  chart?: Chart;
  loading = false;
  showLoadButton = false;
  viewInitialized = false;
  errorMessage = '';

  // Fixed style configuration for minimal green line
  private readonly chartStyle = {
    borderColor: '#10b981',
    backgroundColor: 'transparent',
    fill: false,
    tension: 0.2,
    borderWidth: 2,
    pointRadius: 3,
    pointHoverRadius: 5,
    pointBackgroundColor: '#10b981'
  };

  constructor(
    private dropdowns: DropdownDataService,
    private charts: ChartsService
  ) {}

  ngOnInit() {
    console.log('Chart4: Initializing...');
    this.loadIndustries();
  }

  ngAfterViewInit() {
    console.log('Chart4: View initialized');
    this.viewInitialized = true;
  }

  private loadIndustries() {
    this.dropdowns.getIndustries().subscribe({
      next: (data: Industry[]) => {
        console.log('Chart4: Industries loaded:', data.length);
        this.industries = data;
        if (data.length === 0) {
          this.errorMessage = 'No industries available';
        }
      },
      error: (error: any) => {
        console.error('Chart4: Error loading industries:', error);
        this.errorMessage = 'Failed to load industries';
      }
    });
  }

  onSelectionChange() {
    console.log('Chart4: Industry selected:', this.selectedIndustry);
    this.showLoadButton = !!this.selectedIndustry;
    this.destroyChart();
    this.errorMessage = '';
  }

  loadChart() {
    if (!this.selectedIndustry) {
      this.errorMessage = 'Please select an Industry';
      return;
    }

    if (!this.viewInitialized || !this.canvasRef) {
      console.log('Chart4: View not ready, retrying...');
      setTimeout(() => this.loadChart(), 300);
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    
    console.log('Chart4: Fetching data for:', this.selectedIndustry);
    
    this.charts.getChart4Data(this.selectedIndustry)
      .pipe(
        catchError((error: any) => {
          console.error('Chart4: API Error:', error);
          this.errorMessage = `Failed to load data: ${error.message || 'Unknown error'}`;
          this.loading = false;
          return of([]);
        })
      )
      .subscribe({
        next: (data: any[]) => {
          console.log('Chart4: Raw data received:', data);
          this.loading = false;
          
          if (!data || data.length === 0) {
            this.errorMessage = 'No data available for selected industry';
            return;
          }
          
          this.renderChart(data);
        }
      });
  }

  renderChart(data: any[]) {
    console.log('Chart4: Rendering chart with', data.length, 'points');
    
    // Aggregate data by month to reduce clutter
    const aggregatedData = this.aggregateDataByMonth(data);

    this.destroyChart();

    const ctx = this.canvasRef.nativeElement.getContext('2d');
    if (!ctx) {
      this.errorMessage = 'Cannot get canvas context';
      return;
    }

    try {
      const dataset = {
        label: 'Industry Consumption',
        data: aggregatedData.map(d => ({
          x: d.date,
          y: d.value
        })),
        ...this.chartStyle
      };

      this.chart = new Chart(ctx, {
        type: 'line',
        data: {
          datasets: [dataset]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            title: {
              display: true,
              text: `${this.selectedIndustry} - Time Series Analysis`,
              font: { size: 16, weight: 'bold' },
              color: '#1f2937'
            },
            legend: { 
              display: true, 
              position: 'top',
              labels: {
                color: '#374151',
                font: { size: 12 }
              }
            },
            tooltip: {
              mode: 'nearest',
              intersect: false,
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              titleColor: '#ffffff',
              bodyColor: '#ffffff',
              callbacks: {
                title: function(context: any) {
                  return new Date(context[0].parsed.x).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  });
                },
                label: function(context: any) {
                  return `Consumption: ${context.parsed.y.toLocaleString()}`;
                }
              }
            }
          },
          scales: {
            x: {
              type: 'time',
              time: {
                unit: 'month',
                displayFormats: {
                  month: 'MMM yyyy'
                }
              },
              title: {
                display: true,
                text: 'Date',
                color: '#374151',
                font: { size: 12, weight: 'bold' }
              },
              grid: {
                color: 'rgba(156, 163, 175, 0.3)',
                lineWidth: 1
              },
              ticks: {
                color: '#6b7280'
              }
            },
            y: {
              title: {
                display: true,
                text: 'Industry Consumption',
                color: '#374151',
                font: { size: 12, weight: 'bold' }
              },
              beginAtZero: true,
              grid: {
                color: 'rgba(156, 163, 175, 0.3)',
                lineWidth: 1
              },
              ticks: {
                color: '#6b7280',
                callback: function(value: any) {
                  if (value >= 1000000) {
                    return (value / 1000000).toFixed(1) + 'M';
                  } else if (value >= 1000) {
                    return (value / 1000).toFixed(0) + 'K';
                  }
                  return value;
                }
              }
            }
          },
          interaction: {
            intersect: false,
            mode: 'index'
          }
        }
      });
      
      console.log('Chart4: Chart created successfully');
      this.errorMessage = '';
      
    } catch (error) {
      console.error('Chart4: Error creating chart:', error);
      this.errorMessage = 'Failed to create chart visualization';
    }
  }

  // Helper method to aggregate data by month to reduce clutter
  private aggregateDataByMonth(data: any[]): any[] {
    const monthlyData: { [key: string]: { sum: number, count: number, date: Date } } = {};
    
    data.forEach(d => {
      if (!d.date || !d.value) return;
      
      const date = new Date(d.date);
      const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
      
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = {
          sum: 0,
          count: 0,
          date: new Date(date.getFullYear(), date.getMonth(), 1)
        };
      }
      
      monthlyData[monthKey].sum += Number(d.value);
      monthlyData[monthKey].count += 1;
    });
    
    return Object.values(monthlyData)
      .map(d => ({
        date: d.date,
        value: d.sum / d.count // Average value for the month
      }))
      .sort((a, b) => a.date.getTime() - b.date.getTime());
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
