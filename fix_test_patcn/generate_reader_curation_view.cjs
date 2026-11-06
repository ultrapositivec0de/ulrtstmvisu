const fs = require('fs');
const path = require('path');

const readerPath = path.resolve(__dirname, '../src/components/Reader.tsx');
const content = fs.readFileSync(readerPath, 'utf8');
const lines = content.split('\n');

// Curation view is from index 1806 to 2606 (0-indexed)
// line 1807 is <div key="reader-view-curation" className="space-y-6">
// line 2606 is </div>
const curationBodyLines = lines.slice(1806, 2606);

const targetFile = path.resolve(__dirname, '../src/components/reader/ReaderCurationView.tsx');

const header = `import React from 'react';
import {
  Briefcase,
  ChevronUp,
  ChevronDown,
  RefreshCw,
  Zap,
  Sliders,
  CheckCheck,
  Search,
  MessageSquare,
  ThumbsUp,
  Share2,
  VolumeX,
  ArrowBigUp,
  ChevronsDown,
  Image as ImageIcon,
  Edit,
  UserX,
  UserCheck,
  Layout,
  FileText,
  X,
  AlertTriangle,
  Link as LinkIcon,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import { ReaderConfig, SteemPost } from '../../types';
import { POPULAR_COMMUNITIES, POPULAR_TAGS } from '../../data/communities';
import { getWordCounts } from '../../utils/postFormatting';
import { PostRenderer } from './PostRenderer';

export interface ReaderCurationViewProps {
  currentUser?: string | null;
  isCurationSettingsOpen: boolean;
  setIsCurationSettingsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  curationTagInput: string;
  setCurationTagInput: (tag: string) => void;
  curationTag: string;
  setCurationTag: (tag: string) => void;
  curationType: 'posts' | 'comments';
  setCurationType: (type: 'posts' | 'comments') => void;
  curationPosts: SteemPost[];
  setCurationPosts: React.Dispatch<React.SetStateAction<SteemPost[]>>;
  isCurationLoading: boolean;
  curationError: string | null;
  curationTemplate: string;
  setCurationTemplate: (t: string) => void;
  selectedForVote: Set<string>;
  setSelectedForVote: React.Dispatch<React.SetStateAction<Set<string>>>;
  customWeights: Record<string, number>;
  setCustomWeights: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  curationSort: 'new' | 'length';
  setCurationSort: (sort: 'new' | 'length') => void;
  curationDays: number;
  setCurationDays: (d: number) => void;
  curationColumns: number;
  setCurationColumns: React.Dispatch<React.SetStateAction<number>>;
  batchVotingStatus: { active: boolean; current: number; total: number };
  autoCommentEnabled: boolean;
  setAutoCommentEnabled: (enabled: boolean) => void;
  individualComments: Record<string, string>;
  setIndividualComments: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  hasInitiatedCuration: boolean;
  fetchCurationFeed: (overrideTag?: string | React.MouseEvent) => Promise<void>;
  processBatchVotes: () => Promise<void>;
  expandedPosts: Set<string>;
  setExpandedPosts: React.Dispatch<React.SetStateAction<Set<string>>>;
  togglePost: (post: SteemPost) => void;
  config: ReaderConfig;
  setConfig: React.Dispatch<React.SetStateAction<ReaderConfig>>;
  renderContent: (body: string, permlink?: string) => string;
  handleMouseUp: (post: SteemPost, e?: React.MouseEvent | MouseEvent) => void;
  revealedImages: Set<string>;
  setRevealedImages: React.Dispatch<React.SetStateAction<Set<string>>>;
  handleLocalVote: (author: string, permlink: string, weight: number) => Promise<void>;
  voteWeight: number;
  setSearchTag: (tag: string) => void;
  handleLocalComment: (
    parentAuthor: string,
    parentPermlink: string,
    body: string,
    editPermlink?: string,
  ) => Promise<void>;
  onUploadImage?: (file: File) => Promise<string>;
  t: (key: any) => string;
}

export const ReaderCurationView: React.FC<ReaderCurationViewProps> = React.memo(({
  currentUser,
  isCurationSettingsOpen,
  setIsCurationSettingsOpen,
  curationTagInput,
  setCurationTagInput,
  curationTag,
  setCurationTag,
  curationType,
  setCurationType,
  curationPosts,
  setCurationPosts,
  isCurationLoading,
  curationError,
  curationTemplate,
  setCurationTemplate,
  selectedForVote,
  setSelectedForVote,
  customWeights,
  setCustomWeights,
  curationSort,
  setCurationSort,
  curationDays,
  setCurationDays,
  curationColumns,
  setCurationColumns,
  batchVotingStatus,
  autoCommentEnabled,
  setAutoCommentEnabled,
  individualComments,
  setIndividualComments,
  hasInitiatedCuration,
  fetchCurationFeed,
  processBatchVotes,
  expandedPosts,
  setExpandedPosts,
  togglePost,
  config,
  setConfig,
  renderContent,
  handleMouseUp,
  revealedImages,
  setRevealedImages,
  handleLocalVote,
  voteWeight,
  setSearchTag,
  handleLocalComment,
  onUploadImage,
  t,
}) => {
  return (
${curationBodyLines.map(l => '  ' + l).join('\n')}
  );
});
`;

fs.writeFileSync(targetFile, header, 'utf8');
console.log('Successfully regenerated ReaderCurationView.tsx');
