import { useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import { trackPageView, analytics } from '../lib/analytics';

export const useAnalytics = () => {
  const [location] = useLocation();
  const prevLocationRef = useRef<string>(location);
  const pageStartTime = useRef<number>(Date.now());
  
  useEffect(() => {
    if (location !== prevLocationRef.current) {
      // Track page load time for previous page
      if (prevLocationRef.current) {
        const loadTime = Date.now() - pageStartTime.current;
        const pageName = getPageName(prevLocationRef.current);
        analytics.pageLoadTime(pageName, loadTime);
      }

      // Track new page view
      trackPageView(location);
      
      // Track funnel steps
      trackFunnelStep(location);
      
      // Reset timer for new page
      pageStartTime.current = Date.now();
      prevLocationRef.current = location;
    }
  }, [location]);

  // Track user journey through the funnel
  const trackFunnelStep = (path: string) => {
    const funnelSteps: Record<string, { step: string; number: number }> = {
      '/': { step: 'landing_page', number: 1 },
      '/dashboard': { step: 'dashboard_view', number: 2 },
      '/mockups': { step: 'mockup_creation', number: 3 },
      '/pricing': { step: 'pricing_view', number: 4 },
      '/buy-credits': { step: 'credit_purchase', number: 5 },
      '/settings': { step: 'account_management', number: 6 }
    };

    const stepInfo = funnelSteps[path];
    if (stepInfo) {
      analytics.funnelStep(stepInfo.step, stepInfo.number);
    }
  };

  const getPageName = (path: string): string => {
    const pageNames: Record<string, string> = {
      '/': 'landing',
      '/dashboard': 'dashboard',
      '/mockups': 'mockups',
      '/pricing': 'pricing',
      '/buy-credits': 'buy_credits',
      '/settings': 'settings',
      '/contact': 'contact'
    };
    return pageNames[path] || 'unknown';
  };
};

// Hook for tracking user interactions
export const useUserTracking = () => {
  return {
    trackFeatureUsage: (feature: string) => {
      analytics.featureExplore(feature);
    },
    
    trackError: (error: Error, context: string) => {
      analytics.errorEncounter(error.name, context, error.message);
    },
    
    trackTiming: (action: string, startTime: number, category: string = 'timing') => {
      const duration = Date.now() - startTime;
      analytics.pageLoadTime(action, duration);
    }
  };
};