/**
 * Analytics & User Journey Tracking Service
 * 
 * Tracks user behavior, conversion funnels, and marketing performance
 */

import { db } from "../db";
import { sql } from "drizzle-orm";

export interface UserJourneyEvent {
  userId?: string;
  sessionId: string;
  event: string;
  page: string;
  timestamp: Date;
  metadata?: Record<string, any>;
  source?: string; // utm_source
  medium?: string; // utm_medium
  campaign?: string; // utm_campaign
}

export interface MarketingMetrics {
  totalUsers: number;
  activeUsers: number; // Last 30 days
  newUsers: number; // Last 7 days
  conversionRate: number;
  averageCreditsUsed: number;
  topSources: { source: string; count: number }[];
  userJourney: {
    stage: string;
    count: number;
    dropoffRate: number;
  }[];
  revenueMetrics: {
    totalRevenue: number;
    averageRevenuePerUser: number;
    subscriptions: {
      active: number;
      cancelled: number;
      trial: number;
    };
  };
}

export interface ConversionFunnel {
  stage: string;
  users: number;
  dropoff: number;
  conversionRate: number;
}

export class AnalyticsService {
  /**
   * Track user journey event
   */
  static async trackEvent(event: UserJourneyEvent): Promise<void> {
    try {
      // Store in database (you'll need to create this table)
      // For now, we'll log it
      console.log("📊 User Journey Event:", {
        event: event.event,
        page: event.page,
        userId: event.userId || "anonymous",
        source: event.source,
      });

      // TODO: Store in analytics table for long-term tracking
    } catch (error) {
      console.error("Failed to track event:", error);
    }
  }

  /**
   * Get comprehensive marketing dashboard metrics
   */
  static async getMarketingMetrics(): Promise<MarketingMetrics> {
    try {
      // Use the shared db connection with Drizzle's execute method
      
      // Total users
      const totalUsersResult = await db.execute(sql`SELECT COUNT(*) as count FROM users`);
      const totalUsers = parseInt(totalUsersResult.rows[0].count as string);

      // Active users (logged in last 30 days)
      const activeUsersResult = await db.execute(sql`
        SELECT COUNT(*) as count 
        FROM users 
        WHERE last_login > NOW() - INTERVAL '30 days'
      `);
      const activeUsers = parseInt(activeUsersResult.rows[0].count as string);

      // New users (last 7 days)
      const newUsersResult = await db.execute(sql`
        SELECT COUNT(*) as count 
        FROM users 
        WHERE created_at > NOW() - INTERVAL '7 days'
      `);
      const newUsers = parseInt(newUsersResult.rows[0].count as string);

      // Average credits used
      const creditsResult = await db.execute(sql`
        SELECT AVG(100 - credits) as avg_used 
        FROM users 
        WHERE credits < 100
      `);
      const averageCreditsUsed = parseFloat((creditsResult.rows[0].avg_used as string) || "0");

      // Subscription metrics
      const subscriptionsResult = await db.execute(sql`
        SELECT 
          subscription_status,
          COUNT(*) as count
        FROM users
        WHERE subscription_status IS NOT NULL
        GROUP BY subscription_status
      `);

      const subscriptions = {
        active: 0,
        cancelled: 0,
        trial: 0,
      };

      subscriptionsResult.rows.forEach((row: any) => {
        if (row.subscription_status === "active") subscriptions.active = parseInt(row.count);
        if (row.subscription_status === "cancelled") subscriptions.cancelled = parseInt(row.count);
        if (row.subscription_status === "trial") subscriptions.trial = parseInt(row.count);
      });

      // Calculate conversion rate (users who used credits / total users)
      const usersWithActivityResult = await db.execute(sql`
        SELECT COUNT(*) as count 
        FROM users 
        WHERE credits < 100
      `);
      const usersWithActivity = parseInt(usersWithActivityResult.rows[0].count as string);
      const conversionRate = totalUsers > 0 ? (usersWithActivity / totalUsers) * 100 : 0;

      // User journey stages
      const userJourney = await this.getUserJourneyFunnel();

      // Revenue metrics (placeholder - implement based on your payment system)
      const revenueMetrics = {
        totalRevenue: subscriptions.active * 29 + subscriptions.trial * 0, // Estimate
        averageRevenuePerUser: totalUsers > 0 ? (subscriptions.active * 29) / totalUsers : 0,
        subscriptions,
      };

      return {
        totalUsers,
        activeUsers,
        newUsers,
        conversionRate,
        averageCreditsUsed,
        topSources: [], // TODO: Implement UTM tracking
        userJourney,
        revenueMetrics,
      };
    } catch (error) {
      console.error("Failed to get marketing metrics:", error);
      throw error;
    }
  }

  /**
   * Get user journey conversion funnel
   */
  static async getUserJourneyFunnel(): Promise<ConversionFunnel[]> {
    try {
      // Return mock data for now - analytics dashboard is non-critical
      // TODO: Implement proper analytics when needed

      // Stage 1: Signed up
      const signedUpResult = await query`SELECT COUNT(*) as count FROM users`;
      const signedUp = parseInt(signedUpResult[0].count);

      // Stage 2: Used any credits
      const usedCreditsResult = await query`
        SELECT COUNT(*) as count FROM users WHERE credits < 100
      `;
      const usedCredits = parseInt(usedCreditsResult[0].count);

      // Stage 3: Created a project
      const createdProjectResult = await query`
        SELECT COUNT(DISTINCT user_id) as count FROM projects
      `;
      const createdProject = parseInt(createdProjectResult[0].count);

      // Stage 4: Generated mockup
      const generatedMockupResult = await query`
        SELECT COUNT(DISTINCT user_id) as count 
        FROM projects 
        WHERE mockup_image_url IS NOT NULL
      `;
      const generatedMockup = parseInt(generatedMockupResult[0].count);

      // Stage 5: Subscribed
      const subscribedResult = await query`
        SELECT COUNT(*) as count 
        FROM users 
        WHERE subscription_status = 'active'
      `;
      const subscribed = parseInt(subscribedResult[0].count);

      const funnel: ConversionFunnel[] = [
        {
          stage: "Signed Up",
          users: signedUp,
          dropoff: 0,
          conversionRate: 100,
        },
        {
          stage: "Used Credits",
          users: usedCredits,
          dropoff: signedUp - usedCredits,
          conversionRate: signedUp > 0 ? (usedCredits / signedUp) * 100 : 0,
        },
        {
          stage: "Created Project",
          users: createdProject,
          dropoff: usedCredits - createdProject,
          conversionRate: signedUp > 0 ? (createdProject / signedUp) * 100 : 0,
        },
        {
          stage: "Generated Mockup",
          users: generatedMockup,
          dropoff: createdProject - generatedMockup,
          conversionRate: signedUp > 0 ? (generatedMockup / signedUp) * 100 : 0,
        },
        {
          stage: "Subscribed",
          users: subscribed,
          dropoff: generatedMockup - subscribed,
          conversionRate: signedUp > 0 ? (subscribed / signedUp) * 100 : 0,
        },
      ];

      return funnel;
    } catch (error) {
      console.error("Failed to get conversion funnel:", error);
      return [];
    }
  }

  /**
   * Get user retention cohort analysis
   */
  static async getRetentionCohorts(): Promise<any> {
    try {
      const sqlConn = await import("@neondatabase/serverless").then(m => m.neon);
      const dbUrl = process.env.DATABASE_URL;
      
      if (!dbUrl) {
        throw new Error("DATABASE_URL not configured");
      }

      const query = sqlConn(dbUrl);

      // Get users grouped by signup week
      const cohortsResult = await query`
        SELECT 
          DATE_TRUNC('week', created_at) as cohort_week,
          COUNT(*) as users,
          COUNT(CASE WHEN last_login > NOW() - INTERVAL '7 days' THEN 1 END) as active_week_1,
          COUNT(CASE WHEN last_login > NOW() - INTERVAL '14 days' THEN 1 END) as active_week_2,
          COUNT(CASE WHEN last_login > NOW() - INTERVAL '30 days' THEN 1 END) as active_week_4
        FROM users
        WHERE created_at > NOW() - INTERVAL '90 days'
        GROUP BY cohort_week
        ORDER BY cohort_week DESC
      `;

      return cohortsResult.map((row: any) => ({
        week: row.cohort_week,
        totalUsers: parseInt(row.users),
        retention: {
          week1: row.users > 0 ? (parseInt(row.active_week_1) / parseInt(row.users)) * 100 : 0,
          week2: row.users > 0 ? (parseInt(row.active_week_2) / parseInt(row.users)) * 100 : 0,
          week4: row.users > 0 ? (parseInt(row.active_week_4) / parseInt(row.users)) * 100 : 0,
        },
      }));
    } catch (error) {
      console.error("Failed to get retention cohorts:", error);
      return [];
    }
  }

  /**
   * Get top performing features
   */
  static async getFeatureUsage(): Promise<{ feature: string; usage: number; users: number }[]> {
    try {
      // Return mock data for now - analytics dashboard is non-critical
      // TODO: Implement proper analytics when needed

      const featuresResult = await query`
        SELECT 
          'AI Art Generation' as feature,
          COUNT(*) as usage,
          COUNT(DISTINCT user_id) as users
        FROM projects
        WHERE original_image_url LIKE '%generated%'
        
        UNION ALL
        
        SELECT 
          'Mockup Generation' as feature,
          COUNT(*) as usage,
          COUNT(DISTINCT user_id) as users
        FROM projects
        WHERE mockup_image_url IS NOT NULL
        
        UNION ALL
        
        SELECT 
          'Background Removal' as feature,
          COUNT(*) as usage,
          COUNT(DISTINCT user_id) as users
        FROM project_assets
        WHERE asset_type = 'background-removed'
      `;

      return featuresResult.map((row: any) => ({
        feature: row.feature,
        usage: parseInt(row.usage),
        users: parseInt(row.users),
      }));
    } catch (error) {
      console.error("Failed to get feature usage:", error);
      return [];
    }
  }
}
