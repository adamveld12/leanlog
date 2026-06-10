CREATE TABLE `nutrition_database_ingredients` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`serving_amount` real NOT NULL,
	`added_by_user_id` text NOT NULL,
	`creation_source` text NOT NULL,
	`fat` real NOT NULL,
	`carbs` real NOT NULL,
	`protein` real NOT NULL,
	`saturated_fat` real,
	`unsaturated_fat` real,
	`monounsaturated_fat` real,
	`polyunsaturated_fat` real,
	`trans_fat` real,
	`fiber` real,
	`sugar` real,
	`micronutrients_json` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `nutrition_database_ingredients_name_idx` ON `nutrition_database_ingredients` (`name`);--> statement-breakpoint
ALTER TABLE `ingredients` ADD `unsaturated_fat` real;--> statement-breakpoint
ALTER TABLE `ingredients` ADD `monounsaturated_fat` real;--> statement-breakpoint
ALTER TABLE `ingredients` ADD `polyunsaturated_fat` real;--> statement-breakpoint
ALTER TABLE `ingredients` ADD `trans_fat` real;--> statement-breakpoint
ALTER TABLE `ingredients` ADD `sugar` real;--> statement-breakpoint
ALTER TABLE `ingredients` ADD `micronutrients_json` text;--> statement-breakpoint
ALTER TABLE `ingredients` ADD `source_database_ingredient_id` text;