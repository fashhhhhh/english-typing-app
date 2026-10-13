import { useCallback, useEffect, useRef, useState } from 'react';
import { ArticleEngine, ArticleSnapshot } from '../engine/articleEngine';

export interface ArticleHandlers {
  onKey?: () => void;
  onError?: () => void;
  onParagraphComplete?: () => void;
  onArticleComplete?: (snapshot: ArticleSnapshot) => void;
}

/** 将 ArticleEngine 桥接到 React：维护快照并节流刷新统计 */
export function useArticleEngine(paragraphs: string[], handlers: ArticleHandlers) {
  const paragraphsRef = useRef(paragraphs);
  const engineRef = useRef<ArticleEngine>(new ArticleEngine(paragraphsRef.current));
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;
  const finishedRef = useRef(false);

  const [snapshot, setSnapshot] = useState<ArticleSnapshot>(() => engineRef.current.getSnapshot());

  const sync = useCallback(() => setSnapshot(engineRef.current.getSnapshot()), []);

  useEffect(() => {
    if (!snapshot.started || snapshot.finished || snapshot.paused) return;
    const timer = window.setInterval(sync, 250);
    return () => window.clearInterval(timer);
  }, [snapshot.started, snapshot.finished, snapshot.paused, sync]);

  const inputChar = useCallback(
    (char: string) => {
      const engine = engineRef.current;
      const result = engine.input(char);
      if (result === 'correct' || result === 'paragraph-complete') {
        handlersRef.current.onKey?.();
      }
      if (result === 'wrong') handlersRef.current.onError?.();
      if (result === 'paragraph-complete') handlersRef.current.onParagraphComplete?.();
      if (result === 'article-complete' && !finishedRef.current) {
        finishedRef.current = true;
        handlersRef.current.onArticleComplete?.(engine.getSnapshot());
      }
      sync();
    },
    [sync],
  );

  const backspace = useCallback(() => {
    engineRef.current.backspace();
    sync();
  }, [sync]);

  /** 暂停 / 继续 */
  const togglePause = useCallback(() => {
    const engine = engineRef.current;
    if (engine.isPaused()) engine.resume();
    else engine.pause();
    sync();
  }, [sync]);

  return { snapshot, inputChar, backspace, togglePause };
}
