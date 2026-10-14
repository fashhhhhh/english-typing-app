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
  /** 未开始时的遮罩提示（移动端为"点击这里开始"） */
  startHint?: string;
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
  startHint = '按任意键开始',
  onSpeak,
}: WordPanelProps) {
  const prev = words[snapshot.wordIndex - 1];
  const next = words[snapshot.wordIndex + 1];
  const letters = snapshot.word.split('');

  /** 单词越长字号越小，保证手机上长词也能一行放下 */
  const len = snapshot.word.length;
  const sizeClass =
    len > 14
      ? 'text-[26px] sm:text-[52px]'
      : len > 10
        ? 'text-[31px] sm:text-[60px]'
        : 'text-[36px] sm:text-[64px]';

  /** 默写模式下未输入的字母显示为下划线，答对/答错后揭示 */
  const displayChar = (ch: string, state: LetterState) => {
    if (!hidden || showAnswer || state !== 'normal') return ch;
    return '_';
  };

  return (
    <div className="relative flex w-full flex-1 flex-col items-center justify-center">
      {/* 上一词 / 词序 / 下一词 */}
      <div className="mb-4 grid w-full max-w-3xl grid-cols-3 items-center px-3 text-xs text-faint sm:mb-6 sm:px-4 sm:text-base">
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
        className={`flex items-baseline justify-center font-mono leading-none tracking-wide ${sizeClass} ${
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
      <div className="mt-4 flex items-center gap-2 px-4 sm:mt-6 sm:gap-3">
        <span data-testid="word-meaning" className="text-center text-sm text-muted sm:text-lg">
          {snapshot.label || '—'}
        </span>
        <button
          onClick={onSpeak}
          title="朗读单词（Ctrl + J）"
          className="shrink-0 cursor-pointer rounded-full p-2.5 text-faint transition-colors hover:bg-primary/10 hover:text-primary"
          aria-label="朗读单词"
        >
          <Volume2 size={17} />
        </button>
      </div>

      {hidden && !showAnswer && (
        <p className="mt-3 hidden items-center gap-1.5 text-xs text-faint sm:flex">
          <EyeOff size={13} /> 按住 Tab 可查看完整单词
        </p>
      )}

      {snapshot.wrongCountInWord >= 2 && !snapshot.hasWrong && (
        <p className="px-4 text-center text-xs text-warning">
          该词已错 {snapshot.wrongCountInWord} 次，错满 4 次将自动跳过
        </p>
      )}

      {/* 未开始时遮罩 */}
      {!snapshot.started && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-50/70 backdrop-blur-[2px]">
          <p className="animate-pulse px-6 text-center text-base font-medium text-muted sm:text-lg">
            {startHint}
          </p>
        </div>
      )}
    </div>
  );
}
