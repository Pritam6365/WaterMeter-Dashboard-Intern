import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Chart1Component } from '../chart1/chart1.component';
import { Chart2Component } from '../chart2/chart2.component';
import { Chart3Component } from '../chart3/chart3.component';
import { Chart4Component } from '../chart4/chart4.component';
import { Chart5Component } from '../chart5/chart5.component';
import { Chart6Component } from '../chart6/chart6.component';

@Component({
  selector: 'app-charts-page',
  standalone: true,
  imports: [
    CommonModule,
    Chart1Component,
    Chart2Component,
    Chart3Component,
    Chart4Component,
    Chart5Component,
    Chart6Component
  ],
  templateUrl: './charts-page.component.html',
  styleUrls: ['./charts-page.component.scss']
})
export class ChartsPageComponent {
  activeChart = 1;
}
