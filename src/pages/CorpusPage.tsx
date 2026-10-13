import { useEffect, useMemo, useState } from 'react';
import { BookA, Check, Import, Pencil, Trash2, X } from 'lucide-react';
import {
  CorpusOverview,
  getCorpusOverviews,
  parseEntryLine,
} from '../services/corpusService';
import { useStorage } from '../storage/StorageContext';
import { genId } from '../storage/localProvider';

/**
 * 识别粘贴内容里的词库名：
 * 首行没有分隔符、长度较短且含中文（或明显的标题词），就当作词库名并从词条中剔除。
 */
function detectCorpusName(lines: string[]): { name: string; items: string[] } {
  if (lines.length === 0) return { name: '', items: [] };
  const first = lines[0];
  const isPureEnglishWord = /^[a-zA-Z][a-zA-Z'-]*$/.test(first);
  const looksLikeTitle =
    !first.includes('|') &&
    !first.includes('\t') &&
    first.length <= 20 &&
    !isPureEnglishWord &&
    (/[\u4e00-\u9fa5]/.test(first) || /(list|vocab|words?|词汇|词库|单词|大纲)/i.test(first));
  return looksLikeTitle
    ? { name: first, items: lines.slice(1) }
    : { name: '', items: lines };
}

function defaultName(itemCount: number): string {
  const today = new Date();
  return `自定义词库 ${today.getMonth() + 1}/${today.getDate()} · ${itemCount} 词`;
}

export default function CorpusPage() {
  const storage = useStorage();
  const [refreshKey, setRefreshKey] = useState(0);
  const [overviews, setOverviews] = useState<CorpusOverview[]>([]);
  const [name, setName] = useState('');
  const [raw, setRaw] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  // 词库按级别懒加载，异步获取概览
  useEffect(() => {
    let cancelled = false;
    getCorpusOverviews(storage).then((list) => {
      if (!cancelled) setOverviews(list);
    });
    return () => {
      cancelled = true;
    };
  }, [storage, refreshKey]);

  const parsed = useMemo(() => {
    const lines = raw
      .split('\n')
      .map((l) => l.replace(/^\uFEFF/, '').trim())
      .filter((l) => l.length > 0);
    const detected = detectCorpusName(lines);
    const finalName = name.trim() || detected.name || defaultName(detected.items.length);
    return { name: finalName, detectedName: detected.name, items: detected.items };
  }, [raw, name]);

  const canImport = parsed.items.length > 0;

  const handleImport = () => {
    if (!canImport) return;
    storage.saveCustomCorpus({
      id: genId(),
      name: parsed.name,
      type: 'word',
      items: parsed.items,
      createdAt: Date.now(),
    });
    setName('');
    setRaw('');
    setRefreshKey((k) => k + 1);
  };

  const handleDelete = (id: string) => {
    storage.deleteCustomCorpus(id);
    setRefreshKey((k) => k + 1);
  };

  const startRename = (o: CorpusOverview) => {
    setEditingId(o.id);
    setEditingName(o.name);
  };

  const saveRename = (o: CorpusOverview) => {
    const nextName = editingName.trim();
    if (nextName && nextName !== o.name) {
      const target = storage.getCustomCorpora().find((c) => c.id === o.id);
      if (target) storage.saveCustomCorpus({ ...target, name: nextName });
    }
    setEditingId(null);
    setRefreshKey((k) => k + 1);
  };

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8 px-5 py-6 sm:py-10">
      <section>
        <h1 className="text-2xl font-semibold text-ink">单词库</h1>
        <p className="mt-1 text-sm text-muted">
          内置分级词库开箱即用；整库粘贴导入后可随时重命名。错词管理请见左侧「错词本」。
        </p>
      </section>

      {/* 语料卡片网格 */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {overviews.map((o) => (
          <div
            key={o.id}
            className="group flex flex-col rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <BookA size={17} />
              </span>
              <div className="flex items-center gap-2">
                <span
                  className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                    o.custom ? 'bg-warning/10 text-warning' : 'bg-slate-100 text-muted'
                  }`}
                >
                  {o.custom ? '自定义' : '内置'}
                </span>
                {o.custom &&
                  (editingId === o.id ? (
                    <span className="flex items-center gap-1">
                      <button
                        onClick={() => saveRename(o)}
                        className="cursor-pointer rounded-full p-1.5 text-success transition-colors hover:bg-success/10"
                        aria-label="保存名称"
                      >
                        <Check size={14} />
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="cursor-pointer rounded-full p-1.5 text-faint transition-colors hover:bg-slate-100"
                        aria-label="取消重命名"
                      >
                        <X size={14} />
                      </button>
                    </span>
                  ) : (
                    <>
                      <button
                        onClick={() => startRename(o)}
                        className="cursor-pointer rounded-full p-1.5 text-faint transition-colors hover:bg-primary/10 hover:text-primary"
                        aria-label="重命名"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(o.id)}
                        className="cursor-pointer rounded-full p-1.5 text-faint transition-colors hover:bg-danger/10 hover:text-danger"
                        aria-label="删除语料"
                      >
                        <Trash2 size={14} />
                      </button>
                    </>
                  ))}
              </div>
            </div>

            {editingId === o.id ? (
              <input
                value={editingName}
                autoFocus
                data-testid="rename-input"
                onChange={(e) => setEditingName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveRename(o);
                  if (e.key === 'Escape') setEditingId(null);
                }}
                className="w-full rounded-lg border border-primary/40 bg-white px-2.5 py-1.5 text-sm font-semibold text-ink outline-none focus:ring-2 focus:ring-primary/20"
              />
            ) : (
              <h3 className="truncate font-semibold text-ink">{o.name}</h3>
            )}
            <p className="mt-0.5 text-xs text-muted">共 {o.count} 词</p>
            <p className="mt-3 line-clamp-2 font-mono text-xs leading-relaxed text-faint">
              {o.sample.join('  ·  ')}
            </p>
          </div>
        ))}
      </section>

      {/* 整库导入 */}
      <section className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-ink">
          <Import size={18} className="text-primary" />
          导入整库词表
        </h2>
        <p className="mt-1 text-sm text-muted">
          直接粘贴整份词表即可，每行一个词。支持
          <code className="mx-1 rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs">
            word|释义
          </code>
          、
          <code className="mx-1 rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs">
            word 制表符 释义
          </code>
          、
          <code className="mx-1 rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs">
            word 中文释义
          </code>
          三种格式；若首行是词库名（如「中考词汇」）会自动识别并作为词库名称。
        </p>

        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-3">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="词库名称（留空自动识别）"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-ink outline-none transition-all placeholder:text-faint focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20"
            />
            <div className="rounded-xl bg-slate-50 px-4 py-3 text-xs leading-relaxed text-muted">
              <p>
                将创建：
                <span className="font-semibold text-primary">{parsed.name || '—'}</span>
              </p>
              <p className="mt-1">
                已解析 <span className="font-semibold text-primary">{parsed.items.length}</span> 个词
                {parsed.detectedName && (
                  <span className="ml-1 text-warning">（首行「{parsed.detectedName}」识别为词库名）</span>
                )}
              </p>
              {parsed.items.length > 0 && (
                <span className="mt-1 block truncate font-mono text-faint">
                  预览：{parsed.items.slice(0, 3).map((l) => parseEntryLine(l).word).join(' / ')}
                </span>
              )}
            </div>
            <button
              onClick={handleImport}
              disabled={!canImport}
              className={`flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-all duration-200 ${
                canImport
                  ? 'cursor-pointer bg-primary text-white shadow-lg shadow-primary/30 hover:-translate-y-0.5 hover:bg-primary-dark'
                  : 'cursor-not-allowed bg-slate-100 text-faint'
              }`}
            >
              <Import size={15} />
              创建词库
            </button>
          </div>
          <textarea
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            rows={9}
            placeholder={
              '中考词汇\nabandon 放弃；抛弃\nability 能力\nabsorb 吸收\n……（整份词表直接粘贴）'
            }
            className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-mono text-sm leading-relaxed text-ink outline-none transition-all placeholder:text-faint focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </section>
    </div>
  );
}
