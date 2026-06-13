CREATE TABLE `meal_template_ingredients` (
	`id` text PRIMARY KEY NOT NULL,
	`template_id` text NOT NULL,
	`name` text NOT NULL,
	`weight` real DEFAULT 0 NOT NULL,
	`calories` real DEFAULT 0 NOT NULL,
	`fat` real DEFAULT 0 NOT NULL,
	`saturated_fat` real DEFAULT 0 NOT NULL,
	`carbs` real DEFAULT 0 NOT NULL,
	`fiber` real DEFAULT 0 NOT NULL,
	`protein` real DEFAULT 0 NOT NULL,
	`unsaturated_fat` real,
	`monounsaturated_fat` real,
	`polyunsaturated_fat` real,
	`trans_fat` real,
	`sugar` real,
	`sugar_alcohol` real,
	`allulose` real,
	`alcohol` real,
	`calorie_source` text DEFAULT 'estimated' NOT NULL,
	`estimated_calories` real DEFAULT 0 NOT NULL,
	`micronutrients_json` text,
	`source_database_ingredient_id` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`template_id`) REFERENCES `meal_templates`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `meal_templates` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user_profiles`(`clerk_user_id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `meal_templates_user_idx` ON `meal_templates` (`user_id`);--> statement-breakpoint
ALTER TABLE `meals` ADD `origin` text DEFAULT 'adhoc' NOT NULL;--> statement-breakpoint
ALTER TABLE `meals` ADD `logged` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `user_profiles` ADD `meal_templates_seeded_at` text;