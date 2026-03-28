import { seedTestPlayer } from "./helpers/seed";

export default async function globalSetup() {
  console.log("Running global setup: seeding test player...");
  await seedTestPlayer();
  console.log("Global setup complete.");
}
