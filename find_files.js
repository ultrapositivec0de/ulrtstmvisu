import fs from 'fs';
import path from 'path';

console.log("CWD:", process.cwd());

function searchDir(dir, targetName, results = []) {
  try {
    const list = fs.readdirSync(dir);
    for (const file of list) {
      const fullPath = path.join(dir, file);
      try {
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          if (file !== 'node_modules' && file !== '.git' && file !== 'dist' && file !== 'proc' && file !== 'sys' && file !== 'dev') {
            searchDir(fullPath, targetName, results);
          }
        } else {
          if (file.toLowerCase().includes(targetName.toLowerCase())) {
            results.push(fullPath);
          }
        }
      } catch (e) {
        // Safe skip on stats error
      }
    }
  } catch (e) {
    // Safe skip on readdir error
  }
  return results;
}

console.log("SEARCHING FOR securityService...");
const results1 = searchDir('/', 'securityService');
console.log("securityService files found:", results1);

console.log("SEARCHING FOR any .ts file in the container...");
const results2 = searchDir('/', '.ts');
console.log("ALL ts files found:", results2.filter(f => !f.includes('node_modules')));

process.exit(1);
