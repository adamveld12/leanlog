ALTER TABLE `nutrition_database_ingredients` ADD `serving_size_unit` text DEFAULT 'gram' NOT NULL;--> statement-breakpoint
ALTER TABLE `nutrition_database_ingredients` ADD `serving_size_display_text` text;--> statement-breakpoint
ALTER TABLE `nutrition_database_ingredients` ADD `servings_per_package` real DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `nutrition_database_ingredients` ADD `added_sugars` real;--> statement-breakpoint
DELETE FROM `nutrition_database_ingredients`;
