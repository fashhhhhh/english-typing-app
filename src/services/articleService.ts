import indexData from '../data/articles/index.json';
import { CustomArticle, StorageProvider } from '../storage/types';

export interface ArticleMeta {
  id: string;
  title: string;
  titleZh: string;
  author: string;
  level: string;
  source: string;
  intro: string;
  paragraphCount: number;
  wordCount: number;
  charCount: number;
  /** 用户自定义文章 */
  custom?: boolean;
}

export interface ArticleParagraph {
  en: string;
  zh: string;
}

export interface ArticleData extends Omit<ArticleMeta, 'custom'> {
  paragraphs: ArticleParagraph[];
  custom?: boolean;
}

export const ARTICLE_LEVELS: { id: string; name: string }[] = [
  { id: 'basic', name: '初级' },
  { id: 'intermediate', name: '中级' },
  { id: 'advanced', name: '高级' },
];

const BUILTIN_INDEX = indexData as ArticleMeta[];

export function articleLevelName(levelId: string): string {
  return ARTICLE_LEVELS.find((l) => l.id === levelId)?.name ?? levelId;
}

/** 按 WPM 估算读完所需时间（分钟） */
export function estimateMinutes(wordCount: number, wpm = 25): number {
  return Math.max(1, Math.round(wordCount / wpm));
}

const articleCache = new Map<string, ArticleData>();

/** 内置文章的懒加载器：新增文章只需在此登记一行 */
const ARTICLE_LOADERS: Record<string, () => Promise<{ default: unknown }>> = {
  'the-lion-and-the-mouse': () => import('../data/articles/the-lion-and-the-mouse.json'),
  'after-twenty-years': () => import('../data/articles/after-twenty-years.json'),
  'walden-simplicity': () => import('../data/articles/walden-simplicity.json'),
};

/** 自定义文章 → 练习数据 */
export function customArticleToData(article: CustomArticle): ArticleData {
  const text = article.paragraphs.map((p) => p.en).join(' ');
  return {
    id: article.id,
    title: article.titleEn || article.title,
    titleZh: article.title,
    author: article.author || '自定义',
    level: article.level,
    source: '自定义文章',
    intro: article.intro,
    paragraphCount: article.paragraphs.length,
    wordCount: text.trim() ? text.trim().split(/\s+/).length : 0,
    charCount: text.length,
    paragraphs: article.paragraphs,
    custom: true,
  };
}

/** 文章库列表：内置 + 自定义 */
export function getAllArticles(storage: StorageProvider): ArticleMeta[] {
  return [
    ...storage.getCustomArticles().map((a) => {
      const data = customArticleToData(a);
      const { paragraphs, ...meta } = data;
      void paragraphs;
      return meta;
    }),
    ...BUILTIN_INDEX,
  ];
}

/** 文章正文按需加载（内置走懒加载，自定义从本地存储读取） */
export async function loadArticle(
  id: string,
  storage: StorageProvider,
): Promise<ArticleData | null> {
  const cached = articleCache.get(id);
  if (cached) return cached;

  let data: ArticleData | null = null;
  const custom = storage.getCustomArticles().find((a) => a.id === id);
  if (custom) {
    data = customArticleToData(custom);
  } else if (ARTICLE_LOADERS[id]) {
    data = (await ARTICLE_LOADERS[id]()).default as unknown as ArticleData;
  }

  if (data) articleCache.set(id, data);
  return data;
}

/** 把粘贴的正文按空行拆成段落（没有空行时按行拆分），块内换行合并为空格 */
export function splitParagraphBlocks(raw: string): string[] {
  const normalized = raw.replace(/\r\n/g, '\n').trim();
  if (!normalized) return [];
  const blocks = normalized
    .split(/\n\s*\n/)
    .map((b) => b.replace(/\s*\n\s*/g, ' ').trim())
    .filter(Boolean);
  if (blocks.length > 1) return blocks;
  return normalized
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
}

/** 英文段落词数合计 */
export function countWords(paragraphs: string[]): number {
  return paragraphs.reduce(
    (sum, p) => sum + (p.trim() ? p.trim().split(/\s+/).length : 0),
    0,
  );
}
