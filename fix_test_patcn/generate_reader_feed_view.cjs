const fs = require('fs');
const path = require('path');

const readerPath = path.resolve(__dirname, '../src/components/Reader.tsx');
const content = fs.readFileSync(readerPath, 'utf8');
const lines = content.split('\n');

// Feed view is from index 1767 to 2355 (0-indexed)
// line 1768 is <div key="reader-view-feed" className="space-y-6">
// line 2356 is </div>
const feedBodyLines = lines.slice(1767, 2356);

const targetFile = path.resolve(__dirname, '../src/components/reader/ReaderFeedView.tsx');

const header = `import React from 'react';
import {
  Layout,
  RefreshCw,
  FileText,
  UserCheck,
  ThumbsUp,
  MessageSquare,
  Share2,
  VolumeX,
  ArrowBigUp,
  ChevronUp,
  ChevronDown,
  ChevronsDown,
  Image as ImageIcon,
  Edit,
  UserX,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import { ReaderConfig, SteemPost } from '../../types';
import { PostRenderer } from './PostRenderer';
import { ReplyBox } from './ReplyBox';
import { CommentItem } from './CommentItem';

export interface ReaderFeedViewProps {
  posts: SteemPost[];
  loading: boolean;
  hasInitiatedFeed: boolean;
  fetchPosts: () => void;
  expandedPosts: Set<string>;
  togglePost: (post: SteemPost) => void;
  currentUser?: string | null;
  postComments: Record<string, SteemPost[]>;
  respondedReplies: Record<string, string>;
  config: ReaderConfig;
  setConfig: React.Dispatch<React.SetStateAction<ReaderConfig>>;
  renderContent: (body: string, permlink?: string) => string;
  handleMouseUp: (post: SteemPost, e?: React.MouseEvent | MouseEvent) => void;
  revealedImages: Set<string>;
  setRevealedImages: React.Dispatch<React.SetStateAction<Set<string>>>;
  handleLocalVote: (author: string, permlink: string, weight: number) => Promise<void>;
  voteWeight: number;
  onMuteUser?: (username: string, mute: boolean) => Promise<void>;
  setSearchTag: (tag: string) => void;
  commentingPost: SteemPost | null;
  setCommentingPost: (post: SteemPost | null) => void;
  commentBody: string;
  setCommentBody: (b: string) => void;
  handleLocalComment: (
    parentAuthor: string,
    parentPermlink: string,
    body: string,
    editPermlink?: string,
  ) => Promise<void>;
  handleEdit: (post: SteemPost) => void;
  fetchComments: (author: string, permlink: string) => Promise<void>;
  loadingComments: Set<string>;
  onDeleteComment?: (author: string, permlink: string) => Promise<void>;
  onUploadImage?: (file: File) => Promise<string>;
  currentFontSize: number;
  currentFontWeight: number;
  mutedUsers: string[];
  t: (key: any) => string;
}

export const ReaderFeedView: React.FC<ReaderFeedViewProps> = React.memo(({
  posts,
  loading,
  hasInitiatedFeed,
  fetchPosts,
  expandedPosts,
  togglePost,
  currentUser,
  postComments,
  respondedReplies,
  config,
  setConfig,
  renderContent,
  handleMouseUp,
  revealedImages,
  setRevealedImages,
  handleLocalVote,
  voteWeight,
  onMuteUser,
  setSearchTag,
  commentingPost,
  setCommentingPost,
  commentBody,
  setCommentBody,
  handleLocalComment,
  handleEdit,
  fetchComments,
  loadingComments,
  onDeleteComment,
  onUploadImage,
  currentFontSize,
  currentFontWeight,
  mutedUsers,
  t,
}) => {
  return (
${feedBodyLines.map(l => '  ' + l).join('\n')}
  );
});
`;

fs.writeFileSync(targetFile, header, 'utf8');
console.log('Successfully written ReaderFeedView.tsx');
