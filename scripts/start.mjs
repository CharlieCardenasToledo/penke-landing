// Firebase App Hosting runs the SSR server behind a Cloud Run proxy.
// Astro's standalone adapter otherwise defaults to localhost when HOST is absent.
process.env.HOST ??= "0.0.0.0";

await import("../dist/server/entry.mjs");
