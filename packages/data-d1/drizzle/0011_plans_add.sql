CREATE TABLE `plan_meal_ingredients` (
	`id` text PRIMARY KEY NOT NULL,
	`plan_meal_id` text NOT NULL,
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
	FOREIGN KEY (`plan_meal_id`) REFERENCES `plan_meals`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `plan_meals` (
	`id` text PRIMARY KEY NOT NULL,
	`plan_id` text NOT NULL,
	`name` text NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`plan_id`) REFERENCES `plans`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `plan_meals_plan_idx` ON `plan_meals` (`plan_id`);--> statement-breakpoint
CREATE TABLE `plans` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user_profiles`(`clerk_user_id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `plans_user_idx` ON `plans` (`user_id`);--> statement-breakpoint
ALTER TABLE `goals` ADD `default_plan_id` text REFERENCES plans(id);