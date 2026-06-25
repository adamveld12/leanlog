ALTER TABLE `goals` ADD `calorie_basis` text DEFAULT 'bodyweight' NOT NULL;--> statement-breakpoint
ALTER TABLE `goals` ADD `body_fat_pct` real;--> statement-breakpoint
ALTER TABLE `goals` ADD `activity_level` text;--> statement-breakpoint
-- #63 R31: backfill every existing goal (and the background goal) to the
-- bodyweight basis with null body-composition fields so their targets are
-- unchanged. The ADD COLUMN default covers this, but we set it explicitly so the
-- intent is unambiguous and any pre-existing NULLs are normalized.
UPDATE `goals` SET `calorie_basis` = 'bodyweight', `body_fat_pct` = NULL, `activity_level` = NULL WHERE `calorie_basis` IS NULL;
