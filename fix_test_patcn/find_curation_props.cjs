const fs = require('fs');
const path = require('path');

const readerPath = path.resolve(__dirname, '../src/components/Reader.tsx');
const content = fs.readFileSync(readerPath, 'utf8');
const lines = content.split('\n');

const curationLines = lines.slice(2356, 3157);
const text = curationLines.join('\n');

// Find identifiers that match state/prop patterns
const potentialState = [
  'isCurationSettingsOpen', 'setIsCurationSettingsOpen',
  'curationTagInput', 'setCurationTagInput',
  'fetchCurationFeed', 'isCurationLoading',
  'autoScanInterval', 'setAutoScanInterval',
  'autoScanRemaining', 'isAutoScanning', 'setIsAutoScanning',
  'curationRules', 'setCurationRules',
  'curationPosts', 'filteredCurationPosts',
  'curationVotes', 'handleCurationVote',
  'batchVoteQueue', 'setBatchVoteQueue',
  'executeBatchVotes', 'isBatchVoting',
  'expandedPosts', 'toggleExpandPost',
  'currentUser', 'config', 'setConfig',
  'renderContent', 'handleMouseUp', 'getWordCounts',
  'handleLocalVote', 'handleLocalComment', 'voteWeight',
  'postComments', 'fetchComments', 'loadingComments',
  'onEditPost', 'onDeleteComment', 'onUploadImage',
  'revealedImages', 'setRevealedImages', 't', 'currentFontSize'
];

const found = potentialState.filter(v => text.includes(v));
console.log('Found identifiers in curation section:', found);
