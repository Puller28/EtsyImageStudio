import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, jsonb, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  avatar: text("avatar"),
  credits: integer("credits").notNull().default(100),
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
  resizedImages: jsonb("resized_images").$type<Array<{size: string; url: string}>>().default([]),
  etsyListing: jsonb("etsy_listing").$type<{
    title: string;
    tags: string[];
    description: string;
  }>(),
  mockupTemplate: text("mockup_template"),
  upscaleOption: text("upscale_option").notNull().default("2x"),
  status: text("status").notNull().default("uploading"), // uploading, processing, completed, failed, ai-generated
  zipUrl: text("zip_url"),
  createdAt: timestamp("created_at").default(sql`now()`),
});

export const processedPayments = pgTable("processed_payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  paymentReference: text("payment_reference").notNull().unique(),
  userId: varchar("user_id").notNull().references(() => users.id),
  creditsAllocated: integer("credits_allocated").notNull(),
  processedAt: timestamp("processed_at").default(sql`now()`),
});

// Schema validation
export const insertUserSchema = createInsertSchema(users).pick({
  email: true,
  name: true,
  avatar: true,
});

export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  createdAt: true,
}).extend({
  artworkTitle: z.string().min(1, "Artwork title is required"),
  styleKeywords: z.string().min(1, "Style keywords are required"),
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projects.$inferSelect;
export type ProcessedPayment = typeof processedPayments.$inferSelect;