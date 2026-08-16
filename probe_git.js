import { execSync } from 'child_process';
import fs from 'fs';

function tryGit(dir) {
  try {
    const status = execSync('git status 2>&1', { cwd: dir, encoding: 'utf-8' });
    console.log(`GIT STATUS in ${dir}:`);
    console.log(status);
    return true;
  } catch(e) {
    console.log(`Failed git status in ${dir}:`, e.message);
    return false;
  }
}

tryGit('/');
tryGit('/app');

console.log("Listing /app contents:");
try {
  console.log(fs.readdirSync('/app'));
} catch (e) {}

console.log("Listing /app/applet contents:");
try {
  console.log(fs.readdirSync('/app/applet'));
} catch (e) {}

process.exit(1);
