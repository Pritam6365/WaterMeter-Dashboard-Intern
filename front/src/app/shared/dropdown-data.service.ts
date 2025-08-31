import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError, of } from 'rxjs';
import { map, catchError, shareReplay, retry, timeout } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface DropdownOption {
  id: string;
  name: string;
}

export interface Industry extends DropdownOption {}
export interface Division extends DropdownOption {}
export interface Year extends DropdownOption {}

@Injectable({
  providedIn: 'root'
})
export class DropdownDataService {
  private cache = new Map<string, Observable<any>>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  
  private loadingSubject = new BehaviorSubject<boolean>(false);
  public loading$ = this.loadingSubject.asObservable();

  constructor(private http: HttpClient) {
    console.log('DropdownDataService initialized with API URL:', environment.apiBaseUrl);
  }

  getIndustries(): Observable<Industry[]> {
    console.log('Getting industries...');
    return this.getCachedData<Industry>('industries', '/api/industries');
  }

  getDivisions(): Observable<Division[]> {
    console.log('Getting divisions...');
    return this.getCachedData<Division>('divisions', '/api/divisions');
  }

  getYears(): Observable<Year[]> {
    console.log('Getting years...');
    return this.getCachedData<Year>('years', '/api/years');
  }

  private getCachedData<T extends DropdownOption>(cacheKey: string, endpoint: string): Observable<T[]> {
    const fullUrl = `${environment.apiBaseUrl}${endpoint}`;
    console.log(`Fetching data from: ${fullUrl}`);

    if (this.cache.has(cacheKey)) {
      console.log(`Using cached data for ${cacheKey}`);
      return this.cache.get(cacheKey)!;
    }

    this.loadingSubject.next(true);

    const request$ = this.http.get<T[]>(fullUrl).pipe(
      timeout(10000), // 10 seconds timeout
      retry({
        count: 2,
        delay: (error: any, retryCount: number) => {
          console.log(`Retry attempt ${retryCount} for ${endpoint}:`, error.message);
          return of(null).pipe(timeout(2000));
        }
      }),
      map((data: T[]) => {
        console.log(`Raw data received for ${cacheKey}:`, data);
        if (!Array.isArray(data)) {
          console.error(`Invalid response format for ${endpoint} - expected array, got:`, typeof data);
          return [];
        }
        return data;
      }),
      catchError((error: HttpErrorResponse) => {
        console.error(`Failed to fetch ${cacheKey}:`, error);
        console.error('Error details:', {
          status: error.status,
          statusText: error.statusText,
          url: error.url,
          message: error.message
        });
        this.loadingSubject.next(false);
        return of([] as T[]);
      }),
      shareReplay({ 
        bufferSize: 1, 
        refCount: false,
        windowTime: this.CACHE_DURATION 
      })
    );

    request$.subscribe({
      next: (data: T[]) => {
        console.log(`Successfully loaded ${cacheKey}:`, data.length, 'items');
        this.loadingSubject.next(false);
      },
      error: (error: any) => {
        console.error(`Error loading ${cacheKey}:`, error);
        this.loadingSubject.next(false);
      }
    });

    this.cache.set(cacheKey, request$);
    
    setTimeout(() => {
      this.cache.delete(cacheKey);
      console.log(`Cache cleared for ${cacheKey}`);
    }, this.CACHE_DURATION);

    return request$;
  }

  clearCache(): void {
    this.cache.clear();
    console.log('All dropdown data cache cleared');
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
