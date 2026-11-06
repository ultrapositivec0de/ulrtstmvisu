const fs = require('fs');
const path = require('path');

const readerPath = path.resolve(__dirname, '../src/components/Reader.tsx');
let content = fs.readFileSync(readerPath, 'utf8');
const lines = content.split('\n');

const feedStartIdx = lines.findIndex((l, idx) => idx > 1750 && l.includes('{viewMode === "feed" ? ('));
const feedEndIdx = lines.findIndex((l, idx) => idx > feedStartIdx && l.includes('</div>') && lines[idx+1]?.includes(') : viewMode === "curation" ? ('));

if (feedStartIdx === -1 || feedEndIdx === -1) {
  console.error('Feed indices not found!', { feedStartIdx, feedEndIdx });
  process.exit(1);
}

console.log('Found feedStartIdx:', feedStartIdx + 1, lines[feedStartIdx]);
console.log('Found feedEndIdx:', feedEndIdx + 1, lines[feedEndIdx]);

const replacement = [
  '            {viewMode === "feed" ? (',
  '              <ReaderFeedView',
  '                posts={posts}',
  '                loading={loading}',
  '                hasInitiatedFeed={hasInitiatedFeed}',
  '                fetchPosts={fetchPosts}',
  '                expandedPosts={expandedPosts}',
  '                togglePost={togglePost}',
  '                currentUser={currentUser}',
  '                postComments={postComments}',
  '                respondedReplies={respondedReplies}',
  '                config={config}',
  '                setConfig={setConfig}',
  '                renderContent={renderContent}',
  '                handleMouseUp={handleMouseUp}',
  '                revealedImages={revealedImages}',
  '                setRevealedImages={setRevealedImages}',
  '                handleLocalVote={handleLocalVote}',
  '                voteWeight={voteWeight}',
  '                onMuteUser={onMuteUser}',
  '                setSearchTag={setSearchTag}',
  '                commentingPost={commentingPost}',
  '                setCommentingPost={setCommentingPost}',
  '                commentBody={commentBody}',
  '                setCommentBody={setCommentBody}',
  '                handleLocalComment={handleLocalComment}',
  '                handleEdit={handleEdit}',
  '                fetchComments={fetchComments}',
  '                loadingComments={loadingComments}',
  '                onDeleteComment={onDeleteComment}',
  '                onUploadImage={onUploadImage}',
  '                currentFontSize={currentFontSize}',
  '                currentFontWeight={currentFontWeight}',
  '                mutedUsers={mutedUsersRef.current}',
  '                quotePosition={quotePosition}',
  '                setQuotePosition={setQuotePosition}',
  '                t={t}',
  '              />'
];

lines.splice(feedStartIdx, feedEndIdx - feedStartIdx + 1, ...replacement);
fs.writeFileSync(readerPath, lines.join('\n'), 'utf8');
console.log('Successfully replaced feed view in Reader.tsx! New total lines:', lines.length);
