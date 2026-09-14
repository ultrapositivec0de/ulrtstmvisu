const fs = require('fs');
const path = require('path');

const targetDirs = [
  path.join(__dirname, '../src/components'),
  path.join(__dirname, '../src/hooks'),
  path.join(__dirname, '../src')
];

const patterns = [
  /wysiwygSpacing/i,
  /beautifyEnabled/i,
  /line-height|lineHeight/i,
  /leading-/i,
  /margin|padding|indent/i,
  /\.wysiwyg-editor/i,
  /\.prose/i,
  /p-[\d\.]+|py-[\d\.]+|px-[\d\.]+|m-[\d\.]+|my-[\d\.]+|mx-[\d\.]+|mb-[\d\.]+|mt-[\d\.]+/i,
  /style=\{[^}]*(margin|padding|lineHeight|indent)[^}]*\}/i
];

const results = [];

function walkDir(dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== 'dist' && entry.name !== '.git') {
        walkDir(fullPath);
      }
    } else if (entry.isFile() && (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts') || entry.name.endsWith('.css'))) {
      scanFile(fullPath);
    }
  }
}

function scanFile(filePath) {
  // Focus on editor-related files
  const relPath = path.relative(path.join(__dirname, '..'), filePath);
  const isRelevant = /editor|Editor|GlobalEditorStyles|index\.css|Reader|Preview|useFormatters|TamedWidget|wysiwyg/i.test(relPath);
  if (!isRelevant) return;

  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

  lines.forEach((line, idx) => {
    // Check for specific spacing / indent / layout rules
    const lineNum = idx + 1;
    let matched = null;

    if (/(\.wysiwyg-editor|\.editor-content|prose|wysiwygSpacing|beautifyEnabled|lineHeight|letterSpacing|textIndent)/i.test(line)) {
      matched = 'Editor Specific Spacing';
    } else if (/(margin-bottom|margin-top|padding-left|padding-right|line-height|text-indent|letter-spacing)/i.test(line) && /css|GlobalEditorStyles|EditorPane/i.test(relPath)) {
      matched = 'CSS Spacing Property';
    } else if (/(wysiwygSpacing|beautify)/i.test(line)) {
      matched = 'State / Prop';
    }

    if (matched) {
      results.push({
        file: relPath,
        lineNum,
        category: matched,
        text: line.trim()
      });
    }
  });
}

walkDir(path.join(__dirname, '../src'));

console.log(`Found ${results.length} spacing references in editor-related files.`);

// Group by file
const grouped = {};
for (const res of results) {
  if (!grouped[res.file]) grouped[res.file] = [];
  grouped[res.file].push(res);
}

const reportPath = path.join(__dirname, 'EDITOR_SPACING_AUDIT.md');
let md = '# Editor Text & Layout Spacing Audit\n\nGenerated: ' + new Date().toISOString() + '\n\n';

for (const [file, items] of Object.entries(grouped)) {
  md += `## File: \`${file}\` (${items.length} occurrences)\n\n`;
  md += '| Line | Category | Snippet |\n';
  md += '|---|---|---|\n';
  items.slice(0, 100).forEach(item => {
    const escaped = item.text.replace(/\|/g, '\\|').substring(0, 140);
    md += `| ${item.lineNum} | ${item.category} | \`${escaped}\` |\n`;
  });
  if (items.length > 100) {
    md += `| ... | ... | ... (${items.length - 100} more) |\n`;
  }
  md += '\n';
}

fs.writeFileSync(reportPath, md, 'utf8');
console.log(`Audit report written to ${reportPath}`);
