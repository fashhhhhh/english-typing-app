import { memo } from 'react';
import { ArticleCharState } from '../engine/articleEngine';

interface ArticleTextProps {
  text: string;
  states: ArticleCharState[];
  cursor: number;
  /** 刚输错时整段轻微抖动 */
  wrongNow: boolean;
  onClick: () => void;
}

const charClass: Record<ArticleCharState, string> = {
  pending: 'text-slate-300',
  correct: 'text-ink',
  wrong: 'rounded bg-danger/10 text-danger underline decoration-danger/60 decoration-wavy',
};

const ArticleChar = memo(function ArticleChar({
  ch,
  state,
  isCursor,
}: {
  ch: string;
  state: ArticleCharState;
  isCursor: boolean;
}) {
  const caret = isCursor
    ? 'before:absolute before:-left-px before:top-[2px] before:h-[calc(100%-4px)] before:w-[2px] before:rounded-full before:bg-primary before:animate-caret-blink'
    : '';
  return <span className={`relative ${charClass[state]} ${caret}`}>{ch}</span>;
});

/** 文章正文：逐字符着色（未输入浅灰、已输入常态、错误红色波浪线） */
export default function ArticleText({
  text,
  states,
  cursor,
  wrongNow,
  onClick,
}: ArticleTextProps) {
  return (
    <div
      onClick={onClick}
      className="cursor-text select-none rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm transition-shadow duration-300 hover:shadow-md sm:p-9"
    >
      <p
        data-testid="article-text"
        className={`font-mono text-[17px] leading-[2] tracking-normal sm:text-[19px] ${
          wrongNow ? 'animate-shake' : ''
        }`}
      >
        {text.split('').map((ch, i) => (
          <ArticleChar key={i} ch={ch} state={states[i] ?? 'pending'} isCursor={i === cursor} />
        ))}
      </p>
    </div>
  );
}
