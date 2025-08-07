// Performance monitoring utilities

interface PerformanceMetrics {
  fcp: number; // First Contentful Paint
  lcp: number; // Largest Contentful Paint
  fid: number; // First Input Delay
  cls: number; // Cumulative Layout Shift
  ttfb: number; // Time to First Byte
}

class PerformanceMonitor {
  private metrics: Partial<PerformanceMetrics> = {};
  private observer: PerformanceObserver | null = null;

  constructor() {
    this.initializeObservers();
    this.measureTTFB();
  }

  private initializeObservers() {
    if (!('PerformanceObserver' in window)) return;

    // Наблюдатель для paint метрик
    this.observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        switch (entry.name) {
          case 'first-contentful-paint':
            this.metrics.fcp = entry.startTime;
            break;
        }
      }
    });

    try {
      this.observer.observe({ entryTypes: ['paint'] });
    } catch (e) {
      console.warn('Paint observer not supported');
    }

    // LCP Observer
    this.observeLCP();

    // FID Observer
    this.observeFID();

    // CLS Observer
    this.observeCLS();
  }

  private observeLCP() {
    if (!('PerformanceObserver' in window)) return;

    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      this.metrics.lcp = lastEntry.startTime;
    });

    try {
      observer.observe({ entryTypes: ['largest-contentful-paint'] });
    } catch (e) {
      console.warn('LCP observer not supported');
    }
  }

  private observeFID() {
    if (!('PerformanceObserver' in window)) return;

    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.name === 'first-input' && 'processingStart' in entry) {
          this.metrics.fid = (entry as any).processingStart - entry.startTime;
        }
      }
    });

    try {
      observer.observe({ entryTypes: ['first-input'] });
    } catch (e) {
      console.warn('FID observer not supported');
    }
  }

  private observeCLS() {
    if (!('PerformanceObserver' in window)) return;

    let clsValue = 0;
    let clsEntries: any[] = [];

    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!(entry as any).hadRecentInput) {
          const firstSessionEntry = clsEntries[0];
          const lastSessionEntry = clsEntries[clsEntries.length - 1];

          if (!lastSessionEntry || 
              entry.startTime - lastSessionEntry.startTime < 1000 &&
              entry.startTime - firstSessionEntry.startTime < 5000) {
            clsEntries.push(entry);
            clsValue += (entry as any).value;
          } else {
            clsEntries = [entry];
            clsValue = (entry as any).value;
          }
        }
      }

      this.metrics.cls = Math.max(clsValue, this.metrics.cls || 0);
    });

    try {
      observer.observe({ entryTypes: ['layout-shift'] });
    } catch (e) {
      console.warn('CLS observer not supported');
    }
  }

  private measureTTFB() {
    if (!('performance' in window) || !performance.timing) return;

    const { timing } = performance;
    this.metrics.ttfb = timing.responseStart - timing.navigationStart;
  }

  getMetrics(): Partial<PerformanceMetrics> {
    return { ...this.metrics };
  }

  getScore(): number {
    const { fcp, lcp, fid, cls, ttfb } = this.metrics;
    let score = 100;

    // FCP scoring (good: <1.8s, needs improvement: <3s, poor: >=3s)
    if (fcp) {
      if (fcp > 3000) score -= 20;
      else if (fcp > 1800) score -= 10;
    }

    // LCP scoring (good: <2.5s, needs improvement: <4s, poor: >=4s)
    if (lcp) {
      if (lcp > 4000) score -= 25;
      else if (lcp > 2500) score -= 15;
    }

    // FID scoring (good: <100ms, needs improvement: <300ms, poor: >=300ms)
    if (fid) {
      if (fid > 300) score -= 20;
      else if (fid > 100) score -= 10;
    }

    // CLS scoring (good: <0.1, needs improvement: <0.25, poor: >=0.25)
    if (cls) {
      if (cls >= 0.25) score -= 20;
      else if (cls >= 0.1) score -= 10;
    }

    // TTFB scoring (good: <800ms, needs improvement: <1800ms, poor: >=1800ms)
    if (ttfb) {
      if (ttfb > 1800) score -= 15;
      else if (ttfb > 800) score -= 5;
    }

    return Math.max(0, score);
  }

  logMetrics() {
    console.group('🚀 Performance Metrics');
    console.log('FCP (First Contentful Paint):', this.metrics.fcp ? `${this.metrics.fcp.toFixed(2)}ms` : 'N/A');
    console.log('LCP (Largest Contentful Paint):', this.metrics.lcp ? `${this.metrics.lcp.toFixed(2)}ms` : 'N/A');
    console.log('FID (First Input Delay):', this.metrics.fid ? `${this.metrics.fid.toFixed(2)}ms` : 'N/A');
    console.log('CLS (Cumulative Layout Shift):', this.metrics.cls ? this.metrics.cls.toFixed(4) : 'N/A');
    console.log('TTFB (Time to First Byte):', this.metrics.ttfb ? `${this.metrics.ttfb.toFixed(2)}ms` : 'N/A');
    console.log('Overall Score:', `${this.getScore()}/100`);
    console.groupEnd();
  }

  // Отправка метрик на сервер (для аналитики)
  sendMetrics(endpoint: string = '/api/analytics/performance') {
    if (Object.keys(this.metrics).length === 0) return;

    fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        metrics: this.metrics,
        score: this.getScore(),
        userAgent: navigator.userAgent,
        timestamp: Date.now(),
        url: window.location.href
      })
    }).catch(error => {
      console.warn('Failed to send performance metrics:', error);
    });
  }
}

// Utility функции
export const measureFunctionPerformance = <T extends (...args: any[]) => any>(
  fn: T,
  name?: string
): T => {
  return ((...args: any[]) => {
    const start = performance.now();
    const result = fn(...args);
    const end = performance.now();
    
    console.log(`⏱️ ${name || fn.name}: ${(end - start).toFixed(2)}ms`);
    
    return result;
  }) as T;
};

export const measureAsyncPerformance = async <T>(
  promise: Promise<T>,
  name: string
): Promise<T> => {
  const start = performance.now();
  try {
    const result = await promise;
    const end = performance.now();
    console.log(`⏱️ ${name}: ${(end - start).toFixed(2)}ms`);
    return result;
  } catch (error) {
    const end = performance.now();
    console.log(`⏱️ ${name} (failed): ${(end - start).toFixed(2)}ms`);
    throw error;
  }
};

// Memory usage monitor
export const getMemoryUsage = (): string => {
  if ('memory' in performance) {
    const memory = (performance as any).memory;
    return `Used: ${(memory.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB, Total: ${(memory.totalJSHeapSize / 1024 / 1024).toFixed(2)}MB`;
  }
  return 'Memory info not available';
};

// Connection speed detection
export const getConnectionSpeed = (): string => {
  if ('connection' in navigator) {
    const connection = (navigator as any).connection;
    return connection.effectiveType || 'unknown';
  }
  return 'unknown';
};

// Singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Auto-log metrics after page load
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    setTimeout(() => {
      performanceMonitor.logMetrics();
      
      // Auto-send metrics in production
      if (import.meta.env.PROD) {
        performanceMonitor.sendMetrics();
      }
    }, 2000);
  });
}
