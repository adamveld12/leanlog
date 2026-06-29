ALTER TABLE `daily_meal_logs` ADD `front_photo_key` text;--> statement-breakpoint
ALTER TABLE `daily_meal_logs` ADD `side_photo_key` text;--> statement-breakpoint
ALTER TABLE `daily_meal_logs` ADD `back_photo_key` text;--> statement-breakpoint
ALTER TABLE `user_profiles` ADD `front_baseline_date` text;--> statement-breakpoint
ALTER TABLE `user_profiles` ADD `side_baseline_date` text;--> statement-breakpoint
ALTER TABLE `user_profiles` ADD `back_baseline_date` text;