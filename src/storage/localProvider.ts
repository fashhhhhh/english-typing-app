import { emitSettingsChanged } from '../services/settingsBus';
import {
  AppSettings,
  CustomArticle,
  CustomCorpus,
  DEFAULT_SETTINGS,
  PracticeRecord,
  StorageProvider,
  WrongItem,
} from './types';

const KEYS = {
  history: 'eta_history',
  corpora: 'eta_custom_corpora',
  settings: 'eta_settings',
  wrongBook: 'eta_wrong_book',
  articles: 'eta_custom_articles',
} as const;

function readJson<T>(key: string, fallback: T): T {
  const raw = window.localStorage.getItem(key);
  if (raw === null) return fallback;
  const parsed = JSON.parse(raw) as T;
  return parsed ?? fallback;
}

function writeJson(key: string, value: unknown): void {
  window.localStorage.setItem(key, JSON.stringify(value));
}

export function genId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** localStorage 实现的存储 Provider */
export class LocalStorageProvider implements StorageProvider {
  getHistory(): PracticeRecord[] {
    return readJson<PracticeRecord[]>(KEYS.history, []);
  }

  addRecord(record: PracticeRecord): void {
    const history = this.getHistory();
    history.unshift(record);
    // 上限保留 500 条，避免无限膨胀
    writeJson(KEYS.history, history.slice(0, 500));
  }

  clearHistory(): void {
    writeJson(KEYS.history, []);
  }

  getCustomCorpora(): CustomCorpus[] {
    return readJson<CustomCorpus[]>(KEYS.corpora, []);
  }

  saveCustomCorpus(corpus: CustomCorpus): void {
    const corpora = this.getCustomCorpora().filter((c) => c.id !== corpus.id);
    corpora.unshift(corpus);
    writeJson(KEYS.corpora, corpora);
  }

  deleteCustomCorpus(id: string): void {
    writeJson(
      KEYS.corpora,
      this.getCustomCorpora().filter((c) => c.id !== id),
    );
  }

  getWrongBook(): WrongItem[] {
    return readJson<WrongItem[]>(KEYS.wrongBook, []);
  }

  upsertWrongItem(item: WrongItem): void {
    // 同一类型 + 同一英文文本视为同一条目，覆盖更新
    const book = this.getWrongBook().filter(
      (w) => !(w.type === item.type && w.target === item.target),
    );
    book.unshift(item);
    writeJson(KEYS.wrongBook, book.slice(0, 300));
  }

  deleteWrongItem(id: string): void {
    writeJson(
      KEYS.wrongBook,
      this.getWrongBook().filter((w) => w.id !== id),
    );
  }

  getCustomArticles(): CustomArticle[] {
    return readJson<CustomArticle[]>(KEYS.articles, []);
  }

  saveCustomArticle(article: CustomArticle): void {
    const articles = this.getCustomArticles().filter((a) => a.id !== article.id);
    articles.unshift(article);
    writeJson(KEYS.articles, articles.slice(0, 50));
  }

  deleteCustomArticle(id: string): void {
    writeJson(
      KEYS.articles,
      this.getCustomArticles().filter((a) => a.id !== id),
    );
  }

  exportBackup(): string {
    const data: Record<string, unknown> = {};
    for (const key of Object.values(KEYS)) {
      data[key] = readJson<unknown>(key, null);
    }
    return JSON.stringify(
      {
        app: 'typeenglish',
        version: 1,
        exportedAt: new Date().toISOString(),
        data,
      },
      null,
      2,
    );
  }

  restoreBackup(raw: string): { ok: boolean; error?: string } {
    let parsed: { app?: string; data?: Record<string, unknown> } | null = null;
    try {
      parsed = JSON.parse(raw) as { app?: string; data?: Record<string, unknown> };
    } catch {
      return { ok: false, error: '文件不是有效的 JSON' };
    }
    if (!parsed || parsed.app !== 'typeenglish' || !parsed.data) {
      return { ok: false, error: '不是 TypeEnglish 的备份文件' };
    }

    const allowed = new Set<string>(Object.values(KEYS));
    let restored = 0;
    for (const [key, value] of Object.entries(parsed.data)) {
      if (!allowed.has(key) || value === null || value === undefined) continue;
      writeJson(key, value);
      restored++;
    }
    if (restored === 0) return { ok: false, error: '备份中没有可恢复的数据' };
    emitSettingsChanged();
    return { ok: true };
  }

  getSettings(): AppSettings {
    // 与默认值合并，兼容旧版本缺少新字段的存档
    return { ...DEFAULT_SETTINGS, ...readJson<Partial<AppSettings>>(KEYS.settings, {}) };
  }

  saveSettings(settings: AppSettings): void {
    writeJson(KEYS.settings, settings);
    emitSettingsChanged();
  }
}
