CREATE TABLE `daily_meal_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`date` text NOT NULL,
	`target_calories` integer DEFAULT 2000 NOT NULL,
	`target_fat` integer DEFAULT 70 NOT NULL,
	`target_carbs` integer DEFAULT 250 NOT NULL,
	`target_protein` integer DEFAULT 140 NOT NULL,
	`meal_count_target` integer DEFAULT 3 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user_profiles`(`clerk_user_id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `daily_meal_logs_user_date_idx` ON `daily_meal_logs` (`user_id`,`date`);--> statement-breakpoint
CREATE TABLE `ingredients` (
	`id` text PRIMARY KEY NOT NULL,
	`meal_id` text NOT NULL,
	`name` text NOT NULL,
	`weight` real DEFAULT 0 NOT NULL,
	`calories` real DEFAULT 0 NOT NULL,
	`fat` real DEFAULT 0 NOT NULL,
	`saturated_fat` real DEFAULT 0 NOT NULL,
	`carbs` real DEFAULT 0 NOT NULL,
	`fiber` real DEFAULT 0 NOT NULL,
	`protein` real DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`meal_id`) REFERENCES `meals`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `meals` (
	`id` text PRIMARY KEY NOT NULL,
	`daily_meal_log_id` text NOT NULL,
	`name` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`daily_meal_log_id`) REFERENCES `daily_meal_logs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `user_profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`clerk_user_id` text NOT NULL,
	`weight_lbs` integer DEFAULT 180 NOT NULL,
	`height_inches` integer DEFAULT 72 NOT NULL,
	`calorie_mode` text DEFAULT 'maintenance' NOT NULL,
	`target_calories` integer,
	`macro_mode` text DEFAULT 'percentage' NOT NULL,
	`macro_fats` integer DEFAULT 25 NOT NULL,
	`macro_carbs` integer DEFAULT 35 NOT NULL,
	`macro_protein` integer DEFAULT 40 NOT NULL,
	`goal_weight_lbs` real,
	`goal_body_fat_pct` real,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_profiles_clerk_user_id_unique` ON `user_profiles` (`clerk_user_id`);