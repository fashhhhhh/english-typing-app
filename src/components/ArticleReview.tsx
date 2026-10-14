import { BookOpen, RotateCcw, Volume2, X } from 'lucide-react';
import { ArticleParagraph } from '../services/articleService';
import { speakEnglish } from '../services/speech';

interface ArticleReviewProps {
  /** 中文标题 */
  titleZh: string;
  /** 英文标题 */
  title: string;
  author: string;
  paragraphs: ArticleParagraph[];
  /** 重新练本篇 */
  onRestart: () => void;
  /** 收起原文，回到刚才的成绩画面 */
  onClose: () => void;
}

/** 文章全文回看：结算后可通读英文原文与中文对照 */
export default function ArticleReview({
  titleZh,
  title,
  author,
  paragraphs,
  onRestart,
  onClose,
}: ArticleReviewProps) {
  return (
    <section className="animate-in fade-in rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm duration-200 sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <BookOpen size={18} />
          </span>
          <div>
            <h2 className="text-base font-semibold text-ink">
              全文
              <span className="ml-2 font-mono text-sm font-normal text-faint">{title}</span>
            </h2>
            <p className="mt-0.5 text-xs text-muted">
              {titleZh} · {author} · 共 {paragraphs.length} 段
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

      <ol className="mt-5 space-y-4">
        {paragraphs.map((p, i) => (
          <li
            key={i}
            className="group rounded-2xl bg-slate-50 px-4 py-3.5 transition-colors hover:bg-slate-100/80"
          >
            <div className="flex items-start gap-3">
              <span className="mt-0.5 w-5 shrink-0 text-right text-[11px] tabular-nums text-faint">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm leading-relaxed text-ink sm:text-[15px]">{p.en}</p>
                {p.zh && <p className="mt-1.5 text-xs leading-relaxed text-muted">{p.zh}</p>}
              </div>
              <button
                onClick={() => speakEnglish(p.en)}
                title="朗读本段"
                aria-label={`朗读第 ${i + 1} 段`}
                className="shrink-0 cursor-pointer rounded-full p-2 text-faint transition-colors hover:bg-primary/10 hover:text-primary"
              >
                <Volume2 size={15} />
              </button>
            </div>
          </li>
        ))}
      </ol>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          onClick={onRestart}
          className="flex cursor-pointer items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-primary/30 transition-all duration-200 hover:-translate-y-0.5 hover:bg-primary-dark active:translate-y-0"
        >
          <RotateCcw size={16} />
          重练本篇
        </button>
      </div>
    </section>
  );
}
