import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const baseUrl = process.env.APP_BASE_URL ?? "http://localhost:3000";
const adminKey = process.env.ADMIN_API_KEY;
const eventsPath = process.argv[2];

if (!eventsPath) {
  console.error("Usage: node scripts/restore-from-events.mjs <events.json>");
  console.error("Tip: GET /api/admin/export-picks > events.json");
  process.exit(1);
}

const payload = JSON.parse(readFileSync(resolve(eventsPath), "utf8"));
const events = payload.events ?? payload;

console.log(`Restoring ${events.length} events…`);

const userPins = new Map();
for (const ev of events) {
  if (ev.kind === "champion_pick") {
    console.log(`Champion: ${ev.user_display_name} → ${ev.team_name}`);
  } else if (ev.kind === "match_pick") {
    console.log(`Match ${ev.match_id}: ${ev.user_display_name} → ${JSON.stringify(ev.allocations)}`);
  }
}

console.log("\nThis is a dry-run summary. To actually replay:");
console.log("1. Re-register each unique user_display_name (PINs are not stored — coordinate manually).");
console.log("2. Log in as each user and POST their picks to /api/champion + /api/tickets.");
console.log("\nFull automation requires a session-impersonation admin endpoint (not built yet).");
