-- #68: per-day body-circumference measurements in inches on daily_meal_logs,
-- beside the existing weight_lbs. All nullable/optional and independent of
-- weight. Shoulder + waist derive the v-taper ratio; bicep/thigh are
-- supplementary single-value (right-side by convention) and don't feed the ratio.
ALTER TABLE `daily_meal_logs` ADD `shoulder_inches` real;--> statement-breakpoint
ALTER TABLE `daily_meal_logs` ADD `waist_inches` real;--> statement-breakpoint
ALTER TABLE `daily_meal_logs` ADD `bicep_inches` real;--> statement-breakpoint
ALTER TABLE `daily_meal_logs` ADD `thigh_inches` real;
