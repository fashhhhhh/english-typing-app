import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookMarked, Play, Trash2, Volume2 } from 'lucide-react';
import { speakEnglish } from '../services/speech';
import { useStorage } from '../storage/StorageContext';

const DAY_MS = 24 * 60 * 60 * 1000;

/** 错词本：答错的单词自动沉淀，按 1/3/7 天间隔重复策略排期复习 */
export default function WrongBookPage() {
  const storage = useStorage();
  const navigate = useNavigate();
  const [refreshKey, setRefreshKey] = useState(0);
  /** 当前展开完整释义的错词 id（释义过长被截断时，点击可查看全文） */
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const items = useMemo(
    () =>
      storage
        .getWrongBook()
        .sort((a, b) => b.wrongCount - a.wrongCount || a.nextReviewAt - b.nextReviewAt),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [storage, refreshKey],
  );

  const dueCount = useMemo(
    () => items.filter((w) => w.nextReviewAt <= Date.now()).length,
    [items],
  );

  const removeItem = (id: string) => {
    storage.deleteWrongItem(id);
    setRefreshKey((k) => k + 1);
  };

  const clearAll = () => {
    if (!window.confirm(`确定清空全部 ${items.length} 个错词吗？它们的复习排期也会一并删除。`)) {
      return;
    }
    items.forEach((w) => storage.deleteWrongItem(w.id));
    setRefreshKey((k) => k + 1);
  };

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 px-5 py-6 sm:py-10">
      {/* 手机上纵向堆叠：文字占满整行，按钮整行放下方，避免左侧文字被挤成细条 */}
      <section className="flex flex-col items-start gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="flex items-center gap-2 text-2xl font-semibold text-ink">
            <BookMarked size={20} className="text-warning" />
            错词本
          </h1>
          <p className="mt-1 text-sm text-muted">
            练习中出错的单词自动收集，按「错 1 次 → 1 天、2 次 → 3 天、3 次以上 → 7 天」的节奏复现。
          </p>
        </div>
        {items.length > 0 && (
          <div className="flex w-full items-center gap-2 sm:w-auto sm:shrink-0">
            <button
              onClick={() => navigate('/practice?source=wrong')}
              className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary/30 transition-all duration-200 hover:-translate-y-0.5 hover:bg-primary-dark sm:flex-none"
            >
              <Play size={14} />
              开始错词专项
            </button>
            <button
              onClick={clearAll}
              className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-xs font-medium text-muted shadow-sm transition-all hover:text-danger"
            >
              <Trash2 size={13} />
              清空
            </button>
          </div>
        )}
      </section>

      {items.length > 0 && (
        <div className="flex flex-wrap gap-2.5 text-xs">
          <span className="rounded-full bg-slate-100 px-3.5 py-1.5 font-medium text-muted">
            共 {items.length} 个错词
          </span>
          <span className="rounded-full bg-warning/10 px-3.5 py-1.5 font-medium text-warning">
            {dueCount} 个待复习
          </span>
          <span className="rounded-full bg-success/10 px-3.5 py-1.5 font-medium text-success">
            {items.length - dueCount} 个已排期
          </span>
        </div>
      )}

      <section className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-7">
        {items.length === 0 ? (
          <p className="rounded-2xl bg-slate-50 px-5 py-12 text-center text-sm text-muted">
            太棒了，暂时没有答错记录！练习中出错的单词会自动收集到这里。
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {items.map((w) => {
              const due = w.nextReviewAt <= Date.now();
              return (
                <li key={w.id} className="flex items-center gap-3 py-3">
                  <div
                    className="min-w-0 flex-1 cursor-pointer select-none"
                    onClick={() => setExpandedId((cur) => (cur === w.id ? null : w.id))}
                    title={expandedId === w.id ? '点击收起' : '点击查看完整释义'}
                  >
                    <p className="truncate font-mono text-sm font-semibold text-ink">{w.target}</p>
                    <p
                      className={`text-xs leading-relaxed text-muted ${
                        expandedId === w.id ? '' : 'truncate'
                      }`}
                    >
                      {w.label || '—'}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium ${
                      due ? 'bg-warning/10 text-warning' : 'bg-slate-100 text-muted'
                    }`}
                  >
                    错 {w.wrongCount} 次 ·{' '}
                    {due
                      ? '待复习'
                      : `${Math.ceil((w.nextReviewAt - Date.now()) / DAY_MS)} 天后复习`}
                  </span>
                  <button
                    onClick={() => speakEnglish(w.target)}
                    className="shrink-0 cursor-pointer rounded-full p-2 text-faint transition-colors hover:bg-primary/10 hover:text-primary"
                    aria-label="朗读"
                  >
                    <Volume2 size={15} />
                  </button>
                  <button
                    onClick={() => removeItem(w.id)}
                    className="shrink-0 cursor-pointer rounded-full p-2 text-faint transition-colors hover:bg-danger/10 hover:text-danger"
                    aria-label="移出错词本"
                  >
                    <Trash2 size={15} />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
