import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { Chart } from 'chart.js/auto';
import { DropdownComponent } from '../../shared/dropdown/dropdown.component';
import { DropdownDataService, Industry } from '../../shared/dropdown-data.service';
import { ChartsService, ChartDataPoint } from '../charts.services';

@Component({
  selector: 'app-chart3',
  standalone: true,
  imports: [DropdownComponent],
  templateUrl: './chart3.component.html'
})
export class Chart3Component implements OnInit {
  @ViewChild('canvas', { static: false }) canvasRef!: ElementRef;

  industries: Industry[] = [];
  selectedIndustry = '';
  chart?: Chart;

  constructor(private dropdowns: DropdownDataService, private charts: ChartsService) {}

  ngOnInit() {
    this.dropdowns.getIndustries().subscribe(data => this.industries = data);
  }

  fetchChart() {
    if (!this.selectedIndustry) {
      this.destroyChart();
      return;
    }

    this.charts.getChart3Data(this.selectedIndustry)
      .subscribe((chartData: ChartDataPoint[]) => this.renderChart(chartData));
  }

  renderChart(data: ChartDataPoint[]) {
    const labels = data.map(d => d.label);
    const values = data.map(d => d.value);

    this.destroyChart();

    this.chart = new Chart(this.canvasRef.nativeElement, {
      type: 'line',
      data: { 
        labels, 
        datasets: [{ 
          label: 'Industry Consumption', 
          data: values, 
          backgroundColor: '#fd7e14',
          borderColor: '#fd7e14',
          fill: false
        }] 
      },
      options: { 
        responsive: true, 
        maintainAspectRatio: false,
        scales: {
          x: { title: { display: true, text: 'Year' } },
          y: { title: { display: true, text: 'Industry Consumption' } }
        }
      }
    });
  }

  private destroyChart() { 
    if (this.chart) { 
      this.chart.destroy(); 
      this.chart = undefined; 
    } 
  }
}
