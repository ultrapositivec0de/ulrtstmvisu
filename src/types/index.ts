export interface Draft {
  id: string;
  title: string;
  body: string;
  date: string;
  status: 'working' | 'ready';
}

export interface Template {
  id: string;
  name: string;
  content: string;
  tags?: string;
  title?: string;
}

export interface ImageItem {
  url: string;
  name: string;
  selected?: boolean;
}

export type AuthType = 'KEYCHAIN' | 'VAULT' | 'POSTING';

export interface TagGroup {
  id: string;
  name: string;
  tags: string[];
}

export type Language = 'uk' | 'en' | 'es' | 'ko';

export interface QueueItem {
  id: string;
  title: string;
  body: string;
  tags: string;
  authType: AuthType;
  username: string;
  selectedVaultUser?: string;
  scheduledTime: string;
  status: 'pending' | 'success' | 'failed' | 'processing';
  error?: string;
}

export interface SteemPost {
  id?: number | string;
  author: string;
  permlink: string;
  category: string;
  title: string;
  body: string;
  json_metadata?: string;
  created?: string;
  last_update?: string;
  depth?: number;
  children?: number;
  net_rshares?: number | string;
  payout?: string;
  pending_payout_value?: string;
  total_payout_value?: string;
  curator_payout_value?: string;
  active_votes?: any[];
  replies?: any[];
  parent_author?: string;
  parent_permlink?: string;
  url?: string;
  [key: string]: any;
}

export interface SteemNotification {
  id: string;
  type: 'reply' | 'vote' | 'mention' | 'follow' | string;
  author: string;
  permlink: string;
  parent_author?: string;
  parent_permlink?: string;
  body?: string;
  timestamp: string;
  isRead: boolean;
}

export interface ReaderConfig {
  whiteList: string[];
  blackList: string[];
  fontSize: number;
  fontWeight: number;
  limitPerUser: number;
  daysLimit: number;
  tags: string[];
  contentWidth: number;
  excludeMuted: boolean;
  autoLoadComments: boolean;
  strictTagMode: boolean;
  favoriteTags: string[];
  autoShowInbox: boolean;
  loadImages: boolean;
  enableVoteLogging: boolean;
  mutedUsers?: string[];
}
