-- #84 Step 7 (backfill): consolidate goal meal slots and surviving meal
-- templates into the new plans model. Purely additive to existing rows —
-- meal_slots_json / meal_templates are read here but not touched; they are
-- dropped in a later migration (0013) once this backfill is verified.
--
-- Timestamp is a literal ISO-8601-with-milliseconds string (not
-- datetime('now')) because the app validates every stored timestamp with
-- Zod's z.string().datetime(), which datetime('now')'s "YYYY-MM-DD HH:MM:SS"
-- output does not satisfy.

-- ---------------------------------------------------------------------------
-- Part 1: goal meal slots -> plans (R35). Every meal_slots_json ingredients
-- array is empty in production (verified), so only slot names are preserved.
-- Two goals sharing byte-identical meal_slots_json (the common case: every
-- write went through one JSON.stringify) collapse into a single plan.
-- ---------------------------------------------------------------------------

-- Plain (not TEMP) table: D1's SQL authorizer rejects CREATE TEMP TABLE with
-- SQLITE_AUTH. Dropped at the end of this part instead.
CREATE TABLE plan_seed (plan_id TEXT, user_id TEXT, slots TEXT, rn INTEGER);

INSERT INTO plan_seed
SELECT
  lower(hex(randomblob(16))),
  user_id,
  meal_slots_json,
  ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY meal_slots_json)
FROM (SELECT DISTINCT user_id, meal_slots_json FROM goals);
--> statement-breakpoint

-- R6: plan names must be unique per user, so a user's 2nd+ distinct slot list
-- becomes "Default 2", "Default 3", etc.
INSERT INTO plans (id, user_id, name, position, created_at, updated_at)
SELECT
  plan_id,
  user_id,
  CASE WHEN rn = 1 THEN 'Default' ELSE 'Default ' || rn END,
  rn - 1,
  '2026-01-01T00:00:00.000Z',
  '2026-01-01T00:00:00.000Z'
FROM plan_seed;
--> statement-breakpoint

INSERT INTO plan_meals (id, plan_id, name, position, created_at, updated_at)
SELECT
  lower(hex(randomblob(16))),
  ps.plan_id,
  je.value ->> '$.name',
  je.key,
  '2026-01-01T00:00:00.000Z',
  '2026-01-01T00:00:00.000Z'
FROM plan_seed ps, json_each(ps.slots) je;
--> statement-breakpoint

UPDATE goals
SET default_plan_id = (
  SELECT plan_id FROM plan_seed ps
  WHERE ps.user_id = goals.user_id AND ps.slots = goals.meal_slots_json
);
--> statement-breakpoint

DROP TABLE plan_seed;
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- Part 2: meal templates carrying at least one ingredient -> a "Saved meals"
-- plan per user (R34). Seeded, never-touched empty templates are discarded.
-- Position 100 sorts a user's saved-meals plan after their (few) default
-- plans without needing to know how many default variants they have.
-- ---------------------------------------------------------------------------

CREATE TABLE saved_seed (plan_id TEXT, user_id TEXT);

INSERT INTO saved_seed
SELECT lower(hex(randomblob(16))), user_id
FROM (
  SELECT DISTINCT mt.user_id
  FROM meal_templates mt
  WHERE EXISTS (SELECT 1 FROM meal_template_ingredients i WHERE i.template_id = mt.id)
);
--> statement-breakpoint

INSERT INTO plans (id, user_id, name, position, created_at, updated_at)
SELECT plan_id, user_id, 'Saved meals', 100, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'
FROM saved_seed;
--> statement-breakpoint

-- Reusing meal_templates.id as the new plan_meals.id makes the ingredient
-- copy below a straight projection instead of needing an id-remapping join.
INSERT INTO plan_meals (id, plan_id, name, position, created_at, updated_at)
SELECT mt.id, ss.plan_id, mt.name, mt.position, mt.created_at, mt.updated_at
FROM meal_templates mt
JOIN saved_seed ss ON ss.user_id = mt.user_id
WHERE EXISTS (SELECT 1 FROM meal_template_ingredients i WHERE i.template_id = mt.id);
--> statement-breakpoint

INSERT INTO plan_meal_ingredients (
  id, plan_meal_id, name, weight, calories, fat, saturated_fat, carbs, fiber, protein,
  unsaturated_fat, monounsaturated_fat, polyunsaturated_fat, trans_fat, sugar, sugar_alcohol,
  allulose, alcohol, calorie_source, estimated_calories, micronutrients_json,
  source_database_ingredient_id, created_at, updated_at
)
SELECT
  i.id, i.template_id, i.name, i.weight, i.calories, i.fat, i.saturated_fat, i.carbs, i.fiber,
  i.protein, i.unsaturated_fat, i.monounsaturated_fat, i.polyunsaturated_fat, i.trans_fat,
  i.sugar, i.sugar_alcohol, i.allulose, i.alcohol, i.calorie_source, i.estimated_calories,
  i.micronutrients_json, i.source_database_ingredient_id, i.created_at, i.updated_at
FROM meal_template_ingredients i
WHERE i.template_id IN (SELECT id FROM plan_meals);
--> statement-breakpoint

DROP TABLE saved_seed;
