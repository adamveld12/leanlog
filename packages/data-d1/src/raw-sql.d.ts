// Vite's `?raw` import suffix inlines a file's contents as a string at
// bundle/transform time. Used by plans.migration.test.ts to import the
// shipped 0012 backfill migration verbatim, so the test can never drift from
// what actually runs in production.
declare module '*.sql?raw' {
  const content: string;
  export default content;
}
