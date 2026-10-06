import type { ExpoSQLiteDatabase } from 'drizzle-orm/expo-sqlite';
import type * as schema from './schema';

// The app runs on expo-sqlite (async). Tests build an equivalent database on
// better-sqlite3 and cast it; every repo `await`s, which works for both.
export type Db = ExpoSQLiteDatabase<typeof schema>;
