CREATE TABLE `body_fat_results` (
	`id` text PRIMARY KEY NOT NULL,
	`date` text NOT NULL,
	`pct` integer NOT NULL,
	`method` text NOT NULL,
	`inputs` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `body_fat_date_idx` ON `body_fat_results` (`date`);--> statement-breakpoint
CREATE TABLE `days` (
	`date` text PRIMARY KEY NOT NULL,
	`target_calories` real NOT NULL,
	`target_fat` real NOT NULL,
	`target_carbs` real NOT NULL,
	`target_protein` real NOT NULL,
	`basis` text NOT NULL,
	`weight_lbs` real,
	`weight_source` text,
	`weight_at` text,
	`shoulder_in` real,
	`waist_in` real,
	`bicep_in` real,
	`thigh_in` real,
	`neck_in` real,
	`hip_in` real
);
--> statement-breakpoint
CREATE TABLE `error_log` (
	`id` text PRIMARY KEY NOT NULL,
	`at` text NOT NULL,
	`source` text NOT NULL,
	`message` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `hc_queue` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`op` text NOT NULL,
	`record_type` text NOT NULL,
	`client_record_id` text NOT NULL,
	`payload` text,
	`attempts` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `hc_queue_record_idx` ON `hc_queue` (`record_type`,`client_record_id`);--> statement-breakpoint
CREATE TABLE `ingredients` (
	`id` text PRIMARY KEY NOT NULL,
	`meal_id` text NOT NULL,
	`name` text NOT NULL,
	`grams` real NOT NULL,
	`calories` real NOT NULL,
	`fat` real NOT NULL,
	`saturated_fat` real NOT NULL,
	`carbs` real NOT NULL,
	`fiber` real NOT NULL,
	`protein` real NOT NULL,
	`saved_food_id` text,
	FOREIGN KEY (`meal_id`) REFERENCES `meals`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `ingredients_meal_idx` ON `ingredients` (`meal_id`);--> statement-breakpoint
CREATE TABLE `meals` (
	`id` text PRIMARY KEY NOT NULL,
	`date` text NOT NULL,
	`name` text NOT NULL,
	`position` integer NOT NULL,
	`revision` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`date`) REFERENCES `days`(`date`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `meals_date_idx` ON `meals` (`date`);--> statement-breakpoint
CREATE TABLE `profile` (
	`id` integer PRIMARY KEY DEFAULT 1 NOT NULL,
	`sex` text,
	`height_in` real,
	`birth_date` text,
	`onboarding_weight_lbs` real,
	`activity_level` text,
	`calorie_delta` integer DEFAULT 0 NOT NULL,
	`macro_fats` real DEFAULT 30 NOT NULL,
	`macro_carbs` real DEFAULT 40 NOT NULL,
	`macro_protein` real DEFAULT 30 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `saved_foods` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`reference_grams` real NOT NULL,
	`calories` real NOT NULL,
	`fat` real NOT NULL,
	`saturated_fat` real NOT NULL,
	`carbs` real NOT NULL,
	`fiber` real NOT NULL,
	`protein` real NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`id` integer PRIMARY KEY DEFAULT 1 NOT NULL,
	`units` text DEFAULT 'imperial' NOT NULL,
	`analytics_opt_in` integer DEFAULT false NOT NULL,
	`hc_enabled` integer DEFAULT false NOT NULL
);
