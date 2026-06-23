export interface Env {
  GOOGLE_GENERATIVE_AI_API_KEY: string;
  CLERK_SECRET_KEY: string;
  VITE_CLERK_PUBLISHABLE_KEY: string;
  VITE_POSTHOG_API_KEY: string;
  VITE_POSTHOG_HOST: string;
  DB: D1Database;
  // Stored user images for nutrition database entries (product + label photos, #54).
  IMAGES: R2Bucket;
}
