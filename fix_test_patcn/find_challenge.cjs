const fs = require('fs');
const content = fs.readFileSync('src/services/securityService.ts', 'utf8');
const lines = content.split('\n');
lines.forEach((l, i) => {
  if (l.includes('signImageChallenge')) {
    console.log(i + 1, l);
  }
});
