console.log("=== ENV KEYS ===");
for (const key of Object.keys(process.env)) {
  const value = process.env[key];
  const length = value ? value.length : 0;
  console.log(`${key}: (length: ${length})`);
}
process.exit(1);
