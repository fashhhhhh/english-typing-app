import { PracticeMode, StorageProvider, WrongItem } from '../storage/types';

export interface WordItem {
  word: string;
  meaning: string;
  level: string;
}

export interface LevelMeta {
  id: string;
  name: string;
}

export const WORD_LEVELS: LevelMeta[] = [
  { id: 'gaokao', name: '高考' },
  { id: 'cet4', name: 'CET-4 四级' },
  { id: 'cet6', name: 'CET-6 六级' },
  { id: 'kaoyan', name: '考研' },
  { id: 'toefl', name: '托福' },
];

/** 词库体积较大（每级数百 KB），按级别懒加载并缓存 */
const wordCache = new Map<string, WordItem[]>();

async function loadBuiltinWords(level: string): Promise<WordItem[]> {
  const cached = wordCache.get(level);
  if (cached) return cached;
  let data: WordItem[] = [];
  if (level === 'gaokao') {
    data = (await import('../data/gaokao-words.json')).default as unknown as WordItem[];
  } else if (level === 'cet4') {
    data = (await import('../data/cet4-words.json')).default as unknown as WordItem[];
  } else if (level === 'cet6') {
    data = (await import('../data/cet6-words.json')).default as unknown as WordItem[];
  } else if (level === 'kaoyan') {
    data = (await import('../data/kaoyan-words.json')).default as unknown as WordItem[];
  } else if (level === 'toefl') {
    data = (await import('../data/toefl-words.json')).default as unknown as WordItem[];
  }
  wordCache.set(level, data);
  return data;
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * 解析词条行，兼容三种常见格式：
 * - "abandon|v. 放弃"
 * - "abandon\tv. 放弃"（下载的词表常见）
 * - "abandon v. 放弃"（以中文为分界）
 */
export function parseEntryLine(line: string): { word: string; meaning: string } {
  const trimmed = line.replace(/^\uFEFF/, '').trim();
  let idx = trimmed.indexOf('|');
  if (idx === -1) idx = trimmed.indexOf('\t');
  if (idx > 0) {
    return {
      word: trimmed.slice(0, idx).trim(),
      meaning: trimmed.slice(idx + 1).trim().replace(/\s+/g, ' '),
    };
  }

  const nonAscii = trimmed.search(/[^\x00-\x7F]/);
  if (nonAscii > 0) {
    const head = trimmed.slice(0, nonAscii).trim();
    const parts = head.split(/\s+/);
    const word = parts[0];
    const posTag = parts.slice(1).join(' ');
    const meaning = trimmed.slice(head.length).trim().replace(/\s+/g, ' ');
    return { word, meaning: posTag ? `${posTag} ${meaning}` : meaning };
  }

  return { word: trimmed, meaning: '' };
}

/** 获取某级别的单词列表：内置词库 + 用户自定义语料 */
export async function getWordsByLevel(
  level: string,
  storage: StorageProvider,
): Promise<WordItem[]> {
  const builtin = await loadBuiltinWords(level);
  const custom = storage
    .getCustomCorpora()
    .filter((c) => c.type === 'word')
    .flatMap((c) =>
      c.items.map((line) => {
        const { word, meaning } = parseEntryLine(line);
        return { word, meaning: meaning || '自定义词库', level };
      }),
    );
  return [...builtin, ...custom];
}

/** 一道练习题：target 为要输入的英文，label 为中文提示 */
export interface Question {
  target: string;
  label: string;
  /** 是否来自错词本的复习题 */
  review: boolean;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** 间隔重复策略：错 1 次 1 天后复习，错 2 次 3 天，错 3 次及以上 7 天 */
export function reviewIntervalDays(wrongCount: number): number {
  if (wrongCount <= 1) return 1;
  if (wrongCount === 2) return 3;
  return 7;
}

/** 取已到期的错词复习项（按到期时间升序） */
export function getDueWrongItems(storage: StorageProvider, mode: PracticeMode): WrongItem[] {
  const now = Date.now();
  return storage
    .getWrongBook()
    .filter((w) => w.type === mode && w.nextReviewAt <= now)
    .sort((a, b) => a.nextReviewAt - b.nextReviewAt);
}

/**
 * 生成一轮混合队列：到期的错词复习项优先（至多占一半），
 * 其余从对应级别词库随机补齐，最后整体打乱。
 */
export async function buildMixedQueue(
  mode: PracticeMode,
  level: string,
  storage: StorageProvider,
  count: number,
): Promise<Question[]> {
  const due = getDueWrongItems(storage, mode);
  const reviewPart: Question[] = due
    .slice(0, Math.ceil(count / 2))
    .map((w) => ({ target: w.target, label: w.label, review: true }));
  const reviewTargets = new Set(reviewPart.map((q) => q.target));

  const remaining = count - reviewPart.length;
  const pool: Question[] = (await getWordsByLevel(level, storage)).map((w) => ({
    target: w.word,
    label: w.meaning,
    review: false,
  }));
  const fresh = shuffle(pool.filter((q) => !reviewTargets.has(q.target))).slice(0, remaining);

  return shuffle([...reviewPart, ...fresh]);
}

export function levelName(levelId: string): string {
  return WORD_LEVELS.find((l) => l.id === levelId)?.name ?? levelId;
}

/** 某级别的词数（词库下拉展示用） */
export async function getLevelWordCount(level: string): Promise<number> {
  return (await loadBuiltinWords(level)).length;
}

/** 供词库页浏览：返回内置与自定义语料的概览 */
export interface CorpusOverview {
  /** 内置语料为 builtin- 前缀，自定义语料为其真实 id（供删除使用） */
  id: string;
  mode: PracticeMode;
  levelId: string;
  name: string;
  count: number;
  sample: string[];
  custom: boolean;
}

export async function getCorpusOverviews(storage: StorageProvider): Promise<CorpusOverview[]> {
  const overviews: CorpusOverview[] = [];
  for (const meta of WORD_LEVELS) {
    const words = await loadBuiltinWords(meta.id);
    overviews.push({
      id: `builtin-word-${meta.id}`,
      mode: 'word',
      levelId: meta.id,
      name: meta.name,
      count: words.length,
      sample: words.slice(0, 6).map((w) => w.word),
      custom: false,
    });
  }
  for (const c of storage.getCustomCorpora()) {
    overviews.push({
      id: c.id,
      mode: c.type,
      levelId: 'custom',
      name: c.name,
      count: c.items.length,
      sample: c.items.slice(0, 3).map((line) => parseEntryLine(line).word),
      custom: true,
    });
  }
  return overviews;
}
