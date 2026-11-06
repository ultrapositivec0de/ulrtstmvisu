const fs = require('fs');
const path = require('path');

const readerPath = path.resolve(__dirname, '../src/components/Reader.tsx');
let content = fs.readFileSync(readerPath, 'utf8');
const lines = content.split('\n');

const startIdx = 1710; // 0-indexed line 1711
const endIdx = 2370; // 0-indexed line 2371

if (!lines[startIdx].includes('<AnimatePresence>') || !lines[endIdx].includes('</AnimatePresence>')) {
  console.error('Line mismatch!', {
    start: lines[startIdx],
    end: lines[endIdx]
  });
  process.exit(1);
}

const replacementLines = [
  '      <ReaderInboxDrawer',
  '        showInbox={showInbox}',
  '        setShowInbox={setShowInbox}',
  '        isRefreshingInbox={isRefreshingInbox}',
  '        currentUser={currentUser}',
  '        fetchInbox={fetchInbox}',
  '        loadingInbox={loadingInbox}',
  '        inbox={inbox}',
  '        hiddenReplies={hiddenReplies}',
  '        setHiddenReplies={setHiddenReplies}',
  '        parentContext={parentContext}',
  '        fetchParentContext={fetchParentContext}',
  '        expandedInboxThreads={expandedInboxThreads}',
  '        setExpandedInboxThreads={setExpandedInboxThreads}',
  '        respondedReplies={respondedReplies}',
  '        expandedReplies={expandedReplies}',
  '        renderContent={renderContent}',
  '        threads={threads}',
  '        threadHistory={threadHistory}',
  '        loadingThreads={loadingThreads}',
  '        fetchThread={fetchThread}',
  '        editingReply={editingReply}',
  '        setEditingReply={setEditingReply}',
  '        onUploadImage={onUploadImage}',
  '        handleLocalComment={handleLocalComment}',
  '        config={config}',
  '        revealedImages={revealedImages}',
  '        setRevealedImages={setRevealedImages}',
  '        showMyReplies={showMyReplies}',
  '        setShowMyReplies={setShowMyReplies}',
  '        handleLocalVote={handleLocalVote}',
  '        voteWeight={voteWeight}',
  '        replyingTo={replyingTo}',
  '        setReplyingTo={setReplyingTo}',
  '        floatingCommentBody={floatingCommentBody}',
  '        setFloatingCommentBody={setFloatingCommentBody}',
  '        inboxLimit={inboxLimit}',
  '        t={t}',
  '      />'
];

lines.splice(startIdx, endIdx - startIdx + 1, ...replacementLines);
fs.writeFileSync(readerPath, lines.join('\n'), 'utf8');
console.log('Successfully replaced inbox drawer in Reader.tsx! New total lines:', lines.length);
