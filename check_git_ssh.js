import { execSync } from 'child_process';

console.log("=== GIT SYSTEM CONFIG ===");
try {
  console.log(execSync('git config --system --list 2>&1', { encoding: 'utf-8' }));
} catch(e) {
  console.log("system config error:", e.message);
}

console.log("=== GIT GLOBAL CONFIG ===");
try {
  console.log(execSync('git config --global --list 2>&1', { encoding: 'utf-8' }));
} catch(e) {
  console.log("global config error:", e.message);
}

console.log("=== SSH TEST ===");
try {
  console.log(execSync('ssh -o StrictHostKeyChecking=no -T git@github.com 2>&1', { encoding: 'utf-8' }));
} catch(e) {
  console.log("ssh error:", e.message);
}

process.exit(1);
