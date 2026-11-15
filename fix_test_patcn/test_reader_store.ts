import { useReaderStore, DEFAULT_READER_CONFIG } from '../src/store/readerStore';
import { SteemPost } from '../src/types';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${msg}`);
    process.exit(1);
  } else {
    console.log(`✅ PASSED: ${msg}`);
  }
}

console.log('Testing useReaderStore...');

// 1. Check default config
const initialConfig = useReaderStore.getState().config;
assert(initialConfig.fontSize === DEFAULT_READER_CONFIG.fontSize, 'Initial fontSize matches default');
assert(initialConfig.contentWidth === 800, 'Initial contentWidth is 800');

// 2. Update config
useReaderStore.getState().updateConfig({ fontSize: 22, loadImages: false });
assert(useReaderStore.getState().config.fontSize === 22, 'updateConfig updates fontSize to 22');
assert(useReaderStore.getState().config.loadImages === false, 'updateConfig updates loadImages to false');

// 3. View mode transition
useReaderStore.getState().setViewMode('curation');
assert(useReaderStore.getState().viewMode === 'curation', 'viewMode changed to curation');
assert(useReaderStore.getState().isReaderHeaderOpen === false, 'isReaderHeaderOpen auto-collapses on curation');

useReaderStore.getState().setViewMode('feed');
assert(useReaderStore.getState().viewMode === 'feed', 'viewMode changed to feed');
assert(useReaderStore.getState().isReaderHeaderOpen === true, 'isReaderHeaderOpen auto-opens on feed');

// 4. Record responded reply
useReaderStore.getState().recordRespondedReply('re-author-123', 'My reply content');
assert(useReaderStore.getState().respondedReplies['re-author-123'] === 'My reply content', 'recordRespondedReply stored correctly');

// 5. Revealed images
assert(!useReaderStore.getState().revealedImages.has('post-perm-1'), 'revealedImages initially empty for post');
useReaderStore.getState().revealImage('post-perm-1');
assert(useReaderStore.getState().revealedImages.has('post-perm-1'), 'revealImage adds post to set');

// 6. Optimistic Vote to Posts
const mockPosts: SteemPost[] = [
  {
    author: 'alice',
    permlink: 'post-1',
    category: 'test',
    title: 'Test Post',
    body: 'Hello',
    json_metadata: '{}',
    created: '2026-01-01T00:00:00',
    active_votes: [{ voter: 'bob', weight: 5000 }],
    children: 2,
    parent_author: '',
    parent_permlink: 'test',
  },
  {
    author: 'charlie',
    permlink: 'post-2',
    category: 'test',
    title: 'Test Post 2',
    body: 'World',
    json_metadata: '{}',
    created: '2026-01-01T00:00:00',
    active_votes: [],
    children: 0,
    parent_author: '',
    parent_permlink: 'test',
  },
];

const updatedPosts = useReaderStore.getState().applyOptimisticVoteToPosts(
  mockPosts,
  'alice',
  'post-1',
  10000,
  'myusername'
);

const alicePost = updatedPosts.find((p) => p.author === 'alice');
assert(alicePost !== undefined, 'Alice post found');
assert(alicePost?.active_votes.length === 2, 'Alice post has 2 votes after optimistic vote');
assert(alicePost?.active_votes.some((v) => v.voter === 'myusername' && v.weight === 10000) === true, 'My vote was added to alice post');

// Repeating vote does not duplicate
const updatedPostsAgain = useReaderStore.getState().applyOptimisticVoteToPosts(
  updatedPosts,
  'alice',
  'post-1',
  10000,
  'myusername'
);
assert(updatedPostsAgain.find((p) => p.author === 'alice')?.active_votes.length === 2, 'Duplicate vote was ignored');

// 7. Optimistic Vote to Comments
const mockComments: Record<string, SteemPost[]> = {
  'parent-perm': [
    {
      author: 'david',
      permlink: 'comment-1',
      category: '',
      title: '',
      body: 'Great post',
      json_metadata: '{}',
      created: '2026-01-01T00:00:00',
      active_votes: [],
      children: 0,
      parent_author: 'alice',
      parent_permlink: 'parent-perm',
    },
  ],
};

const updatedComments = useReaderStore.getState().applyOptimisticVoteToComments(
  mockComments,
  'david',
  'comment-1',
  5000,
  'myusername'
);

assert(updatedComments['parent-perm'][0].active_votes.length === 1, 'Optimistic vote applied to comment');
assert(updatedComments['parent-perm'][0].active_votes[0].voter === 'myusername', 'Voter name set in comment');

console.log('\nAll useReaderStore tests passed successfully!');
