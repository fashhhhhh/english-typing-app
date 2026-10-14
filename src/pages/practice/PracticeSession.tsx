import { useCallback, useEffect, useRef, useState } from 'react';
import { Eye, Infinity as InfinityIcon, Pause, Play, Square } from 'lucide-react';
import PauseOverlay from '../../components/PauseOverlay';
import WordPanel from '../../components/WordPanel';
import SpeedBar from '../../components/SpeedBar';
import ChapterProgress from '../../components/ChapterProgress';
import TypingPad from '../../components/TypingPad';
import { useFollowEngine } from '../../hooks/useFollowEngine';
import { useTypingKeyboard } from '../../hooks/useTypingKeyboard';
import { useKeyboardOpen } from '../../hooks/useVisualViewport';
import { FollowSnapshot, FollowWord } from '../../engine/followEngine';
import { speakEnglish } from '../../services/speech';
import {
  playErrorTone,
  playFinishJingle,
  playKeyClick,
  playWordChime,
} from '../../services/sounds';

interface PracticeSessionProps {
  words: FollowWord[];
  /** 从章节内第几个单词开始（切换跟打/默写时保持进度） */
  startIndex: number;
  /** 默写模式：隐藏未输入的字母 */
  hidden: boolean;
  /** 结算后回看原文期间冻结键盘输入 */
  frozen?: boolean;
  /** 无限练习：不设章节长度，随时可结束结算 */
  infinite: boolean;
  sound: boolean;
  autoSpeak: boolean;
  /** 无限练习时按需取下一批单词 */
  fetchMore?: () => Promise<FollowWord[]>;
  /** 章节进度上报（切换模式时用于续练） */
  onAdvance: (index: number) => void;
  /** 整章完成 / 手动结束 */
  onComplete: (snapshot: FollowSnapshot) => void;
}

/**
 * 统一练习会话：跟打与默写共用同一套界面与交互，
 * 差异仅在于是否隐藏英文单词（默写）。逐字母校验，输错整词重打。
 */
export default function PracticeSession({
  words: initialWords,
  startIndex,
  hidden,
  frozen = false,
  infinite,
  sound,
  autoSpeak,
  fetchMore,
  onAdvance,
  onComplete,
}: PracticeSessionProps) {
  const [showAnswer, setShowAnswer] = useState(false);
  const [words, setWords] = useState<FollowWord[]>(initialWords);
  const snapshotRef = useRef<FollowSnapshot | null>(null);
  const loadingMoreRef = useRef(false);

  const { snapshot, inputChar, skipWord, start, appendWords, togglePause } = useFollowEngine(
    initialWords,
    {
      onKey: () => {
        if (sound) playKeyClick();
      },
      onError: () => {
        if (sound) playErrorTone();
      },
      onWordComplete: () => {
        if (sound) playWordChime();
      },
      onChapterComplete: (final) => {
        if (sound) playFinishJingle();
        onComplete(final);
      },
    },
    startIndex,
  );

  snapshotRef.current = snapshot;

  // 移动端：隐藏输入垫接管虚拟键盘（桌面端不渲染）
  const { inputRef, focus, isTouch, focused } = useTypingKeyboard({ onChar: inputChar, frozen });

  /** 手机键盘弹出时压缩布局并回到顶部，保证单词始终在可见区域内 */
  const keyboardOpen = useKeyboardOpen(isTouch);

  useEffect(() => {
    if (keyboardOpen) window.scrollTo({ top: 0 });
  }, [keyboardOpen]);

  /**
   * 点击练习区唤起手机键盘。
   * 用 click 而不是 pointerup：触摸会依次派发 pointerup → mousedown → click，
   * 若在 pointerup 里聚焦，随后的 mousedown 会立刻把焦点抢回 body。
   */
  const handleAreaClick = (e: React.MouseEvent) => {
    if (!isTouch || frozen) return;
    const target = e.target as HTMLElement;
    if (target.closest('button, a, input, select, label, [role=listbox]')) return;
    focus();
  };

  // 上报章节进度（供切换模式时续练）
  useEffect(() => {
    onAdvance(snapshot.wordIndex);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapshot.wordIndex]);

  // 中途续练（startIndex > 0）时无需按键直接开始计时
  useEffect(() => {
    if (startIndex > 0) start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startIndex]);

  // 无限练习：接近词表末尾时自动补充下一批
  useEffect(() => {
    if (!infinite || !fetchMore) return;
    if (snapshot.wordIndex < words.length - 3) return;
    if (loadingMoreRef.current || snapshot.finished) return;
    loadingMoreRef.current = true;
    fetchMore()
      .then((more) => {
        if (more.length > 0) {
          appendWords(more);
          setWords((prev) => [...prev, ...more]);
        }
      })
      .finally(() => {
        loadingMoreRef.current = false;
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapshot.wordIndex, infinite, words.length, fetchMore]);

  // 新单词出现时自动朗读
  useEffect(() => {
    if (!autoSpeak || !snapshot.started || snapshot.finished) return;
    speakEnglish(snapshot.word);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapshot.wordIndex, snapshot.started]);

  const repeatSpeak = useCallback(() => speakEnglish(snapshotRef.current?.word ?? ''), []);

  const finishEarly = useCallback(() => {
    const current = snapshotRef.current;
    if (!current || current.stats.totalKeystrokes === 0) return;
    if (sound) playFinishJingle();
    onComplete(current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onComplete, sound]);

  // 全局键盘监听：直接捕获按键，无需输入框
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (frozen) return;
      // 输入垫聚焦时，字符与退格已由输入事件处理，这里跳过避免重复
      const fromPad = (e.target as HTMLElement | null)?.dataset?.typingPad === 'true';
      if (fromPad && (e.key === 'Backspace' || e.key.length === 1)) return;
      if (e.key === 'Escape') {
        // 下拉列表打开时 Esc 用于关闭列表，不触发暂停
        if (document.querySelector('[role=listbox]')) return;
        if (!snapshotRef.current?.started || snapshotRef.current.finished) return;
        e.preventDefault();
        togglePause();
        return;
      }
      if (e.ctrlKey && e.shiftKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
        e.preventDefault();
        skipWord(e.key === 'ArrowLeft' ? 'prev' : 'next');
        return;
      }
      if (e.ctrlKey && e.key.toLowerCase() === 'j') {
        e.preventDefault();
        repeatSpeak();
        return;
      }
      if (e.key === 'Tab') {
        e.preventDefault();
        setShowAnswer(true);
        return;
      }
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key.length === 1 && /[a-zA-Z'-]/.test(e.key)) inputChar(e.key);
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Tab') setShowAnswer(false);
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [inputChar, skipWord, repeatSpeak, togglePause, frozen]);

  return (
    <div
      onClick={handleAreaClick}
      className={`relative flex w-full flex-col items-center ${
        keyboardOpen
          ? 'min-h-0 gap-2'
          : 'min-h-[50dvh] gap-4 sm:min-h-[calc(100vh-10rem)] sm:gap-5'
      }`}
    >
      {isTouch && <TypingPad inputRef={inputRef} />}

      <WordPanel
        snapshot={snapshot}
        words={words}
        showAnswer={showAnswer}
        hidden={hidden}
        infinite={infinite}
        startHint={isTouch ? '点击这里开始打字' : '按任意键开始'}
        ready={isTouch && focused && !frozen}
        compact={keyboardOpen}
        onSpeak={repeatSpeak}
      />

      <div className="flex w-full max-w-2xl flex-wrap items-center gap-2 sm:gap-3">
        {infinite ? (
          <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary sm:px-3.5">
            <InfinityIcon size={14} />
            无限练习 · 已练 {snapshot.stats.correctWords} 词
          </span>
        ) : (
          <div className="min-w-[110px] flex-1">
            <ChapterProgress progress={snapshot.stats.progress} />
          </div>
        )}
        {/* 手机没有 Tab 键，默写模式给一个"按住看答案"按钮 */}
        {isTouch && hidden && (
          <button
            onPointerDown={() => setShowAnswer(true)}
            onPointerUp={() => setShowAnswer(false)}
            onPointerLeave={() => setShowAnswer(false)}
            title="按住查看答案"
            className="flex shrink-0 cursor-pointer touch-none select-none items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-muted"
          >
            <Eye size={12} />
            看答案
          </button>
        )}
        <button
          onClick={() => {
            const resuming = snapshot.paused;
            togglePause();
            if (resuming) focus();
          }}
          disabled={!snapshot.started || snapshot.finished}
          title={snapshot.paused ? '继续练习（Esc）' : '暂停练习（Esc）'}
          className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-200 sm:px-3.5 ${
            snapshot.started && !snapshot.finished
              ? snapshot.paused
                ? 'cursor-pointer border-primary/40 bg-primary/10 text-primary'
                : 'cursor-pointer border-slate-200 bg-white text-muted hover:-translate-y-0.5 hover:text-ink hover:shadow'
              : 'cursor-not-allowed border-slate-100 text-faint'
          }`}
        >
          {snapshot.paused ? <Play size={12} /> : <Pause size={12} />}
          <span className="hidden sm:inline">{snapshot.paused ? '继续' : '暂停'}</span>
        </button>
        <button
          onClick={finishEarly}
          disabled={!snapshot.started}
          title="随时结束本组并结算成绩"
          className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-200 sm:px-3.5 ${
            snapshot.started
              ? 'cursor-pointer border-slate-200 bg-white text-muted hover:-translate-y-0.5 hover:text-ink hover:shadow'
              : 'cursor-not-allowed border-slate-100 text-faint'
          }`}
        >
          <Square size={12} />
          <span className="hidden sm:inline">结束并结算</span>
        </button>
      </div>

      <SpeedBar stats={snapshot.stats} compact={keyboardOpen} />

      {!keyboardOpen && (
        <p className="px-4 text-center text-xs text-faint">
          {isTouch
            ? '输错需重打整个单词 · 点上方「暂停」可休息'
            : '输入错误需重打整个单词 · Esc 暂停/继续 · Tab 显示答案 · Ctrl + J 重听发音 · Ctrl + Shift + ←/→ 切换单词'}
          {hidden ? ' · 默写模式下字母以横线隐藏' : ''}
        </p>
      )}

      {/* 暂停浮层 */}
      {snapshot.paused && (
        <PauseOverlay
          onResume={() => {
            togglePause();
            focus();
          }}
        />
      )}
    </div>
  );
}
