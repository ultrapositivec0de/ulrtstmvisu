const fs = require('fs');
const path = require('path');

const filePath = path.resolve(__dirname, '../src/components/reader/ReaderFeedView.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Update React import
content = content.replace("import React from 'react';", "import React, { useState } from 'react';");

// 2. Update lucide-react import
content = content.replace(
  "  Edit,\n  UserX,",
  "  Edit,\n  Edit3,\n  UserX,\n  Bold,\n  Italic,\n  Quote as QuoteIcon,\n  Link as LinkIcon,\n  Eye,"
);

// 3. Update ReaderFeedViewProps
content = content.replace(
  "  revealedImages: Set<string>;",
  "  quotePosition?: { x: number; y: number } | null;\n  setQuotePosition?: (pos: { x: number; y: number } | null) => void;\n  revealedImages: Set<string>;"
);

// 4. Update component destructuring
content = content.replace(
  "  revealedImages,\n  setRevealedImages,",
  "  quotePosition,\n  setQuotePosition,\n  revealedImages,\n  setRevealedImages,"
);

// 5. Add local state & insertText before return (
const helpers = `  const [showPreview, setShowPreview] = useState(false);

  const insertText = (before: string, after: string = '') => {
    const textarea = document.getElementById('inline-comment-editor') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selected = text.substring(start, end);
    const replacement = before + selected + after;

    setCommentBody(text.substring(0, start) + replacement + text.substring(end));

    setTimeout(() => {
      if (textarea) {
        textarea.focus();
        textarea.setSelectionRange(start + before.length, end + before.length);
      }
    }, 50);
  };
`;

content = content.replace("  return (", `${helpers}\n  return (`);

// 6. Replace mutedUsersRef.current with mutedUsers
content = content.replace(/mutedUsersRef\.current/g, "mutedUsers");

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully updated ReaderFeedView.tsx');
