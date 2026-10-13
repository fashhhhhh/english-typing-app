/** 'sentence' 仅用于兼容早期版本的历史记录 */
export type PracticeMode = 'word' | 'sentence' | 'article';

/** 一次练习的成绩记录 */
export interface PracticeRecord {
  id: string;
  mode: PracticeMode;
  /** 词库/句库名称，如 "CET-4 四级" */
  sourceName: string;
  level: string;
  wpm: number;
  accuracy: number;
  durationSec: number;
  /** 错误字符 -> 次数（错字热力） */
  errorChars: Record<string, number>;
  createdAt: number;
}

/** 用户自定义语料（单词或句子） */
export interface CustomCorpus {
  id: string;
  name: string;
  type: PracticeMode;
  /** 单词条目支持 "word|释义"，句子支持 "text|翻译" */
  items: string[];
  createdAt: number;
}

/** 错词本条目：答错的单词/句子自动沉淀，按间隔重复策略复习 */
export interface WrongItem {
  id: string;
  type: PracticeMode;
  /** 英文目标文本 */
  target: string;
  /** 中文提示 */
  label: string;
  /** 累计答错次数（答对一次减一，归零移除） */
  wrongCount: number;
  lastWrongAt: number;
  /** 下次到期复习时间戳 */
  nextReviewAt: number;
}

/** 用户自定义文章（中英对照） */
export interface CustomArticle {
  id: string;
  /** 中文标题 */
  title: string;
  /** 英文标题（可空） */
  titleEn: string;
  author: string;
  level: string;
  intro: string;
  paragraphs: { en: string; zh: string }[];
  createdAt: number;
}

export type ThemeMode = 'light' | 'dark' | 'system';

export interface AppSettings {
  sound: boolean;
  /** 判定后自动朗读英文 */
  autoSpeak: boolean;
  /** 每组练习的词数（1-100） */
  chapterSize: number;
  /** 无限练习模式：不设章节长度，随时可结束结算 */
  infinite: boolean;
  /** 界面主题：白天 / 夜晚 / 跟随系统 */
  theme: ThemeMode;
  /** 打开练习页默认选中的词库 */
  defaultLevel: string;
  /** 打开练习页默认的输入方式 */
  defaultMode: 'follow' | 'dictation';
  /** 文章练习默认显示中文对照 */
  articleShowZh: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  sound: true,
  autoSpeak: true,
  chapterSize: 20,
  infinite: false,
  theme: 'system',
  defaultLevel: 'cet4',
  defaultMode: 'follow',
  articleShowZh: true,
};

/**
 * 存储抽象接口：UI 与引擎只依赖本接口。
 * 当前由 LocalStorageProvider 实现；未来接入后端时
 * 只需新增 HttpProvider 并在 StorageContext 处替换。
 */
export interface StorageProvider {
  getHistory(): PracticeRecord[];
  addRecord(record: PracticeRecord): void;
  clearHistory(): void;

  getCustomCorpora(): CustomCorpus[];
  saveCustomCorpus(corpus: CustomCorpus): void;
  deleteCustomCorpus(id: string): void;

  getWrongBook(): WrongItem[];
  upsertWrongItem(item: WrongItem): void;
  deleteWrongItem(id: string): void;

  getCustomArticles(): CustomArticle[];
  saveCustomArticle(article: CustomArticle): void;
  deleteCustomArticle(id: string): void;

  getSettings(): AppSettings;
  saveSettings(settings: AppSettings): void;

  /** 导出全部本地数据为 JSON 字符串（备份用） */
  exportBackup(): string;
  /** 从备份 JSON 恢复数据，返回是否成功 */
  restoreBackup(raw: string): { ok: boolean; error?: string };
}
