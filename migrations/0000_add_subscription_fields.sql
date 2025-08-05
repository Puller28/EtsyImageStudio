CREATE TABLE "projects" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"title" text NOT NULL,
	"original_image_url" text NOT NULL,
	"upscaled_image_url" text,
	"mockup_image_url" text,
	"mockup_images" jsonb,
	"resized_images" jsonb DEFAULT '[]'::jsonb,
	"etsy_listing" jsonb,
	"mockup_template" text,
	"upscale_option" text NOT NULL,
	"status" text DEFAULT 'uploading' NOT NULL,
	"zip_url" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"avatar" text,
	"credits" integer DEFAULT 100 NOT NULL,
	"subscription_status" text DEFAULT 'free',
	"subscription_plan" text,
	"subscription_id" text,
	"subscription_start_date" timestamp,
	"subscription_end_date" timestamp,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;