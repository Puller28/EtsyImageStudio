// @ts-ignore - paystack-api doesn't have TypeScript definitions
import Paystack from 'paystack-api';

if (!process.env.PAYSTACK_SECRET_KEY) {
  throw new Error('PAYSTACK_SECRET_KEY environment variable is required');
}

// Environment detection
const isTestMode = process.env.PAYSTACK_SECRET_KEY.startsWith('sk_test_');
const isLiveMode = process.env.PAYSTACK_SECRET_KEY.startsWith('sk_live_');

if (!isTestMode && !isLiveMode) {
  console.warn('⚠️ Paystack key format not recognized. Expected sk_test_ or sk_live_ prefix.');
}

console.log(`🔑 Paystack initialized in ${isTestMode ? 'TEST' : 'LIVE'} mode`);

// Production safety check
if (process.env.NODE_ENV === 'production' && isTestMode) {
  console.warn('⚠️ WARNING: Using TEST keys in PRODUCTION environment!');
  console.warn('⚠️ Switch to LIVE keys for real payments');
}

const paystack = Paystack(process.env.PAYSTACK_SECRET_KEY);

// One-time credit packages (top-ups) - Priced higher than subscriptions to encourage monthly plans
export const creditPackages = [
  {
    id: 'credits_50',
    name: '50 Credits',
    credits: 50,
    usdPrice: 6,
    zarPrice: 11400, // R114.00 (R2.28 per credit)
    description: 'Small top-up for quick projects',
    type: 'one-time'
  },
  {
    id: 'credits_100',
    name: '100 Credits',
    credits: 100,
    usdPrice: 11,
    zarPrice: 20900, // R209.00 (R2.09 per credit, 8% discount)
    description: 'Perfect for additional credits',
    type: 'one-time'
  },
  {
    id: 'credits_200',
    name: '200 Credits',
    credits: 200,
    usdPrice: 20,
    zarPrice: 38000, // R380.00 (R1.90 per credit, 17% discount)
    description: 'Great value for extra credits',
    type: 'one-time'
  },
  {
    id: 'credits_400',
    name: '400 Credits',
    credits: 400,
    usdPrice: 36,
    zarPrice: 68400, // R684.00 (R1.71 per credit, 25% discount)
    description: 'Maximum credits for heavy usage',
    type: 'one-time'
  }
];

// Subscription plans
export const subscriptionPlans = [
  {
    id: 'free',
    name: 'Free Plan',
    credits: 100,
    usdPrice: 0,
    zarPrice: 0,
    interval: 'monthly',
    description: 'Free monthly credits to get started',
    type: 'free',
    features: [
      '100 credits per month',
      'AI art generation',
      'Image upscaling (2x/4x)',
      'Print format resizing',
      'Etsy listing generation',
      'Free mockup generation (2 mockups at 1 credit each)',
      'Basic AI tools'
    ]
  },
  {
    id: 'pro_monthly',
    name: 'Pro Plan',
    credits: 300,
    usdPrice: 19.95,
    zarPrice: 38000,
    interval: 'monthly',
    description: 'Perfect for regular AI art creators',
    type: 'subscription',
    features: [
      '300 credits per month',
      'All Free plan features',
      'Premium mockup generation (5 templates at 3 credits each)',
      'Premium room templates',
      'Priority processing'
    ],
    paystackPlanCode: 'PLN_0yglvnu9bd129yz'
  },
  {
    id: 'business_monthly',
    name: 'Business Plan',
    credits: 800,
    usdPrice: 49,
    zarPrice: 93100,
    interval: 'monthly',
    description: 'For serious Etsy sellers and agencies',
    type: 'subscription',
    features: [
      '800 credits per month',
      'All Pro plan features',
      'Premium mockup generation (5 templates at 3 credits each)', 
      'More credits for heavy usage',
      'Suitable for agencies & teams',
      'Best value per credit'
    ],
    paystackPlanCode: 'PLN_5tvhdoebxsxhddg'
  }
];

export interface PaymentInitializationData {
  email: string;
  amount: number; // Amount in kobo (ZAR cents)
  currency: 'ZAR';
  metadata: {
    creditPackageId: string;
    credits: number;
    userId: string;
  };
  callback_url: string;
}

export class PaystackService {
  
  // Create a subscription plan in Paystack
  static async createPlan(planData: {
    name: string;
    amount: number;
    interval: string;
    description: string;
  }) {
    try {
      const response = await paystack.plan.create({
        name: planData.name,
        amount: planData.amount,
        interval: planData.interval,
        description: planData.description,
        currency: 'ZAR'
      });

      return {
        success: true,
        data: response.data
      };
    } catch (error: any) {
      console.error('Paystack plan creation error:', error);
      return {
        success: false,
        error: error.message || 'Plan creation failed'
      };
    }
  }

  // Initialize subscription payment
  static async initializeSubscription(data: {
    email: string;
    planCode: string;
    amount: number;
    metadata: {
      planId: string;
      credits: number;
      userId: string;
    };
    callback_url: string;
  }) {
    try {
      const response = await paystack.transaction.initialize({
        email: data.email,
        plan: data.planCode,
        amount: data.amount, // Amount in kobo (ZAR cents)
        metadata: data.metadata,
        callback_url: data.callback_url
      });

      return {
        success: true,
        data: {
          authorization_url: response.data.authorization_url,
          access_code: response.data.access_code,
          reference: response.data.reference
        }
      };
    } catch (error: any) {
      console.error('Paystack subscription initialization error:', error);
      return {
        success: false,
        error: error.message || 'Subscription initialization failed'
      };
    }
  }
  
  static async initializePayment(data: PaymentInitializationData) {
    try {
      console.log('🔍 Initializing payment:', {
        email: data.email,
        amount: data.amount,
        currency: data.currency,
        environment: isTestMode ? 'TEST' : 'LIVE'
      });

      const response = await paystack.transaction.initialize({
        email: data.email,
        amount: data.amount,
        currency: data.currency,
        metadata: data.metadata,
        callback_url: data.callback_url
      });

      console.log('✅ Payment initialization successful');
      return {
        success: true,
        data: {
          authorization_url: response.data.authorization_url,
          access_code: response.data.access_code,
          reference: response.data.reference
        }
      };
    } catch (error: any) {
      console.error('❌ Paystack initialization error:', error);
      
      // Enhanced error reporting for production debugging
      if (error.response) {
        console.error('❌ Paystack API response:', {
          status: error.response.status,
          data: error.response.data
        });
      }
      
      return {
        success: false,
        error: error.message || 'Payment initialization failed'
      };
    }
  }

  static async verifyPayment(reference: string) {
    try {
      console.log('🔍 Verifying payment with reference:', reference);
      
      if (!reference || typeof reference !== 'string') {
        throw new Error('Invalid reference parameter');
      }
      
      // Make direct API call to avoid library bug
      const response = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Paystack API error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      console.log('🔍 Paystack API response:', { 
        success: data?.data?.status === 'success',
        status: data?.data?.status,
        hasMetadata: !!data?.data?.metadata 
      });
      
      return {
        success: data.data.status === 'success',
        data: data.data
      };
    } catch (error: any) {
      console.error('Paystack verification error:', error);
      return {
        success: false,
        error: error.message || 'Payment verification failed'
      };
    }
  }

  static getCreditPackage(packageId: string) {
    return creditPackages.find(pkg => pkg.id === packageId);
  }

  static getSubscriptionPlan(planId: string) {
    return subscriptionPlans.find(plan => plan.id === planId);
  }

  static getAllCreditPackages() {
    return creditPackages;
  }

  static getAllSubscriptionPlans() {
    return subscriptionPlans;
  }

  static getAllPlans() {
    return {
      creditPackages,
      subscriptionPlans
    };
  }
}

export { paystack };