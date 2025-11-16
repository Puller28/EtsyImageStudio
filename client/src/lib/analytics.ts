// Define the gtag function globally
declare global {
  interface Window {
    dataLayer: any[];
    gtag: (...args: any[]) => void;
  }
}

// Initialize Google Analytics
export const initGA = () => {
  const measurementId = import.meta.env.VITE_GA_MEASUREMENT_ID;

  if (!measurementId) {
    console.warn('Missing required Google Analytics key: VITE_GA_MEASUREMENT_ID');
    return;
  }

  // Add Google Analytics script to the head
  const script1 = document.createElement('script');
  script1.async = true;
  script1.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  document.head.appendChild(script1);

  // Initialize gtag
  const script2 = document.createElement('script');
  script2.textContent = `
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', '${measurementId}', {
      page_title: document.title,
      page_location: window.location.href
    });
  `;
  document.head.appendChild(script2);

  console.log('✅ Google Analytics initialized with ID:', measurementId);
};

// Track page views - useful for single-page applications
export const trackPageView = (url: string) => {
  if (typeof window === 'undefined' || !window.gtag) return;
  
  const measurementId = import.meta.env.VITE_GA_MEASUREMENT_ID;
  if (!measurementId) return;
  
  window.gtag('config', measurementId, {
    page_path: url,
    page_title: document.title,
    page_location: window.location.href
  });
};

// Track events with enhanced parameters
export const trackEvent = (
  action: string, 
  category?: string, 
  label?: string, 
  value?: number,
  custom_parameters?: Record<string, any>
) => {
  if (typeof window === 'undefined' || !window.gtag) return;
  
  window.gtag('event', action, {
    event_category: category,
    event_label: label,
    value: value,
    ...custom_parameters,
  });
};

// Enhanced tracking functions for your specific app features
export const analytics = {
  // User authentication events
  login: (method: string = 'email') => {
    trackEvent('login', 'authentication', method);
  },

  signup: (method: string = 'email', userType: string = 'new_user') => {
    trackEvent('sign_up', 'authentication', method, undefined, {
      method: method,
      user_type: userType,
      signup_location: window.location.pathname
    });
  },

  logout: () => {
    trackEvent('logout', 'authentication');
  },

  // Image processing events
  imageUpload: (fileSize: number, fileType: string) => {
    trackEvent('image_upload', 'content_creation', fileType, fileSize, {
      file_size_mb: Math.round(fileSize / (1024 * 1024) * 100) / 100
    });
  },

  imageProcess: (upscaleOption: string, creditsUsed: number) => {
    trackEvent('image_process', 'content_creation', upscaleOption, creditsUsed, {
      upscale_option: upscaleOption,
      credits_used: creditsUsed
    });
  },

  imageProcessComplete: (processingTime: number, upscaleOption: string) => {
    trackEvent('image_process_complete', 'content_creation', upscaleOption, processingTime, {
      processing_time_seconds: processingTime,
      upscale_option: upscaleOption
    });
  },

  // Mockup generation events
  mockupGenerate: (templateCount: number, creditsUsed: number) => {
    trackEvent('mockup_generate', 'content_creation', `${templateCount}_templates`, creditsUsed, {
      template_count: templateCount,
      credits_used: creditsUsed
    });
  },

  mockupComplete: (templateCount: number, processingTime: number) => {
    trackEvent('mockup_complete', 'content_creation', `${templateCount}_templates`, processingTime, {
      template_count: templateCount,
      processing_time_seconds: processingTime
    });
  },

  mockupTemplateSelect: (roomType: string, templateId: string) => {
    trackEvent('mockup_template_select', 'user_interaction', `${roomType}_${templateId}`, undefined, {
      room_type: roomType,
      template_id: templateId
    });
  },

  // AI content generation
  etsyListingGenerate: (creditsUsed: number) => {
    trackEvent('etsy_listing_generate', 'ai_content', 'generate', creditsUsed, {
      credits_used: creditsUsed
    });
  },

  aiArtGenerate: (prompt: string, creditsUsed: number) => {
    trackEvent('ai_art_generate', 'ai_content', 'generate', creditsUsed, {
      credits_used: creditsUsed,
      prompt_length: prompt.length
    });
  },

  // Downloads and exports
  download: (contentType: string, format?: string) => {
    trackEvent('download', 'engagement', contentType, undefined, {
      content_type: contentType,
      format: format
    });
  },

  zipDownload: (itemCount: number) => {
    trackEvent('zip_download', 'engagement', 'bulk_download', itemCount, {
      item_count: itemCount
    });
  },

  // Credit and subscription events
  creditPurchase: (amount: number, credits: number, method: string) => {
    trackEvent('purchase', 'monetization', 'credits', amount, {
      credits_purchased: credits,
      payment_method: method,
      currency: 'ZAR'
    });
  },

  subscriptionStart: (planType: string, amount: number) => {
    trackEvent('begin_checkout', 'monetization', planType, amount, {
      plan_type: planType,
      currency: 'ZAR'
    });
  },

  subscriptionComplete: (planType: string, amount: number) => {
    trackEvent('purchase', 'monetization', planType, amount, {
      plan_type: planType,
      transaction_type: 'subscription',
      currency: 'ZAR'
    });
  },

  subscriptionCancel: (planType: string) => {
    trackEvent('subscription_cancel', 'monetization', planType);
  },

  // User engagement
  featureExplore: (feature: string) => {
    trackEvent('feature_explore', 'engagement', feature);
  },

  helpAccess: (section: string) => {
    trackEvent('help_access', 'engagement', section);
  },

  contactSubmit: (type: string) => {
    trackEvent('contact_submit', 'engagement', type);
  },

  // Performance tracking
  pageLoadTime: (pageName: string, loadTime: number) => {
    trackEvent('page_load_time', 'performance', pageName, loadTime, {
      load_time_ms: loadTime
    });
  },

  errorEncounter: (errorType: string, page: string, details?: string) => {
    trackEvent('error_encounter', 'technical', errorType, undefined, {
      page: page,
      error_details: details
    });
  },

  // User journey tracking
  funnelStep: (step: string, stepNumber: number) => {
    trackEvent('funnel_step', 'user_journey', step, stepNumber, {
      step_name: step,
      step_number: stepNumber
    });
  },

  // Onboarding events
  onboardingStarted: () => {
    trackEvent('onboarding_started', 'onboarding', 'ftux');
  },

  wizardStepCompleted: (stepNumber: number) => {
    trackEvent('wizard_step_completed', 'onboarding', `step_${stepNumber}`, stepNumber);
  },

  onboardingCompleted: () => {
    trackEvent('onboarding_completed', 'onboarding', 'ftux');
  },

  firstListingBundleGenerated: () => {
    trackEvent('first_listing_bundle_generated', 'onboarding', 'listing_bundle');
  }
};

// Enhanced user identification
export const identifyUser = (userId: string, properties?: Record<string, any>) => {
  if (typeof window === 'undefined' || !window.gtag) return;
  
  window.gtag('config', import.meta.env.VITE_GA_MEASUREMENT_ID, {
    user_id: userId,
    custom_map: properties
  });
};

// Track user plan changes
export const trackUserPlan = (planType: string, creditsRemaining: number) => {
  if (typeof window === 'undefined' || !window.gtag) return;
  
  window.gtag('event', 'user_plan_status', {
    event_category: 'user_profile',
    plan_type: planType,
    credits_remaining: creditsRemaining
  });
};