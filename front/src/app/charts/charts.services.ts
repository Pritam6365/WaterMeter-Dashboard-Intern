import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { map, catchError, timeout } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface ChartDataPoint { 
  label: string; 
  value: number; 
  date?: Date;
  monthId?: number;
}

@Injectable({ providedIn: 'root' })
export class ChartsService {
  constructor(private http: HttpClient) {
    console.log('ChartsService initialized with API URL:', environment.apiBaseUrl);
  }

  // Chart 1: Industry vs Meter Reading Difference by Division and Year
  getChart1Data(division: string, financial_year: string): Observable<ChartDataPoint[]> {
    const params = new HttpParams()
      .set('division', division)
      .set('financial_year', financial_year);

    const url = `${environment.apiBaseUrl}/api/chart1`;
    console.log('Chart1 API call:', url, 'Params:', params.toString());

    return this.http.get<any[]>(url, { params }).pipe(
      timeout(10000),
      map(rows => {
        console.log('Chart1 raw API response:', rows);
        if (!Array.isArray(rows)) {
          console.error('Chart1: API did not return an array:', rows);
          return [];
        }
        return rows.map(r => ({ 
          label: r.industryname,
          value: Number(r.total_diff || 0)
        }));
      }),
      catchError((error: HttpErrorResponse) => {
        console.error('Chart1 service error:', error);
        return throwError(() => error);
      })
    );
  }

  // Chart 2: Division vs Meter Reading Difference by Year
  getChart2Data(financial_year: string): Observable<ChartDataPoint[]> {
    const params = new HttpParams().set('financial_year', financial_year);
    const url = `${environment.apiBaseUrl}/api/chart2`;
    
    console.log('Chart2 API call:', url, 'Params:', params.toString());

    return this.http.get<any[]>(url, { params }).pipe(
      timeout(10000),
      map(rows => {
        console.log('Chart2 raw API response:', rows);
        if (!Array.isArray(rows)) return [];
        return rows.map(r => ({ 
          label: r.label || `Division ${r.division_id}`,
          value: Number(r.total_diff || 0)
        }));
      }),
      catchError((error: HttpErrorResponse) => {
        console.error('Chart2 service error:', error);
        return throwError(() => error);
      })
    );
  }

  // Chart 3: Year vs Meter Reading Difference by Industry
  getChart3Data(industry: string): Observable<ChartDataPoint[]> {
    const params = new HttpParams().set('industry', industry);
    const url = `${environment.apiBaseUrl}/api/chart3`;
    
    console.log('Chart3 API call:', url, 'Params:', params.toString());

    return this.http.get<any[]>(url, { params }).pipe(
      timeout(10000),
      map(rows => {
        console.log('Chart3 raw API response:', rows);
        if (!Array.isArray(rows)) return [];
        return rows.map(r => ({ 
          label: r.financial_year,
          value: Number(r.total_diff || 0)
        }));
      }),
      catchError((error: HttpErrorResponse) => {
        console.error('Chart3 service error:', error);
        return throwError(() => error);
      })
    );
  }

  // Chart 4: Time Series by Industry (with dates)
  getChart4Data(industry: string): Observable<any[]> {
    const params = new HttpParams().set('industry', industry);
    const url = `${environment.apiBaseUrl}/api/chart4`;
    
    console.log('Chart4 API call:', url, 'Params:', params.toString());

    return this.http.get<any[]>(url, { params }).pipe(
      timeout(10000),
      map(rows => {
        console.log('Chart4 raw API response:', rows);
        if (!Array.isArray(rows)) return [];
        
        return rows.map(r => ({
          date: new Date(r.insert_date), // Convert to Date object for time scale
          value: Number(r.total_diff || 0),
          formatted_date: r.formatted_date,
          industry_id: r.industry_id
        }));
      }),
      catchError((error: HttpErrorResponse) => {
        console.error('Chart4 service error:', error);
        return throwError(() => error);
      })
    );
  }

  // Chart 5: Monthly Analysis by Industry and Year (Enhanced)
  getChart5Data(industry: string, financial_year: string = ''): Observable<ChartDataPoint[]> {
    let params = new HttpParams().set('industry', industry);
    
    if (financial_year && financial_year !== 'all') {
      params = params.set('financial_year', financial_year);
    }

    const url = `${environment.apiBaseUrl}/api/chart5`;
    console.log('Chart5 API call:', url, 'Params:', params.toString());

    return this.http.get<any[]>(url, { params }).pipe(
      timeout(10000),
      map(rows => {
        console.log('Chart5 raw API response:', rows);
        if (!Array.isArray(rows)) return [];
        
        // Sort by month_id to ensure proper order, then map to display month names
        const sortedRows = rows.sort((a, b) => a.month_id - b.month_id);
        
        return sortedRows.map(r => ({ 
          label: r.monthname || `Month ${r.month_id}`, // Use monthname from backend
          value: Number(r.total_diff || 0),
          monthId: r.month_id // Keep month_id for sorting if needed
        }));
      }),
      catchError((error: HttpErrorResponse) => {
        console.error('Chart5 service error:', error);
        return throwError(() => error);
      })
    );
  }

  // Chart 6: Monthly Analysis by Division and Year
  getChart6Data(division: string, financial_year: string): Observable<ChartDataPoint[]> {
    const params = new HttpParams()
      .set('division', division)
      .set('financial_year', financial_year);

    const url = `${environment.apiBaseUrl}/api/chart6`;
    console.log('Chart6 API call:', url, 'Params:', params.toString());

    return this.http.get<any[]>(url, { params }).pipe(
      timeout(10000),
      map(rows => {
        console.log('Chart6 raw API response:', rows);
        if (!Array.isArray(rows)) return [];
        
        // Sort by month_id to ensure proper order, then map to display month names
        const sortedRows = rows.sort((a, b) => a.month_id - b.month_id);
        
        return sortedRows.map(r => ({ 
          label: r.monthname || `Month ${r.month_id}`, // Use monthname from backend
          value: Number(r.total_diff || 0),
          monthId: r.month_id // Keep month_id for sorting if needed
        }));
      }),
      catchError((error: HttpErrorResponse) => {
        console.error('Chart6 service error:', error);
        return throwError(() => error);
      })
    );
  }

  // Test connection method
  testConnection(): Observable<any> {
    const testUrl = `${environment.apiBaseUrl}/api/health`;
    console.log('Testing connection to:', testUrl);
    
    return this.http.get(testUrl).pipe(
      timeout(5000),
      catchError((error: HttpErrorResponse) => {
        console.error('Connection test failed:', error);
        return throwError(() => error);
      })
    );
  }
}
