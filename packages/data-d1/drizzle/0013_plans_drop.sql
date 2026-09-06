DROP TABLE `meal_template_ingredients`;--> statement-breakpoint
DROP TABLE `meal_templates`;--> statement-breakpoint
ALTER TABLE `goals` DROP COLUMN `meal_slots_json`;--> statement-breakpoint
ALTER TABLE `user_profiles` DROP COLUMN `meal_templates_seeded_at`;