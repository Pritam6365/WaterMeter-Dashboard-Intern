import { Component, OnInit, AfterViewInit, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Chart, registerables } from 'chart.js/auto';
import { DropdownDataService, Industry } from '../../shared/dropdown-data.service';
import { ChartsService } from '../charts.services';
import { catchError } from 'rxjs/operators';
import { of } from 'rxjs';

Chart.register(...registerables);

interface ChartTypeOption {
  id: 'bar' | 'line' | 'pie';
  name: string;
  icon: string;
}

interface SortOption {
  id: 'default' | 'asc' | 'desc';
  name: string;
}

@Component({
  selector: 'app-chart5',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chart5.component.html',
  styleUrls: ['./chart5.component.scss']
})
export class Chart5Component implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('canvas', { static: false }) canvasRef!: ElementRef<HTMLCanvasElement>;

  industries: Industry[] = [];
  years: any[] = [];
  selectedIndustry = '';
  selectedYear = '';
  selectedChartType: 'bar' | 'line' | 'pie' = 'bar';
  selectedSortOption: 'default' | 'asc' | 'desc' = 'default';

  loading = false;
  showLoadButton = false;
  viewInitialized = false;
  errorMessage = '';
  chart?: Chart;

  readonly chartTypes: ChartTypeOption[] = [
    { id: 'bar', name: 'Bar Chart', icon: 'bi-bar-chart' },
    { id: 'line', name: 'Line Chart', icon: 'bi-graph-up' },
    { id: 'pie', name: 'Pie Chart', icon: 'bi-pie-chart' }
  ];

  readonly sortOptions: SortOption[] = [
    { id: 'default', name: 'Month Order' },
    { id: 'asc', name: 'Ascending' },
    { id: 'desc', name: 'Descending' }
  ];

  constructor(
    private dropdowns: DropdownDataService,
    private charts: ChartsService
  ) {}

  ngOnInit() {
    console.log('Chart5: ngOnInit called');
    
    this.dropdowns.getIndustries().subscribe({
      next: (data: Industry[]) => {
        console.log('Chart5: Industries loaded:', data);
        this.industries = data;
      },
      error: (error: any) => {
        console.error('Chart5: Error loading industries:', error);
        this.errorMessage = 'Failed to load industries';
      }
    });
    
    this.dropdowns.getYears().subscribe({
      next: (data: any[]) => {
        console.log('Chart5: Years loaded:', data);
        this.years = [{ id: 'all', name: 'All Years' }, ...data];
      },
      error: (error: any) => {
        console.error('Chart5: Error loading years:', error);
        this.errorMessage = 'Failed to load years';
      }
    });
  }

  ngAfterViewInit() {
    console.log('Chart5: ngAfterViewInit called');
    this.viewInitialized = true;
  }

  onSelectionChange() {
    console.log('Chart5: Selection changed - Industry:', this.selectedIndustry, 'Year:', this.selectedYear);
    this.showLoadButton = !!this.selectedIndustry;
    this.destroyChart();
    this.errorMessage = '';
  }

  onChartOptionChange() {
    if (this.chart && this.showLoadButton) {
      this.loadChart();
    }
  }

  loadChart() {
    console.log('Chart5: loadChart called');
    
    if (!this.selectedIndustry) {
      this.errorMessage = 'Please select an Industry';
      return;
    }

    if (!this.viewInitialized || !this.canvasRef) {
      console.log('Chart5: View not ready, retrying...');
      setTimeout(() => this.loadChart(), 200);
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    console.log('Chart5: Fetching data for industry:', this.selectedIndustry, 'year:', this.selectedYear);
    
    const yearParam = this.selectedYear === 'all' ? '' : this.selectedYear;
    
    this.charts.getChart5Data(this.selectedIndustry, yearParam)
      .pipe(
        catchError((error: any) => {
          console.error('Chart5: HTTP Error:', error);
          this.errorMessage = `Failed to load chart data: ${error.status || 'Unknown'} ${error.statusText || error.message}`;
          this.loading = false;
          return of([]);
        })
      )
      .subscribe({
        next: (data: any[]) => {
          console.log('Chart5: Data received:', data);
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
    console.log('Chart5: renderChart called with data:', data);
    
    let processedData = data.map(d => ({
      label: d.label,
      value: Number(d.value)
    }));

    // Apply sorting
    switch (this.selectedSortOption) {
      case 'asc':
        processedData.sort((a, b) => a.value - b.value);
        break;
      case 'desc':
        processedData.sort((a, b) => b.value - a.value);
        break;
      // 'default' keeps original order (by month)
    }

    const labels = processedData.map(d => d.label);
    const values = processedData.map(d => d.value);
    
    console.log('Chart5: Chart labels:', labels);
    console.log('Chart5: Chart values:', values);

    this.destroyChart();

    const ctx = this.canvasRef.nativeElement.getContext('2d');
    if (!ctx) {
      console.error('Chart5: Cannot get canvas context');
      this.errorMessage = 'Failed to initialize chart canvas';
      return;
    }

    try {
      this.chart = new Chart(ctx, {
        type: this.selectedChartType,
        data: { 
          labels: labels, 
          datasets: [{ 
            label: this.getDatasetLabel(),
            data: values, 
            backgroundColor: this.getChartColors(values.length),
            borderColor: '#198754',
            borderWidth: 1
          }] 
        },
        options: { 
          responsive: true, 
          maintainAspectRatio: false,
          scales: this.selectedChartType !== 'pie' ? {
            x: { title: { display: true, text: 'Month' }},
            y: { title: { display: true, text: 'Industry Consumption' }, beginAtZero: true }
          } : {},
          plugins: {
            legend: { display: this.selectedChartType === 'pie' },
            title: {
              display: true,
              text: `${this.selectedIndustry} - Monthly Analysis`
            }
          }
        }
      });
      console.log('Chart5: Chart created successfully');
    } catch (error) {
      console.error('Chart5: Error creating chart:', error);
      this.errorMessage = 'Failed to create chart';
    }
  }

  private getDatasetLabel(): string {
    const yearText = this.selectedYear === 'all' || !this.selectedYear 
      ? '(All Years)' 
      : `(${this.selectedYear})`;
    return `Industry Consumption ${yearText}`;
  }

  private getChartColors(count: number): string[] {
    const colors = [
      '#198754', '#0d6efd', '#fd7e14', '#dc3545', '#6f42c1',
      '#20c997', '#ffc107', '#e83e8c', '#6c757d', '#17a2b8'
    ];
    
    if (this.selectedChartType === 'pie') {
      return colors.slice(0, count);
    } else {
      return Array(count).fill('#198754');
    }
  }

  private destroyChart() {
    if (this.chart) {
      console.log('Chart5: Destroying existing chart');
      this.chart.destroy();
      this.chart = undefined;
    }
  }

  ngOnDestroy() {
    console.log('Chart5: ngOnDestroy called');
    this.destroyChart();
  }
}
