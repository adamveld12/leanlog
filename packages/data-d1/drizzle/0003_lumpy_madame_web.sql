ALTER TABLE `ingredients` ADD `sugar_alcohol` real;--> statement-breakpoint
ALTER TABLE `ingredients` ADD `allulose` real;--> statement-breakpoint
ALTER TABLE `ingredients` ADD `alcohol` real;--> statement-breakpoint
ALTER TABLE `ingredients` ADD `calorie_source` text DEFAULT 'estimated' NOT NULL;--> statement-breakpoint
ALTER TABLE `ingredients` ADD `estimated_calories` real DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `nutrition_database_ingredients` ADD `calories` real DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `nutrition_database_ingredients` ADD `sugar_alcohol` real;--> statement-breakpoint
ALTER TABLE `nutrition_database_ingredients` ADD `allulose` real;--> statement-breakpoint
ALTER TABLE `nutrition_database_ingredients` ADD `alcohol` real;--> statement-breakpoint
UPDATE `ingredients` SET
  `estimated_calories` = ROUND(`fat`*9 + `protein`*4
    + (`carbs` - MIN(`fiber`,`carbs`))*4 + MIN(`fiber`,`carbs`)*2, 1),
  `calorie_source` = 'estimated';--> statement-breakpoint
UPDATE `ingredients` SET `calories` = `estimated_calories`;--> statement-breakpoint
UPDATE `nutrition_database_ingredients` SET
  `calories` = ROUND(`fat`*9 + `protein`*4
    + (`carbs` - MIN(COALESCE(`fiber`,0),`carbs`))*4
    + MIN(COALESCE(`fiber`,0),`carbs`)*2, 1);