# LeanLog Mobile

An Android app (Expo SDK 57, React Native, expo-router) that keeps all data on the phone. It tracks meals, saved foods, weight, and body measurements, computes daily targets from Katch-McArdle, includes a body fat calculator (US Navy and Jackson-Pollock 3-site), and syncs with Health Connect. There is no account and no server; JSON export and import are the backup.

The requirements and decisions live in issue #75. Pure domain code (body fat formulas, Katch targets, units, export schema) is in `packages/data-access`; everything else is in `apps/mobile`.

## Running it

The app uses native modules, so it needs a **development build**, not Expo Go.

```sh
pnpm install
pnpm --filter @leanlog/mobile android   # builds and installs a dev client (needs the Android SDK)
pnpm --filter @leanlog/mobile start     # Metro for an already-installed dev client
```

Without an Android SDK, build the dev client in the cloud instead: `eas build -p android --profile development` (see [EAS builds](#eas-builds)), install the APK, then run `pnpm --filter @leanlog/mobile start`.

Without a device you can still run everything except the app itself:

```sh
pnpm --filter @leanlog/mobile lint     # tsc + eslint
pnpm --filter @leanlog/mobile test     # jest, headless
pnpm --filter @leanlog/mobile build    # expo export: bundles the JS for Android
```

## Storybook

Every atom, molecule and organism has a story (`pnpm design:audit` enforces it). The on-device Storybook is removed from the bundle unless you ask for it:

```sh
pnpm --filter @leanlog/mobile storybook   # starts Metro with EXPO_PUBLIC_STORYBOOK_ENABLED=true
```

Then open `leanlog://storybook` in the dev client. The story index (`.rnstorybook/storybook.requires.ts`) is regenerated when Metro starts with Storybook enabled, so run that and commit the file when stories change.

## Database

SQLite via drizzle and `expo-sqlite`. Migrations are bundled with the app and run at launch.

1. Edit `apps/mobile/src/db/schema.ts`.
2. `pnpm --filter @leanlog/mobile db:generate`
3. Commit the new `.sql` file and the updated `meta/` and `migrations.js`.

Tests apply the same bundled migrations to an in-memory better-sqlite3 database. (`better-sqlite3` is listed in the root `pnpm.onlyBuiltDependencies` so its native build runs on install.)

## Health Connect

- Android 14+ has Health Connect built in; Android 9–13 need the Health Connect app. The app shows a Play Store link when it is missing or out of date.
- Leanlog **reads** weight (and height, once, to pre-fill onboarding) and **writes** weigh-ins, body fat, height, and one Nutrition record per meal. Measurement sites have no Health Connect record type, so they stay local.
- Writes are queued in the same transaction as the change and sent in the background, so a missing or denied Health Connect never blocks a save. A failed send is retried on the next write or foreground and logged locally after three attempts.
- The permission-rationale intent filter is added by the `react-native-health-connect` config plugin to the main activity. Leanlog has no dedicated route for it; the explanation is on the "Why Leanlog asks for this" screen in Me.

### Checking it on a device

Cloud and agent sessions can't run these. Before a release:

- [ ] The permission prompt appears from onboarding and from Me, and granting works.
- [ ] A weight written by another app becomes today's weight when the app opens.
- [ ] A saved meal, weigh-in, body fat result and height appear in Health Connect, with no duplicates after relaunching.
- [ ] Editing a meal updates its record in place; deleting it removes the record.
- [ ] With permission denied, every feature still works.

## Backup

Me → Backup exports a `leanlog-export-YYYY-MM-DD.json` file through the Android share sheet and imports one back. Import validates the whole file first, shows what it contains, and only then replaces **all** local data in a single transaction. Pending Health Connect writes are discarded on import (history is never replayed to Health Connect).

The format is versioned (`version: 1`, schema `MobileExportSchema` in `@leanlog/data-access`). `apps/mobile/src/backup/__fixtures__/export-v1.json` is the contract: an import test parses it, so changing the format means bumping `version` and keeping an importer for the old one.

## Analytics and errors

Analytics ships **off**. Set `EXPO_PUBLIC_POSTHOG_KEY` (and optionally `EXPO_PUBLIC_POSTHOG_HOST`) at build time to enable it; without a key there is no client and no network traffic, and the toggle in Me is hidden. Even with a key nothing is sent until the user turns it on. It is anonymous (no identify, no person profiles) and events carry counts only, never food, weight or measurements.

Unexpected errors (a failed database transaction, an uncaught JS error, a render crash, a failed export or import, a Health Connect item that fails three times) are written to a local `error_log` (last 200 entries, included in the export). They are also reported to PostHog only when analytics is on.

## EAS builds

`apps/mobile/eas.json` has two profiles: `development` (a dev-client APK) and `preview` (a release APK for testing). One-time setup, by the account owner:

1. `cd apps/mobile && eas init` (writes the EAS project id).
2. Let EAS manage the Android keystore (`eas credentials`).
3. Create an access token at expo.dev and add it to the GitHub repo as the `EXPO_TOKEN` secret.
4. To enable analytics, set `EXPO_PUBLIC_POSTHOG_KEY` and `EXPO_PUBLIC_POSTHOG_HOST` as EAS environment variables.

The **Mobile build** workflow (`.github/workflows/mobile-build.yml`) runs `eas build -p android --profile preview --non-interactive` when you start it by hand or push a `mobile-v*` tag. It fails until steps 1–3 are done.

The Android package id is `app.leanlog.mobile` (`app.config.ts`); change it before the first EAS build if you want a different one, since a different id is a different app to Android: installed copies would not update.

## Known limits

- Android only; no iOS or Apple Health.
- No sync with the web app, no accounts, no label scan.
- Layout is single-column (no tablet two-pane layout).
- Health Connect syncs on write and on foreground; there is no background job, so data waits until the app is opened.
