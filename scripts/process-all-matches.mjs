const baseUrl = process.env.APP_BASE_URL ?? "http://localhost:3000";

const response = await fetch(`${baseUrl}/api/admin/process-all-matches`, {
  method: "POST",
});

const payload = await response.json();

if (!response.ok) {
  console.error(JSON.stringify(payload, null, 2));
  process.exit(1);
}

console.log(JSON.stringify(payload, null, 2));
