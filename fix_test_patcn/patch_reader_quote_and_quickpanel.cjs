const fs = require('fs');
const path = require('path');

const readerPath = path.resolve(__dirname, '../src/components/Reader.tsx');
let content = fs.readFileSync(readerPath, 'utf8');
const lines = content.split('\n');

const quoteStartIdx = lines.findIndex((l, idx) => idx > 3700 && l.includes('<AnimatePresence>') && lines[idx+1]?.includes('{quotePosition && ('));
const quickPanelEndIdx = lines.findIndex((l, idx) => 
  idx > quoteStartIdx && 
  l.trim() === '</AnimatePresence>' && 
  lines.slice(idx, idx + 5).some(sub => sub.includes('ReaderMobileBottomBar'))
);

if (quoteStartIdx === -1 || quickPanelEndIdx === -1) {
  console.error('Indices not found!', { quoteStartIdx, quickPanelEndIdx });
  process.exit(1);
}

console.log('Found quoteStartIdx:', quoteStartIdx + 1, lines[quoteStartIdx]);
console.log('Found quickPanelEndIdx:', quickPanelEndIdx + 1, lines[quickPanelEndIdx]);

const replacement = [
  '      {/* Floating Selection Quote Tooltip */}',
  '      <ReaderQuoteTooltip',
  '        quotePosition={quotePosition}',
  '        tooltipRef={tooltipRef}',
  '        tooltipOffset={tooltipOffset}',
  '        handleQuote={handleQuote}',
  '        showPreview={showPreview}',
  '        setShowPreview={setShowPreview}',
  '        setQuotePosition={setQuotePosition}',
  '        commentingPost={commentingPost}',
  '        setCommentingPost={setCommentingPost}',
  '        setSelectedText={setSelectedText}',
  '        insertFloatingText={insertFloatingText}',
  '        renderContent={renderContent}',
  '        floatingCommentBody={floatingCommentBody}',
  '        setFloatingCommentBody={setFloatingCommentBody}',
  '        handleLocalComment={handleLocalComment}',
  '        onUploadImage={onUploadImage}',
  '        t={t}',
  '      />',
  '',
  '      {/* Mobile Reader Quick Controls Drawer (Bottom Sheet) */}',
  '      <ReaderQuickPanel',
  '        showQuickPanel={showQuickPanel}',
  '        setShowQuickPanel={setShowQuickPanel}',
  '        viewMode={viewMode}',
  '        searchTag={searchTag}',
  '        setSearchTag={setSearchTag}',
  '        curationTagInput={curationTagInput}',
  '        setCurationTagInput={setCurationTagInput}',
  '        handleSearch={handleSearch}',
  '        fetchCurationFeed={fetchCurationFeed}',
  '        config={config}',
  '        setConfig={setConfig}',
  '        handleDecreaseFontSize={handleDecreaseFontSize}',
  '        handleIncreaseFontSize={handleIncreaseFontSize}',
  '        currentFontSize={currentFontSize}',
  '        fetchPosts={fetchPosts}',
  '        loading={loading}',
  '        isCurationLoading={isCurationLoading}',
  '        posts={posts}',
  '        curationPosts={curationPosts}',
  '        expandedPosts={expandedPosts}',
  '        setExpandedPosts={setExpandedPosts}',
  '        t={t}',
  '      />'
];

lines.splice(quoteStartIdx, quickPanelEndIdx - quoteStartIdx + 1, ...replacement);
fs.writeFileSync(readerPath, lines.join('\n'), 'utf8');
console.log('Successfully replaced quote tooltip and quick panel! New total lines:', lines.length);
