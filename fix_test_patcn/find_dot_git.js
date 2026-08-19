import fs from 'fs';
import path from 'path';

function findDotGit(dir, depth = 0) {
  if (depth > 6) return;
  try {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      if (file === '.git') {
        console.log("FOUND .git at:", fullPath);
      }
      try {
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory() && file !== 'proc' && file !== 'sys' && file !== 'dev' && file !== 'node_modules') {
          findDotGit(fullPath, depth + 1);
        }
      } catch (e) {}
    }
  } catch (e) {}
}

console.log("Searching for .git in the filesystem...");
findDotGit('/');
process.exit(1);
