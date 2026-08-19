export interface CommunityPreset {
  id: string;
  name: string;
  tags: string[];
}

export interface PopularCommunity {
  id: string;
  name: string;
  desc: string;
}

/**
 * Пресети спільнот для редактора публікацій
 */
export const COMMUNITIES: CommunityPreset[] = [
  { id: 'ukraine', name: 'Steem Ukraine', tags: ['hive-145157', 'ukraine', 'steemexclusive'] },
  { id: 'venezuela', name: 'Steem Venezuela', tags: ['hive-193637', 'venezuela', 'steemexclusive'] },
  { id: 'colombia', name: 'Colombia-Original', tags: ['hive-113376', 'colombia', 'steemexclusive'] },
  { id: 'bangladesh', name: 'Steem Bangladesh', tags: ['hive-138339', 'bangladesh', 'steemexclusive'] },
  { id: 'indonesia', name: 'Steem Indonesia', tags: ['hive-133280', 'indonesia', 'steemexclusive'] },
  { id: 'xpilar', name: 'World of Xpilar', tags: ['hive-185836', 'xpilar', 'steemexclusive'] },
  { id: 'betterlife', name: 'Steem For Betterlife', tags: ['hive-153970', 'betterlife', 'steemexclusive'] },
  { id: 'entrepreneurs', name: 'Steem Entrepreneurs', tags: ['hive-181136', 'steem-entrepreneurs', 'steemexclusive'] },
  { id: 'kids', name: 'Steem Kids & Parents', tags: ['hive-139765', 'steemkids', 'steemexclusive'] },
  { id: 'newcomers', name: 'Newcomers Community', tags: ['hive-172186', 'achievement1'] },
  { id: 'writing', name: 'Writing & Reviews', tags: ['hive-190212', 'writing', 'steemexclusive'] },
  { id: 'foods', name: 'Steem Foods', tags: ['hive-180301', 'steemfoods', 'steemexclusive'] },
  { id: 'fashion', name: 'Fashion & Style', tags: ['hive-125125', 'fashion', 'steemexclusive'] },
  { id: 'crypto', name: 'Crypto Academy', tags: ['hive-108451', 'cryptoacademy', 'steemexclusive'] },
  { id: 'travel', name: 'Steem Travel', tags: ['hive-163291', 'travel', 'steemexclusive'] },
  { id: 'art', name: 'Steem Art', tags: ['hive-185836', 'art', 'steemexclusive'] },
  { id: 'garden', name: 'Steem Garden', tags: ['hive-180821', 'garden', 'steemexclusive'] },
  { id: 'news', name: 'Steem News', tags: ['hive-179607', 'news', 'steemexclusive'] },
  { id: 'promo', name: 'PromoSteem', tags: ['hive-152200', 'promosteem', 'steemexclusive'] },
  { id: 'woa', name: 'World of Animals', tags: ['hive-140292', 'animals', 'steemexclusive'] },
  { id: 'learn', name: 'Steem Learning', tags: ['hive-190212', 'learning', 'steemexclusive'] },
  { id: 'tech', name: 'Steem Tech', tags: ['hive-190212', 'technology', 'steemexclusive'] },
  { id: 'dev', name: 'Development', tags: ['hive-151113', 'dev', 'steem', 'steemexclusive'] },
  { id: 'sport', name: 'Steem Sport', tags: ['hive-106444', 'sport', 'steemexclusive'] },
  { id: 'health', name: 'Steem Health', tags: ['hive-168205', 'health', 'steemexclusive'] },
];

/**
 * Загальні рекомендовані теги для редактора
 */
export const COMMON_TAGS: string[] = [
  'life',
  'betterlife',
  'thediarygame',
  'club5050',
  'club75',
  'club100',
  'art',
  'photography',
  'travel',
  'food',
  'nature',
  'blog',
  'creative',
  'dev',
  'steem',
  'lifestyle',
  'news',
  'steemit',
  'sharing',
  'review',
  'tutorial',
];

/**
 * Популярні спільноти для швидкого вибору в рідері та курації
 */
export const POPULAR_COMMUNITIES: PopularCommunity[] = [
  { id: 'hive-145157', name: 'Ukraine on Steem', desc: 'Українська спільнота' },
  { id: 'hive-193637', name: 'Venezuela', desc: 'Steem Venezuela' },
  { id: 'hive-111111', name: 'Korea', desc: 'Steem Korea' },
  { id: 'hive-172186', name: 'Pakistan', desc: 'Steem Pakistan' },
  { id: 'hive-103393', name: 'Bangladesh', desc: 'Steem Bangladesh' },
  { id: 'hive-105017', name: 'Betterlife', desc: 'World Community' },
  { id: 'hive-151446', name: 'Kids', desc: 'Steem Kids' },
];

/**
 * Популярні теги для фільтрації в рідері та панелі курації
 */
export const POPULAR_TAGS: string[] = [
  'ua',
  'ukraine',
  'steemexclusive',
  'thediarygame',
  'steem',
  'steemit',
  'art',
  'travel',
  'photography',
  'creative',
  'writing',
  'promo-steem',
  'wox',
  'steem-languages',
  'betterlife',
  'lifestyle',
  'food',
  'news',
  'vlog',
  'nature',
  'technology',
  'steem-ua',
  'ukraine-steem',
  'steemitblog',
  'cryptocurrency',
  'bitcoin',
  'finance',
  'life',
  'contest',
  'learnsteem',
  'steem-engine',
  'community',
  'blog',
  'diary',
  'story',
  'adventure',
];
