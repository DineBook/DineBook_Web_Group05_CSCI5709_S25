import { HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { of } from 'rxjs';
import { tap } from 'rxjs/operators';

interface CacheEntry {
  response: HttpResponse<any>;
  timestamp: number;
}

class HttpCache {
  private cache = new Map<string, CacheEntry>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  get(url: string): HttpResponse<any> | null {
    const entry = this.cache.get(url);
    if (!entry) return null;
    
    if (Date.now() - entry.timestamp > this.CACHE_TTL) {
      this.cache.delete(url);
      return null;
    }
    
    return entry.response;
  }

  set(url: string, response: HttpResponse<any>): void {
    this.cache.set(url, {
      response: response.clone(),
      timestamp: Date.now()
    });
  }

  clear(): void {
    this.cache.clear();
  }
}

const httpCache = new HttpCache();

export const CacheInterceptor: HttpInterceptorFn = (req, next) => {
  // Only cache GET requests for API calls
  if (req.method === 'GET' && req.url.includes('/api/')) {
    const cachedResponse = httpCache.get(req.url);
    
    if (cachedResponse) {
      console.log(`Cache HIT for ${req.url}`);
      return of(cachedResponse);
    }
    
    console.log(`Cache MISS for ${req.url}`);
    return next(req).pipe(
      tap(event => {
        if (event instanceof HttpResponse && event.status === 200) {
          httpCache.set(req.url, event);
        }
      })
    );
  }
  
  return next(req);
};
