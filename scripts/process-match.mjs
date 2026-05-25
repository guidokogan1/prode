const matchId = process.argv[2];

if (!matchId) {
  console.error("Usage: pnpm ops:process:one <match-id>");
  process.exit(1);
}

const baseUrl = process.env.APP_BASE_URL ?? "http://localhost:3000";

const response = await fetch(`${baseUrl}/api/admin/process-match`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ matchId }),
});

const payload = await response.json();

if (!response.ok) {
  console.error(JSON.stringify(payload, null, 2));
  process.exit(1);
}

console.log(JSON.stringify(payload, null, 2));
