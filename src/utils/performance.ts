import React from 'react';

// Performance monitoring utility
class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Map<string, number> = new Map();
  private warnings: string[] = [];

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  startTimer(name: string): void {
    this.metrics.set(name, performance.now());
  }

  endTimer(name: string): number {
    const startTime = this.metrics.get(name);
    if (startTime) {
      const duration = performance.now() - startTime;
      this.metrics.delete(name);
      
      // Log slow operations only in development
      if (duration > 1000) {
        const warning = `Slow operation detected: ${name} took ${duration.toFixed(2)}ms`;
        if (process.env.NODE_ENV === 'development') {
          console.warn(warning);
        }
        this.warnings.push(warning);
      }
      
      return duration;
    }
    return 0;
  }

  getWarnings(): string[] {
    return [...this.warnings];
  }

  clearWarnings(): void {
    this.warnings = [];
  }

  // Monitor React render performance
  monitorRender(componentName: string, renderFn: () => void): void {
    this.startTimer(`render_${componentName}`);
    renderFn();
    this.endTimer(`render_${componentName}`);
  }

  // Monitor async operations
  async monitorAsync<T>(name: string, asyncFn: () => Promise<T>): Promise<T> {
    this.startTimer(name);
    try {
      const result = await asyncFn();
      this.endTimer(name);
      return result;
    } catch (error) {
      this.endTimer(name);
      throw error;
    }
  }
}

export const performanceMonitor = PerformanceMonitor.getInstance();

// React hook for monitoring component renders
export const usePerformanceMonitor = (componentName: string) => {
  React.useEffect(() => {
    performanceMonitor.startTimer(`mount_${componentName}`);
    return () => {
      performanceMonitor.endTimer(`mount_${componentName}`);
    };
  }, [componentName]);

  return {
    monitorRender: (renderFn: () => void) => {
      performanceMonitor.monitorRender(componentName, renderFn);
    },
    monitorAsync: <T>(asyncFn: () => Promise<T>) => {
      return performanceMonitor.monitorAsync(componentName, asyncFn);
    }
  };
}; 