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
      const user = await storage.getUser(userId);
      if (!user) {
        return { subscriptionStatus: 'free', isActive: false };
      }

      // Check if user has made any subscription payments via Paystack
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

      // If user has stored subscription ID, verify with Paystack
      if (user.subscriptionId) {
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

      // Return free status if no active subscription found
      return {
        subscriptionStatus: 'free',
        subscriptionPlan: undefined,
        subscriptionId: undefined,
        nextBillingDate: undefined,
        isActive: false
      };
    } catch (error) {
      console.error('Error getting subscription status:', error);
      return { subscriptionStatus: 'free', isActive: false };
    }
  }

  /**
   * Cancel a subscription via Paystack API
   */
  static async cancelSubscription(userId: string, subscriptionId: string): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      // Call Paystack API to cancel subscription
      const response = await fetch(`https://api.paystack.co/subscription/disable`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          code: subscriptionId,
          token: subscriptionId // Use subscription ID as token
        })
      });

      const data = await response.json();
      
      if (data.status) {
        // Update local database
        await storage.updateUserSubscription(userId, {
          subscriptionStatus: 'cancelled',
        });

        return {
          success: true,
          message: 'Subscription cancelled successfully. You can continue using your current plan until the end of the billing period.'
        };
      } else {
        return {
          success: false,
          message: data.message || 'Failed to cancel subscription'
        };
      }
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