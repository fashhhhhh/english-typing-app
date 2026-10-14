import { useCallback, useEffect, useRef, useState } from 'react';
import { Eye, EyeOff, Pause, Play, Quote, Square, Volume2 } from 'lucide-react';
import ArticleText from '../../components/ArticleText';
import PauseOverlay from '../../components/PauseOverlay';
import TypingPad from '../../components/TypingPad';
import SpeedBar from '../../components/SpeedBar';
import ChapterProgress from '../../components/ChapterProgress';
import { useArticleEngine } from '../../hooks/useArticleEngine';
import { useTypingKeyboard } from '../../hooks/useTypingKeyboard';
import { useKeyboardOpen } from '../../hooks/useVisualViewport';
import { ArticleSnapshot } from '../../engine/articleEngine';
import { ArticleParagraph } from '../../services/articleService';
import { speakEnglish } from '../../services/speech';
import { playErrorTone, playFinishJingle, playKeyClick } from '../../services/sounds';

interface ArticleSessionProps {
  paragraphs: ArticleParagraph[];
  sound: boolean;
  autoSpeak: boolean;
  /** 默认是否显示中文对照（取自设置） */
  defaultShowZh: boolean;
  /** 结算后回看全文期间冻结键盘输入 */
  frozen?: boolean;
  onComplete: (snapshot: ArticleSnapshot) => void;
}

/**
 * 文章跟打会话：以段落推进，逐字符校验（输错停在原地），
 * 上方显示该段中文对照，可在页面上开关或按住 Tab 临时查看。
 */
export default function ArticleSession({
  paragraphs,
  sound,
  autoSpeak,
  defaultShowZh,
  frozen = false,
  onComplete,
}: ArticleSessionProps) {
  const [showZh, setShowZh] = useState(defaultShowZh);
  const [peekZh, setPeekZh] = useState(false);
  const snapshotRef = useRef<ArticleSnapshot | null>(null);

  const { snapshot, inputChar, backspace, togglePause } = useArticleEngine(
    paragraphs.map((p) => p.en),
    {
      onKey: () => {
        if (sound) playKeyClick();
      },
      onError: () => {
        if (sound) playErrorTone();
      },
      onArticleComplete: (final) => {
        if (sound) playFinishJingle();
        onComplete(final);
      },
    },
  );

  snapshotRef.current = snapshot;

  // 移动端：隐藏输入垫接管虚拟键盘（桌面端不渲染）
  const { inputRef, focus, isTouch } = useTypingKeyboard({
    onChar: inputChar,
    onBackspace: backspace,
    frozen,
  });

  /**
   * 点击文章区唤起手机键盘。
   * 用 click 而不是 pointerup：触摸会依次派发 pointerup → mousedown → click，
   * 若在 pointerup 里聚焦，随后的 mousedown 会立刻把焦点抢回 body。
   */
  const handleAreaClick = (e: React.MouseEvent) => {
    if (!isTouch || frozen) return;
    const target = e.target as HTMLElement;
    if (target.closest('button, a, input, select, label')) return;
    focus();
  };

  /** 手机键盘弹出时压缩布局，并把正文滚到可视区顶部，避免被键盘遮挡 */
  const keyboardOpen = useKeyboardOpen(isTouch);
  const textRef = useRef<HTMLDivElement>(null);

  // 键盘弹出后、以及每次按键后检查：若正文被浏览器自动滚动顶出可视区就拉回来
  // （iOS 为了让聚焦元素露出键盘会自行滚动整页）
  useEffect(() => {
    if (!keyboardOpen) return;
    const timer = window.setTimeout(() => {
      const holder = textRef.current;
      if (!holder) return;
      const vh = window.visualViewport?.height ?? window.innerHeight;
      if (holder.getBoundingClientRect().bottom > vh + 4) {
        holder.scrollIntoView({ block: 'start', behavior: 'smooth' });
      }
    }, 180);
    return () => window.clearTimeout(timer);
  }, [keyboardOpen, snapshot.stats.totalKeystrokes]);

  const currentZh = paragraphs[snapshot.paragraphIndex]?.zh ?? '';
  const readAloud = useCallback(() => speakEnglish(snapshot.paragraphText), [snapshot.paragraphText]);

  // 自动朗读（可选）：每进入新段落播报一次
  useEffect(() => {
    if (!autoSpeak || !snapshot.started || snapshot.finished) return;
    speakEnglish(snapshot.paragraphText);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapshot.paragraphIndex]);

  const finishEarly = useCallback(() => {
    if (snapshot.stats.totalKeystrokes === 0) return;
    if (sound) playFinishJingle();
    onComplete(snapshot);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapshot, onComplete, sound]);

  // 全局键盘监听：文章含空格与标点，任何可打印字符都参与输入
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (frozen) return;
      // 输入垫聚焦时，字符与退格已由输入事件处理，这里跳过避免重复
      const fromPad = (e.target as HTMLElement | null)?.dataset?.typingPad === 'true';
      if (fromPad && (e.key === 'Backspace' || e.key.length === 1)) return;
      if (e.key === 'Escape') {
        if (snapshotRef.current?.started && !snapshotRef.current.finished) {
          e.preventDefault();
          togglePause();
        }
        return;
      }
      if (e.ctrlKey && e.key.toLowerCase() === 'j') {
        e.preventDefault();
        readAloud();
        return;
      }
      if (e.key === 'Tab') {
        e.preventDefault();
        setPeekZh(true);
        return;
      }
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === 'Backspace') {
        e.preventDefault();
        backspace();
        return;
      }
      if (e.key.length === 1) inputChar(e.key);
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Tab') setPeekZh(false);
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [inputChar, backspace, readAloud, togglePause, frozen]);

  return (
    <div onClick={handleAreaClick} className="relative flex flex-col gap-4">
      {/* 段落进度与操作 */}
      <div className="flex flex-wrap items-center justify-center gap-2.5 text-xs">
        <span className="rounded-full bg-ink px-3.5 py-1.5 font-medium tabular-nums text-white">
          第 {snapshot.paragraphIndex + 1} / {snapshot.stats.totalWords} 段
        </span>
        <button
          onClick={() => setShowZh((v) => !v)}
          className={`flex cursor-pointer items-center gap-1.5 rounded-full border px-3.5 py-1.5 font-medium transition-all duration-200 ${
            showZh
              ? 'border-primary/30 bg-primary/10 text-primary'
              : 'border-slate-200 bg-white text-muted hover:text-ink'
          }`}
        >
          {showZh ? <Eye size={13} /> : <EyeOff size={13} />}
          中文对照
        </button>
        <button
          onClick={readAloud}
          className="flex cursor-pointer items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 py-1.5 font-medium text-muted transition-all duration-200 hover:text-ink"
        >
          <Volume2 size={13} />
          <span className="hidden sm:inline">朗读本段</span>
        </button>
        <button
          onClick={() => {
            const resuming = snapshot.paused;
            togglePause();
            if (resuming) focus();
          }}
          disabled={!snapshot.started || snapshot.finished}
          title={snapshot.paused ? '继续' : '暂停'}
          className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 font-medium transition-all duration-200 sm:px-3.5 ${
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
          title="随时结束并结算成绩"
          className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 font-medium transition-all duration-200 sm:px-3.5 ${
            snapshot.started
              ? 'cursor-pointer border-slate-200 bg-white text-muted hover:-translate-y-0.5 hover:text-ink hover:shadow'
              : 'cursor-not-allowed border-slate-100 text-faint'
          }`}
        >
          <Square size={12} />
          <span className="hidden sm:inline">结束并结算</span>
        </button>
      </div>

      {/* 中文对照 */}
      {(showZh || peekZh) && (
        <div className="rounded-2xl border border-primary/15 bg-primary/[0.04] px-5 py-4">
          <p className="mb-1 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.2em] text-primary/70">
            <Quote size={12} />
            本段中文
          </p>
          <p className="text-sm leading-relaxed text-ink sm:text-base">{currentZh}</p>
        </div>
      )}

      <div ref={textRef} className="relative scroll-mt-16">
        {isTouch && <TypingPad inputRef={inputRef} />}
        <ArticleText
          text={snapshot.paragraphText}
          states={snapshot.states}
          cursor={snapshot.cursor}
          wrongNow={false}
          onClick={() => undefined}
        />
      </div>

      <div className={`flex flex-col items-center ${keyboardOpen ? 'gap-2' : 'gap-4'}`}>
        <ChapterProgress progress={snapshot.stats.progress} />
        <SpeedBar stats={snapshot.stats} compact={keyboardOpen} />
      </div>

      {!keyboardOpen && (
        <p className="px-4 text-center text-xs text-faint">
          {snapshot.started
            ? isTouch
              ? '输错会停在原处，改正即可继续 · 空格与标点都要输入'
              : '输错会停在原处，改正即可继续 · Esc 暂停/继续 · Backspace 退格 · Tab 临时看中文 · Ctrl + J 朗读本段'
            : isTouch
              ? '点击这里开始跟打（大小写不敏感）'
              : '按任意键开始跟打（大小写不敏感）'}
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
