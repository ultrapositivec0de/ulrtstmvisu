const fs = require('fs');
const path = require('path');

const readerPath = path.resolve(__dirname, '../src/components/Reader.tsx');
let content = fs.readFileSync(readerPath, 'utf8');
const lines = content.split('\n');

const curStartIdx = lines.findIndex((l, idx) => idx > 1800 && l.includes(') : viewMode === "curation" ? ('));
const curEndIdx = lines.findIndex((l, idx) => idx > curStartIdx && l.includes('</div>') && lines[idx+1]?.includes(') : viewMode === "settings" ? ('));

if (curStartIdx === -1 || curEndIdx === -1) {
  console.error('Curation indices not found!', { curStartIdx, curEndIdx });
  process.exit(1);
}

console.log('Found curStartIdx:', curStartIdx + 1, lines[curStartIdx]);
console.log('Found curEndIdx:', curEndIdx + 1, lines[curEndIdx]);

const replacement = [
  '            ) : viewMode === "curation" ? (',
  '              <ReaderCurationView',
  '                currentUser={currentUser}',
  '                isCurationSettingsOpen={isCurationSettingsOpen}',
  '                setIsCurationSettingsOpen={setIsCurationSettingsOpen}',
  '                curationTagInput={curationTagInput}',
  '                setCurationTagInput={setCurationTagInput}',
  '                curationTag={curationTag}',
  '                setCurationTag={setCurationTag}',
  '                curationType={curationType}',
  '                setCurationType={setCurationType}',
  '                curationPosts={curationPosts}',
  '                setCurationPosts={setCurationPosts}',
  '                isCurationLoading={isCurationLoading}',
  '                curationError={curationError}',
  '                curationTemplate={curationTemplate}',
  '                setCurationTemplate={setCurationTemplate}',
  '                selectedForVote={selectedForVote}',
  '                setSelectedForVote={setSelectedForVote}',
  '                customWeights={customWeights}',
  '                setCustomWeights={setCustomWeights}',
  '                curationSort={curationSort}',
  '                setCurationSort={setCurationSort}',
  '                curationDays={curationDays}',
  '                setCurationDays={setCurationDays}',
  '                curationColumns={curationColumns}',
  '                setCurationColumns={setCurationColumns}',
  '                batchVotingStatus={batchVotingStatus}',
  '                autoCommentEnabled={autoCommentEnabled}',
  '                setAutoCommentEnabled={setAutoCommentEnabled}',
  '                individualComments={individualComments}',
  '                setIndividualComments={setIndividualComments}',
  '                hasInitiatedCuration={hasInitiatedCuration}',
  '                fetchCurationFeed={fetchCurationFeed}',
  '                processBatchVotes={processBatchVotes}',
  '                expandedPosts={expandedPosts}',
  '                setExpandedPosts={setExpandedPosts}',
  '                togglePost={togglePost}',
  '                config={config}',
  '                setConfig={setConfig}',
  '                renderContent={renderContent}',
  '                handleMouseUp={handleMouseUp}',
  '                revealedImages={revealedImages}',
  '                setRevealedImages={setRevealedImages}',
  '                handleLocalVote={handleLocalVote}',
  '                voteWeight={voteWeight}',
  '                setSearchTag={setSearchTag}',
  '                handleLocalComment={handleLocalComment}',
  '                onUploadImage={onUploadImage}',
  '                t={t}',
  '              />'
];

lines.splice(curStartIdx, curEndIdx - curStartIdx + 1, ...replacement);
fs.writeFileSync(readerPath, lines.join('\n'), 'utf8');
console.log('Successfully replaced curation view in Reader.tsx! New total lines:', lines.length);
