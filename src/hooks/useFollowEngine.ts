import { useCallback, useEffect, useRef, useState } from 'react';
import { FollowEngine, FollowSnapshot, FollowWord } from '../engine/followEngine';

export interface FollowHandlers {
  /** 正确按键 */
  onKey?: () => void;
  /** 输入错误 */
  onError?: () => void;
  /** 完成一个单词 / 跳过单词 */
  onWordComplete?: () => void;
  /** 完成整章 */
  onChapterComplete?: (snapshot: FollowSnapshot) => void;
}

const RESET_DELAY_MS = 320;

/**
 * 将 FollowEngine 桥接到 React：维护快照、错误重置、计时刷新。
 * 初始单词与起始下标只在挂载时读取一次（切换模式/换章由父组件 key 触发重挂载）；
 * 无限练习通过 appendWords 追加后续单词，不会重置进度。
 */
export function useFollowEngine(
  initialWords: FollowWord[],
  handlers: FollowHandlers,
  startIndex = 0,
) {
  const initialWordsRef = useRef(initialWords);
  const initialIndexRef = useRef(startIndex);
  const engineRef = useRef<FollowEngine>(
    new FollowEngine(initialWordsRef.current, initialIndexRef.current),
  );
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;
  const resetTimer = useRef<number | null>(null);
  const finishedRef = useRef(false);

  const [snapshot, setSnapshot] = useState<FollowSnapshot>(() => engineRef.current.getSnapshot());

  const sync = useCallback(() => setSnapshot(engineRef.current.getSnapshot()), []);

  // 打字进行中刷新计时/WPM（暂停时不刷新，用时也不增长）
  useEffect(() => {
    if (!snapshot.started || snapshot.finished || snapshot.paused) return;
    const timer = window.setInterval(sync, 250);
    return () => window.clearInterval(timer);
  }, [snapshot.started, snapshot.finished, snapshot.paused, sync]);

  // 卸载时清理未触发的"整词重置"定时器，避免访问已卸载的引擎
  useEffect(() => {
    return () => {
      if (resetTimer.current) window.clearTimeout(resetTimer.current);
    };
  }, []);

  const inputChar = useCallback(
    (char: string) => {
      const engine = engineRef.current;
      const result = engine.input(char);
      switch (result) {
        case 'letter-correct':
          handlersRef.current.onKey?.();
          break;
        case 'letter-wrong':
          handlersRef.current.onError?.();
          // 错误提示后清空当前词，要求整词重打
          if (resetTimer.current) window.clearTimeout(resetTimer.current);
          resetTimer.current = window.setTimeout(() => {
            engine.clearWrongInput();
            sync();
          }, RESET_DELAY_MS);
          break;
        case 'word-complete':
        case 'word-skipped':
          handlersRef.current.onWordComplete?.();
          break;
        case 'chapter-complete':
          handlersRef.current.onWordComplete?.();
          if (!finishedRef.current) {
            finishedRef.current = true;
            handlersRef.current.onChapterComplete?.(engine.getSnapshot());
          }
          break;
        default:
          break;
      }
      sync();
    },
    [sync],
  );

  const skipWord = useCallback(
    (direction: 'prev' | 'next') => {
      engineRef.current.skipWord(direction);
      sync();
    },
    [sync],
  );

  /** 主动开始计时（续练场景） */
  const start = useCallback(() => {
    engineRef.current.start();
    sync();
  }, [sync]);

  /** 追加后续单词（无限练习） */
  const appendWords = useCallback(
    (more: FollowWord[]) => {
      engineRef.current.appendWords(more);
      sync();
    },
    [sync],
  );

  /** 暂停 / 继续 */
  const togglePause = useCallback(() => {
    const engine = engineRef.current;
    if (engine.isPaused()) engine.resume();
    else engine.pause();
    sync();
  }, [sync]);

  return { snapshot, inputChar, skipWord, start, appendWords, togglePause };
}
