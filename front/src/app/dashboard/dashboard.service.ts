import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, timeout } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface DashboardData {
  data: any[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
  totalPages: number;
}

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  constructor(private http: HttpClient) {}

  getAllData(page: number = 0, pageSize: number = 20): Observable<DashboardData> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());

    const url = `${environment.apiBaseUrl}/api/alldata`;
    console.log(`Dashboard: Loading page ${page + 1} with ${pageSize} items per page`);

    return this.http.get<DashboardData>(url, { params }).pipe(
      timeout(15000),
      catchError((error: HttpErrorResponse) => {
        console.error('Dashboard API Error:', error);
        
        let errorMessage = 'Failed to load dashboard data.';
        
        if (error.status === 404) {
          errorMessage = 'API endpoint not found - Check server configuration';
        } else if (error.status === 0) {
          errorMessage = 'Cannot connect to server. Please check if the backend is running.';
        } else if (error.status >= 500) {
          errorMessage = 'Server error occurred. Please try again later.';
        }
        
        return throwError(() => ({ message: errorMessage, status: error.status }));
      })
    );
  }

  testConnection(): Observable<any> {
    const testUrl = `${environment.apiBaseUrl}/api/health`;
    return this.http.get(testUrl).pipe(
      timeout(5000),
      catchError((error: HttpErrorResponse) => throwError(() => error))
    );
  }
}
