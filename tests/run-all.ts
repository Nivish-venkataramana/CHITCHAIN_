import { spawnSync } from "child_process";
import path from "path";
import fs from "fs";

const testsDir = path.resolve(__dirname);
const testFiles = fs
  .readdirSync(testsDir)
  .filter((f) => f.endsWith(".test.ts"));

console.log(`Running ${testFiles.length} test suites...\n`);

let passed = 0;
let failed = 0;

for (const file of testFiles) {
  console.log(`--- Running ${file} ---`);
  const result = spawnSync("npx", ["tsx", `tests/${file}`], {
    stdio: "inherit",
    shell: true,
  });

  if (result.status === 0) {
    passed++;
  } else {
    failed++;
    console.error(`FAILED: ${file}`);
  }
}

console.log(`\nResults: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  process.exit(1);
} else {
  console.log("All test suites passed successfully.");
}
