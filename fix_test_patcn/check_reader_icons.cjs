const fs = require('fs');
const path = require('path');

const readerPath = path.resolve(__dirname, '../src/components/Reader.tsx');
const content = fs.readFileSync(readerPath, 'utf8');

const lucideIcons = [
  'BellRing', 'ChevronDown', 'ChevronUp', 'ChevronsDown', 'ThumbsUp',
  'MessageSquare', 'Edit', 'Edit3', 'Search', 'Bold', 'Italic',
  'LinkIcon', 'ImageIcon', 'Eye', 'Send', 'RefreshCw', 'UserCheck',
  'UserX', 'QuoteIcon', 'X', 'Trash2', 'Settings', 'Bell', 'LogOut',
  'Layout', 'Briefcase', 'Zap', 'Hash', 'Inbox', 'ArrowBigUp',
  'GitBranch', 'CheckCheck', 'AlertTriangle', 'FileText', 'Share2',
  'VolumeX', 'Download', 'Upload', 'Sliders'
];

const lines = content.split('\n');
const bodyText = lines.slice(60).join('\n');

const usedIcons = lucideIcons.filter(icon => {
  const regex = new RegExp(`\\b${icon}\\b`);
  return regex.test(bodyText);
});

const unusedIcons = lucideIcons.filter(icon => !usedIcons.includes(icon));
console.log('Used icons in Reader.tsx:', usedIcons);
console.log('Unused icons in Reader.tsx:', unusedIcons);
