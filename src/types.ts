export interface Draft {
  id: string;
  title: string;
  body: string;
  date: string;
  status?: 'working' | 'ready';
  tags?: string;
}

export interface Template {
  id: string;
  name: string;
  content: string;
  title?: string;
  tags?: string;
  type?: 'post' | 'snippet';
}

export interface ImageItem {
  url: string;
  name: string;
  selected?: boolean;
  exif?: string;
}

export interface TagGroup {
  id: string;
  name: string;
  tags: string[];
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
  excludeMuted?: boolean;
  autoLoadComments?: boolean;
  strictTagMode?: boolean;
  favoriteTags?: string[];
  onlyWhitelist?: boolean;
  autoShowInbox?: boolean;
  loadImages?: boolean;
  enableVoteLogging?: boolean;
}

export interface SteemNotification {
  id: string;
  type: 'reply' | 'mention';
  author: string;
  permlink: string;
  parent_author?: string;
  parent_permlink?: string;
  body: string;
  timestamp: string;
  isRead: boolean;
}

export interface SteemPost {
  author: string;
  permlink: string;
  category: string;
  title: string;
  body: string;
  json_metadata: string;
  created: string;
  active_votes: any[];
  children: number;
  reblogged_by?: string[];
  parent_author: string;
  parent_permlink: string;
  url?: string;
}

export type Language = 'uk' | 'en' | 'es' | 'ko';

export type AuthType = 'KEYCHAIN' | 'VAULT';

export interface QueueItem {
  id: string;
  title: string;
  body: string;
  tags: string;
  authType: AuthType;
  username: string;
  selectedVaultUser: string;
  scheduledTime?: string;
  status: 'pending' | 'published' | 'error';
  error?: string;
}
