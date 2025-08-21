import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, jsonb, boolean, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  password: text("password").notNull(), // Added password field for security
  avatar: text("avatar"),
  credits: integer("credits").notNull().default(100),
  subscriptionStatus: text("subscription_status").default("free"), // free, active, cancelled, expired
  subscriptionPlan: text("subscription_plan"), // pro_monthly, business_monthly
  subscriptionId: text("subscription_id"), // Paystack subscription ID
  subscriptionStartDate: timestamp("subscription_start_date"),
  subscriptionEndDate: timestamp("subscription_end_date"),
  createdAt: timestamp("created_at").default(sql`now()`),
});

export const projects = pgTable("projects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  originalImageUrl: text("original_image_url").notNull(),
  upscaledImageUrl: text("upscaled_image_url"),
  mockupImageUrl: text("mockup_image_url"),
  mockupImages: jsonb("mockup_images").$type<Record<string, string>>(),
  resizedImages: jsonb("resized_images").$type<string[]>().default([]),
  etsyListing: jsonb("etsy_listing").$type<{
    title: string;
    tags: string[];
    description: string;
  }>(),
  mockupTemplate: text("mockup_template"),
  upscaleOption: text("upscale_option").notNull().default("2x"),
  status: text("status").notNull().default("uploading"), // uploading, processing, completed, failed, ai-generated
  zipUrl: text("zip_url"),
  thumbnailUrl: text("thumbnail_url"), // For project previews
  aiPrompt: text("ai_prompt"), // Store AI generation prompt
  metadata: jsonb("metadata").$type<Record<string, any>>().default({}), // Additional flexible data
  createdAt: timestamp("created_at").default(sql`now()`),
});

export const processedPayments = pgTable("processed_payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  paymentReference: text("payment_reference").notNull().unique(),
  userId: varchar("user_id").notNull().references(() => users.id),
  creditsAllocated: integer("credits_allocated").notNull(),
  processedAt: timestamp("processed_at").default(sql`now()`),
});

export const creditTransactions = pgTable("credit_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  amount: integer("amount").notNull(), // Negative for deductions, positive for additions
  transactionType: text("transaction_type").notNull(), // "deduction" | "purchase" | "refund"
  description: text("description").notNull(), // "AI Art Generation", "2x Upscaling", "Mockup Generation", etc.
  balanceAfter: integer("balance_after").notNull(),
  projectId: varchar("project_id"), // Optional reference to project
  createdAt: timestamp("created_at").default(sql`now()`),
});

export const contactMessages = pgTable("contact_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email").notNull(),
  subject: text("subject").notNull(),
  message: text("message").notNull(),
  status: text("status").notNull().default("unread"), // unread, read, replied
  createdAt: timestamp("created_at").default(sql`now()`),
});

export const insertUserSchema = createInsertSchema(users).pick({
  email: true,
  name: true,
  password: true,
  avatar: true,
});

export const registerUserSchema = createInsertSchema(users).pick({
  email: true,
  name: true,
  password: true,
});

export const loginUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  createdAt: true,
}).extend({
  artworkTitle: z.string().min(1, "Artwork title is required"),
  styleKeywords: z.string().min(1, "Style keywords are required"),
});

export const insertCreditTransactionSchema = createInsertSchema(creditTransactions).omit({
  id: true,
  createdAt: true,
});

export const insertContactMessageSchema = createInsertSchema(contactMessages).omit({
  id: true,
  createdAt: true,
  status: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projects.$inferSelect;
export type InsertCreditTransaction = z.infer<typeof insertCreditTransactionSchema>;
export type CreditTransaction = typeof creditTransactions.$inferSelect;
export type InsertContactMessage = z.infer<typeof insertContactMessageSchema>;
export type ContactMessage = typeof contactMessages.$inferSelect;
