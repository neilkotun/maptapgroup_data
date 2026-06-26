import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./db/schema.ts",
  out: "netlify/database/migrations",
  dbCredentials: {
    // Provided by `netlify dev` / `netlify dev:exec` from the linked site.
    url: process.env.NETLIFY_DATABASE_URL!,
  },
});
