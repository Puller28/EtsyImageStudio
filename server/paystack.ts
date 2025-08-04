// @ts-ignore - paystack-api doesn't have TypeScript definitions
import Paystack from 'paystack-api';

if (!process.env.PAYSTACK_SECRET_KEY) {
  throw new Error('PAYSTACK_SECRET_KEY environment variable is required');
}

const paystack = Paystack(process.env.PAYSTACK_SECRET_KEY);

// One-time credit packages (top-ups)
export const creditPackages = [
  {
    id: 'credits_50',
    name: '50 Credits',
    credits: 50,
    usdPrice: 5,
    zarPrice: 9500, // R95.00
    description: 'Perfect for getting started with AI art generation',
    type: 'one-time'
  },
  {
    id: 'credits_100',
    name: '100 Credits',
    credits: 100,
    usdPrice: 9,
    zarPrice: 17000, // R170.00 (10% discount)
    description: 'Great value for regular users',
    type: 'one-time'
  },
  {
    id: 'credits_250',
    name: '250 Credits',
    credits: 250,
    usdPrice: 20,
    zarPrice: 38000, // R380.00 (20% discount)
    description: 'Best value for power users',
    type: 'one-time'
  },
  {
    id: 'credits_500',
    name: '500 Credits',
    credits: 500,
    usdPrice: 35,
    zarPrice: 66500, // R665.00 (30% discount)
    description: 'Maximum credits for professional use',
    type: 'one-time'
  }
];

// Subscription plans
export const subscriptionPlans = [
  {
    id: 'pro_monthly',
    name: 'Pro Plan',
    credits: 300,
    usdPrice: 19.95,
    zarPrice: 37905, // R379.05 monthly
    interval: 'monthly',
    description: 'Monthly subscription with 300 credits',
    type: 'subscription',
    features: [
      '300 credits per month',
      '150 AI generations',
      '300 upscaling operations',
      'Priority processing',
      'Email support'
    ]
  },
  {
    id: 'business_monthly',
    name: 'Business Plan',
    credits: 1000,
    usdPrice: 59,
    zarPrice: 112100, // R1,121.00 monthly
    interval: 'monthly',
    description: 'Monthly subscription with 1000 credits',
    type: 'subscription',
    features: [
      '1,000 credits per month',
      '500 AI generations',
      '1,000 upscaling operations',
      'Priority processing',
      'Premium support',
      'Commercial license'
    ]
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
      const response = await paystack.transaction.initialize({
        email: data.email,
        amount: data.amount,
        currency: data.currency,
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
      console.error('Paystack initialization error:', error);
      return {
        success: false,
        error: error.message || 'Payment initialization failed'
      };
    }
  }

  static async verifyPayment(reference: string) {
    try {
      const response = await paystack.transaction.verify(reference);
      
      return {
        success: response.data.status === 'success',
        data: response.data
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