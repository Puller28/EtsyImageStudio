// @ts-ignore - paystack-api doesn't have TypeScript definitions
import Paystack from 'paystack-api';

if (!process.env.PAYSTACK_SECRET_KEY) {
  throw new Error('PAYSTACK_SECRET_KEY environment variable is required');
}

const paystack = Paystack(process.env.PAYSTACK_SECRET_KEY);

// Credit packages with USD display prices and ZAR payment amounts
export const creditPackages = [
  {
    id: 'credits_50',
    name: '50 Credits',
    credits: 50,
    usdPrice: 5,
    zarPrice: 9500, // R95.00 (approximate conversion)
    description: 'Perfect for getting started with AI art generation'
  },
  {
    id: 'credits_100',
    name: '100 Credits',
    credits: 100,
    usdPrice: 9,
    zarPrice: 17000, // R170.00 (10% discount)
    description: 'Great value for regular users'
  },
  {
    id: 'credits_250',
    name: '250 Credits',
    credits: 250,
    usdPrice: 20,
    zarPrice: 38000, // R380.00 (20% discount)
    description: 'Best value for power users'
  },
  {
    id: 'credits_500',
    name: '500 Credits',
    credits: 500,
    usdPrice: 35,
    zarPrice: 66500, // R665.00 (30% discount)
    description: 'Maximum credits for professional use'
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

  static getAllCreditPackages() {
    return creditPackages;
  }
}

export { paystack };