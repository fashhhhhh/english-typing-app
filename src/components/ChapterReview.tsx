import { BookOpen, RotateCcw, Volume2, X } from 'lucide-react';
import { FollowWord } from '../engine/followEngine';
import { speakEnglish } from '../services/speech';

interface ChapterReviewProps {
  /** 本章的单词（含中文释义） */
  words: FollowWord[];
  /** 标题文案 */
  title?: string;
  /** 再来一组 */
  onRestart: () => void;
  /** 收起原文，回到刚才的成绩画面 */
  onClose: () => void;
}

/** 本章原文：结算后可回看这一组练过的全部单词 */
export default function ChapterReview({
  words,
  title = '本章原文',
  onRestart,
  onClose,
}: ChapterReviewProps) {
  return (
    <section className="animate-in fade-in rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm duration-200 sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <BookOpen size={18} />
          </span>
          <div>
            <h2 className="text-base font-semibold text-ink">{title}</h2>
            <p className="mt-0.5 text-xs text-muted">
              本组共 {words.length} 个单词 · 点喇叭可重听发音
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="flex cursor-pointer items-center gap-1.5 rounded-full border border-slate-200 px-4 py-2 text-xs font-medium text-muted transition-all duration-200 hover:-translate-y-0.5 hover:text-ink hover:shadow"
        >
          <X size={14} />
          收起原文
        </button>
      </div>

      <ul className="mt-5 grid gap-2.5 sm:grid-cols-2">
        {words.map((w, i) => (
          <li
            key={`${i}-${w.word}`}
            className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3"
          >
            <span className="w-5 shrink-0 text-right text-[11px] tabular-nums text-faint">
              {i + 1}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-mono text-sm font-semibold text-ink">
                {w.word}
              </span>
              {w.label && (
                <span className="mt-0.5 block truncate text-xs text-muted">{w.label}</span>
              )}
            </span>
            <button
              onClick={() => speakEnglish(w.word)}
              title="朗读单词"
              aria-label={`朗读 ${w.word}`}
              className="shrink-0 cursor-pointer rounded-full p-2 text-faint transition-colors hover:bg-primary/10 hover:text-primary"
            >
              <Volume2 size={15} />
            </button>
          </li>
        ))}
      </ul>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          onClick={onRestart}
          className="flex cursor-pointer items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-primary/30 transition-all duration-200 hover:-translate-y-0.5 hover:bg-primary-dark active:translate-y-0"
        >
          <RotateCcw size={16} />
          再来一组
        </button>
        <p className="text-xs text-faint">换个词库或每组词数，可随时在上方工具栏调整</p>
      </div>
    </section>
  );
}
