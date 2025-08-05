import { storage } from "./storage";

export class SubscriptionService {
  
  /**
   * Get subscription status for a user using Paystack API
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

      // If user has subscription ID, check with Paystack
      if (user.subscriptionId) {
        const paystackStatus = await this.checkPaystackSubscription(user.subscriptionId);
        
        if (paystackStatus.success) {
          // Update local database with latest status
          await storage.updateUserSubscription(userId, {
            subscriptionStatus: paystackStatus.status,
            subscriptionPlan: user.subscriptionPlan || undefined,
            subscriptionId: user.subscriptionId,
            subscriptionEndDate: paystackStatus.nextBillingDate ? new Date(paystackStatus.nextBillingDate) : undefined,
          });

          return {
            subscriptionStatus: paystackStatus.status,
            subscriptionPlan: user.subscriptionPlan || undefined,
            subscriptionId: user.subscriptionId,
            nextBillingDate: paystackStatus.nextBillingDate,
            isActive: paystackStatus.status === 'active'
          };
        }
      }

      // Return local status if no Paystack subscription or API call failed
      return {
        subscriptionStatus: user.subscriptionStatus || 'free',
        subscriptionPlan: user.subscriptionPlan || undefined,
        subscriptionId: user.subscriptionId || undefined,
        nextBillingDate: user.subscriptionEndDate?.toISOString(),
        isActive: user.subscriptionStatus === 'active'
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