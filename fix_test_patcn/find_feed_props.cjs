const fs = require('fs');
const path = require('path');

const readerPath = path.resolve(__dirname, '../src/components/Reader.tsx');
const content = fs.readFileSync(readerPath, 'utf8');
const lines = content.split('\n');

const feedLines = lines.slice(1767, 2356).join('\n');

const candidates = [
  'hasInitiatedFeed', 'loading', 'posts', 'fetchPosts',
  'expandedPosts', 'setExpandedPosts', 'currentUser',
  'postComments', 'respondedReplies', 'config', 'setConfig',
  'renderContent', 'handleMouseUp', 'getWordCounts',
  'revealedImages', 'setRevealedImages',
  'handleLocalVote', 'voteWeight', 'setVoteWeight',
  'onEditPost', 'handleMuteAuthor', 'onMuteUser',
  'toggleExpandPost', 'fetchComments', 'loadingComments',
  'handleLocalComment', 'onDeleteComment', 'onUploadImage',
  't', 'currentFontSize', 'currentFontWeight', 'fontSize',
  'showMobileBottomBar', 'isMobileLayout'
];

const found = candidates.filter(c => feedLines.includes(c));
console.log('Props found in feed view:', found);
