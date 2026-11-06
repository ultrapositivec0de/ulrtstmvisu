const fs = require('fs');
const path = require('path');

const readerPath = path.resolve(__dirname, '../src/components/Reader.tsx');
let content = fs.readFileSync(readerPath, 'utf8');
const lines = content.split('\n');

const settingsStartIdx = lines.findIndex((l, idx) => idx > 3100 && l.includes('viewMode === "settings"'));
const settingsEndIdx = lines.findIndex((l, idx) => idx > settingsStartIdx && l.includes('</motion.div>') && lines[idx+1]?.includes(') : null}'));

if (settingsStartIdx === -1 || settingsEndIdx === -1) {
  console.error('Indices not found!', { settingsStartIdx, settingsEndIdx });
  process.exit(1);
}

console.log('Found settingsStartIdx:', settingsStartIdx + 1, lines[settingsStartIdx]);
console.log('Found settingsEndIdx:', settingsEndIdx + 1, lines[settingsEndIdx]);

const replacement = [
  '            ) : viewMode === "settings" ? (',
  '              <ReaderSettingsView',
  '                config={config}',
  '                setConfig={setConfig}',
  '                currentUser={currentUser}',
  '                showMutedManager={showMutedManager}',
  '                setShowMutedManager={setShowMutedManager}',
  '                loadingMutedManager={loadingMutedManager}',
  '                setLoadingMutedManager={setLoadingMutedManager}',
  '                fetchedMutedUsers={fetchedMutedUsers}',
  '                setFetchedMutedUsers={setFetchedMutedUsers}',
  '                onMuteUser={onMuteUser}',
  '                setViewMode={setViewMode}',
  '                fetchPosts={fetchPosts}',
  '                t={t}',
  '              />'
];

lines.splice(settingsStartIdx, settingsEndIdx - settingsStartIdx + 1, ...replacement);
fs.writeFileSync(readerPath, lines.join('\n'), 'utf8');
console.log('Successfully replaced settings view in Reader.tsx! New total lines:', lines.length);
