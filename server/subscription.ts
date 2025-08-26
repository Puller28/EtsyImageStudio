import { storage } from "./storage";

export class SubscriptionService {
  
  /**
   * Get subscription status for a user using Paystack payment history
   */
  static async getSubscriptionStatus(userId: string): Promise<{
    subscriptionStatus: string;
    subscriptionPlan?: string;
    subscriptionId?: string;
    nextBillingDate?: string;
    isActive: boolean;
  }> {
    try {
      const user = await storage.getUserById(userId);
      if (!user) {
        return { subscriptionStatus: 'free', isActive: true };
      }

      // Check if user has a cancelled subscription that's still active FIRST
      // (Don't override cancelled status with payment detection)
      if (user.subscriptionStatus === 'cancelled' && user.subscriptionEndDate) {
        const now = new Date();
        const endDate = new Date(user.subscriptionEndDate);
        
        // If still within billing period, maintain access
        if (endDate > now) {
          return {
            subscriptionStatus: 'cancelled',
            subscriptionPlan: user.subscriptionPlan || undefined,
            subscriptionId: user.subscriptionId || undefined,
            nextBillingDate: user.subscriptionEndDate.toISOString(),
            isActive: true // Still active until end date
          };
        } else {
          // Billing period has ended, subscription is truly expired
          await storage.updateUserSubscription(userId, {
            subscriptionStatus: 'expired',
            subscriptionPlan: undefined,
            subscriptionId: undefined,
          });
          return {
            subscriptionStatus: 'expired',
            subscriptionPlan: undefined,
            subscriptionId: undefined,
            nextBillingDate: undefined,
            isActive: false
          };
        }
      }

      // If user has stored subscription ID, verify with Paystack
      if (user.subscriptionId && user.subscriptionStatus === 'active') {
        const paystackStatus = await this.checkPaystackSubscription(user.subscriptionId);
        
        if (paystackStatus.success && paystackStatus.status === 'active') {
          return {
            subscriptionStatus: paystackStatus.status,
            subscriptionPlan: user.subscriptionPlan || undefined,
            subscriptionId: user.subscriptionId,
            nextBillingDate: paystackStatus.nextBillingDate,
            isActive: true
          };
        }
      }

      // Check if user has made any subscription payments via Paystack
      // (Only if not already cancelled)
      if (user.subscriptionStatus !== 'cancelled') {
        const subscriptionFromPayments = await this.detectSubscriptionFromPayments(user.email);
        
        if (subscriptionFromPayments.hasActiveSubscription) {
          // Update local database with detected subscription
          await storage.updateUserSubscription(userId, {
            subscriptionStatus: 'active',
            subscriptionPlan: subscriptionFromPayments.planId,
            subscriptionId: subscriptionFromPayments.subscriptionId,
            subscriptionStartDate: subscriptionFromPayments.startDate,
            subscriptionEndDate: subscriptionFromPayments.endDate,
          });

          return {
            subscriptionStatus: 'active',
            subscriptionPlan: subscriptionFromPayments.planId,
            subscriptionId: subscriptionFromPayments.subscriptionId,
            nextBillingDate: subscriptionFromPayments.endDate?.toISOString(),
            isActive: true
          };
        }
      }

      // Return free status if no active subscription found
      // Make sure free users have the correct status set in database
      if (!user.subscriptionStatus || user.subscriptionStatus === '') {
        await storage.updateUserSubscription(userId, {
          subscriptionStatus: 'free',
          subscriptionPlan: undefined,
          subscriptionId: undefined,
        });
      }
      
      return {
        subscriptionStatus: 'free',
        subscriptionPlan: undefined,
        subscriptionId: undefined,
        nextBillingDate: undefined,
        isActive: true // Free plans are active - users get 100 credits monthly
      };
    } catch (error) {
      console.error('Error getting subscription status:', error);
      return { subscriptionStatus: 'free', isActive: true };
    }
  }

  /**
   * Cancel a subscription - maintains access until end of billing period
   */
  static async cancelSubscription(userId: string, subscriptionId: string): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      const user = await storage.getUserById(userId);
      if (!user) {
        return { success: false, message: 'User not found' };
      }

      console.log('🔍 Cancellation Debug:', {
        userId,
        subscriptionId,
        subscriptionIdType: subscriptionId?.startsWith('sub_') ? 'real_paystack' : 'payment_reference',
        user: {
          subscriptionStatus: user.subscriptionStatus,
          subscriptionPlan: user.subscriptionPlan,
          subscriptionEndDate: user.subscriptionEndDate
        }
      });

      // CRITICAL: All subscriptions must be cancelled with Paystack regardless of ID format
      // Even if it's a payment reference, we need to find and cancel the actual subscription
      console.log('🔍 Processing cancellation for subscription:', subscriptionId);
      
      // Try to find the actual Paystack subscription by customer email
      const paystackSubscription = await this.findActiveSubscriptionByEmail(user.email);
      
      if (paystackSubscription.success && paystackSubscription.subscriptionCode) {
        console.log('🔍 Found active Paystack subscription, attempting to cancel:', paystackSubscription.subscriptionCode);
        
        try {
          // Get full subscription details to retrieve email token
          const subscriptionDetails = await this.getSubscriptionDetails(paystackSubscription.subscriptionCode);
          
          if (!subscriptionDetails.success || !subscriptionDetails.emailToken) {
            throw new Error('Could not retrieve subscription email token');
          }
          
          const response = await fetch(`https://api.paystack.co/subscription/disable`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              code: paystackSubscription.subscriptionCode,
              token: subscriptionDetails.emailToken
            })
          });

          const data = await response.json();
          console.log('🔍 Paystack disable response:', data);
          
          if (data.status === true) {
            console.log('✅ Paystack subscription successfully cancelled');
            
            await storage.updateUserSubscription(userId, {
              subscriptionStatus: 'cancelled',
            });

            const endDate = user?.subscriptionEndDate;
            const endDateString = endDate ? endDate.toLocaleDateString() : 'the end of your billing period';

            return {
              success: true,
              message: `Subscription cancelled successfully with Paystack. You'll continue to have full access until ${endDateString}. No future charges will occur.`
            };
          }
        } catch (error) {
          console.error('❌ Error cancelling with Paystack:', error);
        }
      }
      
      // Fallback: Local cancellation only
      console.log('⚠️ WARNING: Could not cancel with Paystack, proceeding with local cancellation only');
      
      await storage.updateUserSubscription(userId, {
        subscriptionStatus: 'cancelled',
      });

      const endDate = user?.subscriptionEndDate;
      const endDateString = endDate ? endDate.toLocaleDateString() : 'the end of your billing period';

      return {
        success: true,
        message: `Subscription cancelled locally. You'll continue to have access until ${endDateString}. IMPORTANT: Please verify with Paystack that no future charges will occur.`
      };
    } catch (error: any) {
      console.error('Error cancelling subscription:', error);
      return {
        success: false,
        message: 'Unable to cancel subscription at this time. Please try again later.'
      };
    }
  }

  /**
   * Check subscription status with Paystack API
   */
  private static async checkPaystackSubscription(subscriptionId: string): Promise<{
    success: boolean;
    status: string;
    nextBillingDate?: string;
  }> {
    try {
      const response = await fetch(`https://api.paystack.co/subscription/${subscriptionId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      if (data.status && data.data) {
        return {
          success: true,
          status: data.data.status, // 'active', 'cancelled', 'not_renewing', etc.
          nextBillingDate: data.data.next_payment_date
        };
      } else {
        return {
          success: false,
          status: 'unknown'
        };
      }
    } catch (error) {
      console.error('Error checking Paystack subscription:', error);
      return {
        success: false,
        status: 'unknown'
      };
    }
  }

  /**
   * Detect subscription from Paystack payment history
   */
  private static async detectSubscriptionFromPayments(userEmail: string): Promise<{
    hasActiveSubscription: boolean;
    planId?: string;
    subscriptionId?: string;
    startDate?: Date;
    endDate?: Date;
  }> {
    try {
      // Check Paystack for recent subscription payments for this user
      const response = await fetch('https://api.paystack.co/transaction', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        return { hasActiveSubscription: false };
      }

      const data = await response.json();
      
      // Look for successful subscription payments from this user
      const userPayments = data.data?.filter((transaction: any) => 
        transaction.customer?.email === userEmail &&
        transaction.status === 'success' &&
        transaction.metadata?.planId &&
        transaction.metadata?.planId.includes('monthly')
      ) || [];

      if (userPayments.length > 0) {
        // Get the most recent subscription payment
        const latestPayment = userPayments[0];
        const paymentDate = new Date(latestPayment.created_at);
        const endDate = new Date(paymentDate);
        endDate.setMonth(endDate.getMonth() + 1); // Add 1 month

        // Check if subscription is still active (within 1 month of payment)
        const isActive = endDate > new Date();

        if (isActive) {
          return {
            hasActiveSubscription: true,
            planId: latestPayment.metadata.planId,
            subscriptionId: latestPayment.reference,
            startDate: paymentDate,
            endDate: endDate
          };
        }
      }

      return { hasActiveSubscription: false };
    } catch (error) {
      console.error('Error detecting subscription from payments:', error);
      return { hasActiveSubscription: false };
    }
  }

  /**
   * Find active Paystack subscription by email
   */
  private static async findActiveSubscriptionByEmail(email: string): Promise<{
    success: boolean;
    subscriptionCode?: string;
  }> {
    try {
      console.log('🔍 Searching for active Paystack subscriptions for:', email);
      
      const response = await fetch('https://api.paystack.co/subscription', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        console.error('❌ Failed to fetch subscriptions from Paystack');
        return { success: false };
      }

      const data = await response.json();
      console.log('🔍 Total subscriptions found:', data.data?.length || 0);
      
      // Find active subscriptions for this customer
      const activeSubscriptions = data.data?.filter((sub: any) => 
        sub.customer?.email === email &&
        sub.status === 'active'
      ) || [];

      console.log('🔍 Active subscriptions for user:', activeSubscriptions.length);
      
      if (activeSubscriptions.length > 0) {
        const subscription = activeSubscriptions[0]; // Use the first active subscription
        console.log('✅ Found active subscription:', subscription.subscription_code);
        
        return {
          success: true,
          subscriptionCode: subscription.subscription_code
        };
      }

      console.log('❌ No active subscriptions found for user');
      return { success: false };
    } catch (error) {
      console.error('❌ Error searching for subscriptions:', error);
      return { success: false };
    }
  }

  /**
   * Get full subscription details from Paystack including email token
   */
  private static async getSubscriptionDetails(subscriptionCode: string): Promise<{
    success: boolean;
    emailToken?: string;
    status?: string;
  }> {
    try {
      console.log('🔍 Fetching subscription details for:', subscriptionCode);
      
      const response = await fetch(`https://api.paystack.co/subscription/${subscriptionCode}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        console.error('❌ Failed to fetch subscription details from Paystack');
        return { success: false };
      }

      const data = await response.json();
      
      if (data.status && data.data) {
        console.log('✅ Retrieved subscription details successfully');
        return {
          success: true,
          emailToken: data.data.email_token,
          status: data.data.status
        };
      } else {
        return { success: false };
      }
    } catch (error) {
      console.error('❌ Error fetching subscription details:', error);
      return { success: false };
    }
  }

  /**
   * Update subscription status after successful payment
   */
  static async activateSubscription(userId: string, subscriptionData: {
    planId: string;
    subscriptionId: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<void> {
    try {
      await storage.updateUserSubscription(userId, {
        subscriptionStatus: 'active',
        subscriptionPlan: subscriptionData.planId,
        subscriptionId: subscriptionData.subscriptionId,
        subscriptionStartDate: subscriptionData.startDate || new Date(),
        subscriptionEndDate: subscriptionData.endDate,
      });

      console.log(`✅ Activated subscription for user ${userId}: ${subscriptionData.planId}`);
    } catch (error) {
      console.error('Error activating subscription:', error);
    }
  }
}