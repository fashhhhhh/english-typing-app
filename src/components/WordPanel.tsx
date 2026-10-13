import { memo } from 'react';
import { EyeOff, Volume2 } from 'lucide-react';
import { FollowSnapshot, FollowWord, LetterState } from '../engine/followEngine';

interface WordPanelProps {
  snapshot: FollowSnapshot;
  words: FollowWord[];
  /** 按住 Tab 显示完整答案 */
  showAnswer: boolean;
  /** 默写模式：隐藏未输入的字母（显示为下划线） */
  hidden: boolean;
  /** 无限练习：词序只显示当前第几词 */
  infinite?: boolean;
  onSpeak: () => void;
}

const letterClass: Record<LetterState, string> = {
  normal: 'text-slate-400',
  correct: 'text-success',
  wrong: 'text-danger',
};

const Letter = memo(function Letter({ ch, state }: { ch: string; state: LetterState }) {
  return <span className={`transition-colors duration-75 ${letterClass[state]}`}>{ch}</span>;
});

export default function WordPanel({
  snapshot,
  words,
  showAnswer,
  hidden,
  infinite = false,
  onSpeak,
}: WordPanelProps) {
  const prev = words[snapshot.wordIndex - 1];
  const next = words[snapshot.wordIndex + 1];
  const letters = snapshot.word.split('');

  /** 默写模式下未输入的字母显示为下划线，答对/答错后揭示 */
  const displayChar = (ch: string, state: LetterState) => {
    if (!hidden || showAnswer || state !== 'normal') return ch;
    return '_';
  };

  return (
    <div className="relative flex w-full flex-1 flex-col items-center justify-center">
      {/* 上一词 / 词序 / 下一词 */}
      <div className="mb-6 grid w-full max-w-3xl grid-cols-3 items-center px-4 text-sm text-faint sm:text-base">
        <span className="truncate font-mono">{prev?.word ?? ''}</span>
        <span className="flex items-center justify-center gap-2 text-center tabular-nums">
          {hidden && (
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-medium text-primary">
              默写
            </span>
          )}
          {infinite ? `第 ${snapshot.wordIndex + 1} 词` : `${snapshot.wordIndex + 1} / ${snapshot.stats.totalWords}`}
        </span>
        <span className="truncate text-right font-mono">{next?.word ?? ''}</span>
      </div>

      {/* 大字单词（逐字母着色，默写时隐藏） */}
      <div
        data-testid="word-display"
        className={`flex items-baseline justify-center font-mono text-[44px] leading-none tracking-wide sm:text-[64px] ${
          snapshot.hasWrong ? 'animate-shake' : ''
        }`}
      >
        {letters.map((ch, i) => (
          <Letter
            key={`${i}-${ch}`}
            ch={displayChar(ch, snapshot.letterStates[i] ?? 'normal')}
            state={snapshot.letterStates[i] ?? 'normal'}
          />
        ))}
      </div>

      {/* 释义 + 发音 */}
      <div className="mt-6 flex items-center gap-3">
        <span data-testid="word-meaning" className="text-base text-muted sm:text-lg">
          {snapshot.label || '—'}
        </span>
        <button
          onClick={onSpeak}
          title="朗读单词（Ctrl + J）"
          className="cursor-pointer rounded-full p-2 text-faint transition-colors hover:bg-primary/10 hover:text-primary"
          aria-label="朗读单词"
        >
          <Volume2 size={17} />
        </button>
      </div>

      {hidden && !showAnswer && (
        <p className="mt-3 flex items-center gap-1.5 text-xs text-faint">
          <EyeOff size={13} /> 按住 Tab 可查看完整单词
        </p>
      )}

      {snapshot.wrongCountInWord >= 2 && !snapshot.hasWrong && (
        <p className="mt-3 text-xs text-warning">
          该词已错 {snapshot.wrongCountInWord} 次，错满 4 次将自动跳过
        </p>
      )}

      {/* 未开始时遮罩 */}
      {!snapshot.started && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-50/70 backdrop-blur-[2px]">
          <p className="animate-pulse text-lg font-medium text-muted">按任意键开始</p>
        </div>
      )}
    </div>
  );
}
