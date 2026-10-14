import { Fragment, memo } from 'react';
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
  /** 手机已唤起键盘：撤掉遮罩、显示光标，进入"就绪待输入"状态 */
  ready?: boolean;
  /** 键盘弹出、竖向空间紧张时的紧凑排版 */
  compact?: boolean;
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
  ready = false,
  compact = false,
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

  const showCaret = (snapshot.started || ready) && !snapshot.finished && !snapshot.hasWrong;

  return (
    <div className="relative flex w-full flex-1 flex-col items-center justify-center">
      {/* 上一词 / 词序 / 下一词（手机上只保留词序，省竖向空间） */}
      <div
        className={`flex w-full max-w-3xl items-center px-3 text-xs text-faint sm:px-4 sm:text-base ${
          compact ? 'mb-2' : 'mb-5 sm:mb-6'
        }`}
      >
        <span className="hidden flex-1 truncate font-mono sm:block">{prev?.word ?? ''}</span>
        <span className="flex shrink-0 items-center justify-center gap-2 text-center tabular-nums">
          {hidden && (
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-medium text-primary">
              默写
            </span>
          )}
          {infinite ? `第 ${snapshot.wordIndex + 1} 词` : `${snapshot.wordIndex + 1} / ${snapshot.stats.totalWords}`}
        </span>
        <span className="hidden flex-1 truncate text-right font-mono sm:block">{next?.word ?? ''}</span>
      </div>

      {/* 大字单词（逐字母着色，默写时隐藏；就绪后显示待输入光标） */}
      <div
        data-testid="word-display"
        className={`flex items-center justify-center font-mono leading-none tracking-wide ${sizeClass} ${
          snapshot.hasWrong ? 'animate-shake' : ''
        }`}
      >
        {letters.map((ch, i) => (
          <Fragment key={`${i}-${ch}`}>
            {showCaret && i === snapshot.cursor && (
              <span
                aria-hidden
                style={{ height: '0.92em' }}
                className="animate-caret-blink mx-[1px] inline-block w-[3px] shrink-0 rounded-full bg-primary"
              />
            )}
            <Letter
              ch={displayChar(ch, snapshot.letterStates[i] ?? 'normal')}
              state={snapshot.letterStates[i] ?? 'normal'}
            />
          </Fragment>
        ))}
      </div>

      {/* 释义 + 发音 */}
      <div className={`flex items-center gap-2 px-4 sm:gap-3 ${compact ? 'mt-2' : 'mt-4 sm:mt-6'}`}>
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

      {/* 手机键盘已唤起：给出明确反馈，按第一个字母即开始计时 */}
      {ready && !snapshot.started && (
        <p className="mt-3 animate-pulse text-xs font-medium text-primary">
          键盘已就绪，输入第一个字母即开始计时
        </p>
      )}

      {hidden && !showAnswer && !compact && (
        <p className="mt-3 hidden items-center gap-1.5 text-xs text-faint sm:flex">
          <EyeOff size={13} /> 按住 Tab 可查看完整单词
        </p>
      )}

      {snapshot.wrongCountInWord >= 2 && !snapshot.hasWrong && !compact && (
        <p className="px-4 text-center text-xs text-warning">
          该词已错 {snapshot.wrongCountInWord} 次，错满 4 次将自动跳过
        </p>
      )}

      {/* 未开始且尚未唤起键盘时的遮罩 */}
      {!snapshot.started && !ready && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-50/70 backdrop-blur-[2px]">
          <p className="animate-pulse px-6 text-center text-base font-medium text-muted sm:text-lg">
            {startHint}
          </p>
        </div>
      )}
    </div>
  );
}
