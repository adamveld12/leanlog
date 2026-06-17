CREATE TABLE `goals` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`is_background` integer DEFAULT false NOT NULL,
	`name` text,
	`description` text,
	`mode` text NOT NULL,
	`target_weight_lbs` real,
	`macro_fats` integer DEFAULT 25 NOT NULL,
	`macro_carbs` integer DEFAULT 35 NOT NULL,
	`macro_protein` integer DEFAULT 40 NOT NULL,
	`start_date` text,
	`end_date` text,
	`calorie_delta` integer DEFAULT 0 NOT NULL,
	`meal_slots_json` text DEFAULT '[{"name":"Breakfast","ingredients":[]},{"name":"Lunch","ingredients":[]},{"name":"Dinner","ingredients":[]},{"name":"Snack","ingredients":[]}]' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user_profiles`(`clerk_user_id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `goals_user_idx` ON `goals` (`user_id`);
