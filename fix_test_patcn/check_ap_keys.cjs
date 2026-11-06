const fs = require('fs');
const path = require('path');

function checkAPChildren(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const full = path.join(dir, file);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.git' && file !== 'dist' && file !== 'fix_test_patcn') {
        checkAPChildren(full);
      }
    } else if (file.endsWith('.tsx')) {
      const content = fs.readFileSync(full, 'utf8');
      if (content.includes('AnimatePresence')) {
        const apRegex = /<AnimatePresence[^>]*>([\s\S]*?)<\/AnimatePresence>/g;
        let match;
        while ((match = apRegex.exec(content)) !== null) {
          const inner = match[1];
          // Find immediate JSX tags inside
          // Match tags like <motion.div or <SomeComponent or {condition && <tag ...>}
          const tagMatches = inner.match(/<([A-Za-z0-9_.]+)((?:[^>]|"[^"]*"|'[^']*'|\{[^}]*\})*)>/g) || [];
          tagMatches.forEach(tag => {
            const tagName = tag.match(/<([A-Za-z0-9_.]+)/)?.[1];
            if (['motion.div', 'motion.aside', 'motion.span', 'motion.nav', 'motion.section', 'UnlockPinModal', 'KeysModal', 'PublishModal', 'TemplatesModal', 'TagPresetsModal', 'SplitPostModal', 'DraftsModal', 'MentionsModal', 'QuickStyleMenu', 'AboutModal', 'TagGroupsModal', 'QueueModal', 'TableImportModal', 'SettingsModal', 'SystemDialogModal', 'AccountPromptModal'].includes(tagName)) {
              const hasKey = /\bkey=/.test(tag);
              if (!hasKey) {
                console.log(`MISSING KEY on child <${tagName}> in ${full}!`);
                console.log(`Tag snippet: ${tag.slice(0, 100)}`);
              }
            }
          });
        }
      }
    }
  }
}

checkAPChildren('./src');
