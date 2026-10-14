import {
  BookMarked,
  Eye,
  Flame,
  Infinity as InfinityIcon,
  Keyboard,
  RefreshCw,
  Speech,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import PracticeSession from './practice/PracticeSession';
import ResultModal from '../components/ResultModal';
import ChapterReview from '../components/ChapterReview';
import LibrarySelect from '../components/LibrarySelect';
import { FollowSnapshot, FollowWord } from '../engine/followEngine';
import { buildMixedQueue, levelName, Question, WORD_LEVELS } from '../services/corpusService';
import { updateWrongBook } from '../services/speech';
import { buildDayCounts, computeStreak } from '../services/streak';
import { useStorage } from '../storage/StorageContext';
import { genId } from '../storage/localProvider';

/** 无限练习时每批补充的词数 */
const BATCH_SIZE = 20;
const MIN_SIZE = 1;
const MAX_SIZE = 100;

type SessionMode = 'follow' | 'dictation';

export default function PracticePage() {
  const storage = useStorage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  /** 错词专项：/practice?source=wrong 时只用错词本出题 */
  const wrongMode = searchParams.get('source') === 'wrong';
  const initialSettings = storage.getSettings();

  const [mode, setMode] = useState<SessionMode>(initialSettings.defaultMode ?? 'follow');
  const [level, setLevel] = useState(initialSettings.defaultLevel ?? 'cet4');
  const [round, setRound] = useState(0);
  const [startIndex, setStartIndex] = useState(0);
  const [sound, setSound] = useState(initialSettings.sound);
  const [autoSpeak, setAutoSpeak] = useState(initialSettings.autoSpeak);
  const [chapterSize, setChapterSize] = useState(initialSettings.chapterSize);
  const [infinite, setInfinite] = useState(initialSettings.infinite);
  const [sizeInput, setSizeInput] = useState(String(initialSettings.chapterSize));
  const [result, setResult] = useState<{ snapshot: FollowSnapshot } | null>(null);
  const [dismissed, setDismissed] = useState(false);
  /** 结算后是否正在回看"本章原文" */
  const [showOriginal, setShowOriginal] = useState(false);
  const [queue, setQueue] = useState<Question[]>([]);
  /** 队列版本号：保证换词库/改题量后练习会话必定以新词表重新挂载 */
  const [queueVersion, setQueueVersion] = useState(0);
  const [loading, setLoading] = useState(true);
  const [streakDays, setStreakDays] = useState(0);

  const toFollowWords = (items: Question[]): FollowWord[] =>
    items.map((q) => ({ word: q.target, label: q.label }));

  /** 错词专项题库：按复习到期时间与错误次数排序 */
  const wrongQueue = useCallback((): Question[] => {
    const items = storage
      .getWrongBook()
      .filter((w) => w.type === 'word')
      .sort((a, b) => a.nextReviewAt - b.nextReviewAt || b.wrongCount - a.wrongCount);
    const limited = infinite ? items : items.slice(0, chapterSize);
    return limited.map((w) => ({ target: w.target, label: w.label, review: true }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storage, infinite, chapterSize]);

  // 生成题目（错词专项只出错词；常规练习按到期错词优先混入）
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setQueue([]);
    setStartIndex(0);
    setShowOriginal(false);

    if (wrongMode) {
      setQueue(wrongQueue());
      setQueueVersion((v) => v + 1);
      setLoading(false);
      return () => {
        cancelled = true;
      };
    }

    const count = infinite ? BATCH_SIZE : chapterSize;
    buildMixedQueue('word', level, storage, count).then((q) => {
      if (cancelled) return;
      setQueue(q);
      setQueueVersion((v) => v + 1);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level, round, infinite, chapterSize, wrongMode]);

  const words = useMemo(() => toFollowWords(queue), [queue]);
  const reviewCount = useMemo(() => queue.filter((q) => q.review).length, [queue]);
  const wrongTotal = useMemo(
    () => (wrongMode ? storage.getWrongBook().length : 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [wrongMode, storage, queueVersion],
  );

  // 连续练习天数（完成一章后刷新）
  useEffect(() => {
    setStreakDays(computeStreak(buildDayCounts(storage.getHistory())).current);
  }, [storage, result]);

  const fetchMore = useCallback(async (): Promise<FollowWord[]> => {
    if (wrongMode) {
      const seen = new Set(words.map((w) => w.word));
      const rest = storage
        .getWrongBook()
        .filter((w) => w.type === 'word' && !seen.has(w.target))
        .sort((a, b) => a.nextReviewAt - b.nextReviewAt || b.wrongCount - a.wrongCount)
        .slice(0, BATCH_SIZE);
      return rest.map((w) => ({ word: w.target, label: w.label }));
    }
    const more = await buildMixedQueue('word', level, storage, BATCH_SIZE);
    return toFollowWords(more);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level, storage, wrongMode, words]);

  const handleComplete = useCallback(
    (snapshot: FollowSnapshot) => {
      const errorTargets = new Set(snapshot.wordsWithErrors.map((w) => w.word));
      snapshot.wordsWithErrors.forEach((w) =>
        updateWrongBook(storage, 'word', { target: w.word, label: w.label }, false),
      );
      words
        .filter((w) => !errorTargets.has(w.word))
        .forEach((w) => updateWrongBook(storage, 'word', { target: w.word, label: w.label }, true));

      const stats = snapshot.stats;
      storage.addRecord({
        id: genId(),
        mode: 'word',
        sourceName: wrongMode
          ? `错词专项 · ${mode === 'dictation' ? '默写' : '跟打'}`
          : `${levelName(level)} · ${mode === 'dictation' ? '默写' : '跟打'}${
              infinite ? ' · 无限' : ''
            }`,
        level,
        wpm: stats.wpm,
        accuracy: stats.accuracy,
        durationSec: Math.round(stats.elapsedSec),
        errorChars: snapshot.errorChars,
        createdAt: Date.now(),
      });
      setDismissed(false);
      setShowOriginal(false);
      setResult({ snapshot });
      // 保留刚打完的这一组：等用户点"再来一组"再换题，
      // 这样点"查看原文"看到的才是刚才练过的内容
      setStartIndex(0);
    },
    [storage, level, words, mode, infinite, wrongMode],
  );

  const restart = () => {
    setResult(null);
    setDismissed(false);
    setShowOriginal(false);
    setStartIndex(0);
    setRound((r) => r + 1);
  };

  const switchMode = (next: SessionMode) => {
    if (next === mode) return;
    setShowOriginal(false);
    setMode(next);
    storage.saveSettings({ ...storage.getSettings(), defaultMode: next });
  };

  const changeLevel = (id: string) => {
    setLevel(id);
    storage.saveSettings({ ...storage.getSettings(), defaultLevel: id });
  };

  const toggleSound = () => {
    const value = !sound;
    setSound(value);
    storage.saveSettings({ ...storage.getSettings(), sound: value });
  };

  const toggleSpeak = () => {
    const value = !autoSpeak;
    setAutoSpeak(value);
    storage.saveSettings({ ...storage.getSettings(), autoSpeak: value });
  };

  const toggleInfinite = () => {
    const value = !infinite;
    setInfinite(value);
    storage.saveSettings({ ...storage.getSettings(), infinite: value });
  };

  const applySize = (raw: string) => {
    setSizeInput(raw);
    const n = Number(raw);
    if (Number.isFinite(n) && n >= MIN_SIZE && n <= MAX_SIZE) {
      const value = Math.round(n);
      setChapterSize(value);
      storage.saveSettings({ ...storage.getSettings(), chapterSize: value });
    }
  };

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4 px-4 py-5 sm:gap-6 sm:px-5 sm:py-8">
      {/* 工具栏 */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
        <div className="flex rounded-full border border-slate-200 bg-white p-1 shadow-sm">
          {(
            [
              { id: 'follow', label: '跟打', icon: Keyboard },
              { id: 'dictation', label: '默写', icon: Eye },
            ] as const
          ).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => switchMode(id)}
              title={id === 'follow' ? '显示单词，边看边打' : '隐藏单词，凭记忆默写'}
              className={`flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-200 sm:px-4 sm:py-2 sm:text-sm ${
                mode === id
                  ? 'bg-primary text-white shadow-md shadow-primary/30'
                  : 'text-muted hover:text-ink'
              }`}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </div>

        {wrongMode ? (
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-2 rounded-full border border-warning/30 bg-warning/10 px-4 py-2.5 text-sm font-medium text-warning">
              <BookMarked size={15} />
              错词专项 · {wrongTotal} 个错词
            </span>
            <button
              onClick={() => navigate('/practice')}
              title="退出错词专项，回到常规练习"
              className="cursor-pointer rounded-full border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-medium text-muted shadow-sm transition-all hover:-translate-y-0.5 hover:text-ink hover:shadow"
            >
              退出专项
            </button>
          </div>
        ) : (
          <LibrarySelect levels={WORD_LEVELS} value={level} onChange={changeLevel} />
        )}

        {/* 每组词数与无限模式（小屏收纳到「设置」页） */}
        <div className="hidden items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 shadow-sm sm:flex">
          <span className="text-xs text-muted">每组</span>
          <input
            type="number"
            min={MIN_SIZE}
            max={MAX_SIZE}
            value={sizeInput}
            disabled={infinite}
            onChange={(e) => applySize(e.target.value)}
            onBlur={() => setSizeInput(String(chapterSize))}
            aria-label="每组词数"
            className={`w-14 rounded-lg border border-slate-200 px-2 py-1 text-center text-sm outline-none transition-all ${
              infinite
                ? 'cursor-not-allowed bg-slate-100 text-faint'
                : 'bg-slate-50 text-ink focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20'
            }`}
          />
          <span className="text-xs text-muted">词</span>
          <button
            onClick={toggleInfinite}
            title="无限练习：不设章节长度，随时结束结算"
            className={`flex cursor-pointer items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-all duration-200 ${
              infinite ? 'bg-primary text-white shadow-sm shadow-primary/30' : 'text-muted hover:text-ink'
            }`}
          >
            <InfinityIcon size={13} />
            无限
          </button>
        </div>

        <div className="ml-auto flex items-center gap-2">
          {/* 音效与朗读在「设置」页也能改，小屏收起 */}
          <div className="hidden items-center gap-2 sm:flex">
            <button
              onClick={toggleSound}
              title={sound ? '关闭音效' : '开启音效'}
              className={`cursor-pointer rounded-full border p-2.5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow ${
                sound
                  ? 'border-primary/30 bg-primary/10 text-primary'
                  : 'border-slate-200 bg-white text-muted hover:text-ink'
              }`}
            >
              {sound ? <Volume2 size={16} /> : <VolumeX size={16} />}
            </button>
            <button
              onClick={toggleSpeak}
              title={autoSpeak ? '关闭自动朗读' : '开启自动朗读'}
              className={`cursor-pointer rounded-full border p-2.5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow ${
                autoSpeak
                  ? 'border-primary/30 bg-primary/10 text-primary'
                  : 'border-slate-200 bg-white text-muted hover:text-ink'
              }`}
            >
              <Speech size={16} />
            </button>
          </div>
          <button
            onClick={restart}
            className="flex cursor-pointer items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-muted shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:text-ink hover:shadow sm:px-4 sm:py-2.5 sm:text-sm"
          >
            <RefreshCw size={14} />
            {infinite ? '换一批' : '下一组'}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2.5 text-xs">
        {streakDays > 0 && (
          <span className="flex items-center gap-1.5 rounded-full bg-warning/10 px-3.5 py-1.5 font-semibold text-warning">
            <Flame size={13} />
            连续练习 {streakDays} 天
          </span>
        )}
        {!loading && !wrongMode && reviewCount > 0 && (
          <span className="rounded-full bg-slate-100 px-3.5 py-1.5 font-medium text-muted">
            本组含 {reviewCount} 个错词复习
          </span>
        )}
      </div>

      {loading ? (
        <div className="flex flex-col items-center gap-3 py-32 text-muted">
          <span className="h-8 w-8 animate-spin rounded-full border-[3px] border-slate-200 border-t-primary" />
          <p className="text-sm">正在加载词库…</p>
        </div>
      ) : words.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-20 text-center">
          <p className="text-muted">
            {wrongMode
              ? '错词本是空的，先去常规练习积累一些错词吧。'
              : '该级别暂无题目，请先到「词库」页导入自定义语料。'}
          </p>
          {wrongMode && (
            <button
              onClick={() => navigate('/practice')}
              className="cursor-pointer rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary/30"
            >
              返回常规练习
            </button>
          )}
        </div>
      ) : (
        <>
          <div className={showOriginal ? 'hidden' : ''}>
            <PracticeSession
              key={`${mode}-${queueVersion}`}
              words={words}
              startIndex={startIndex}
              hidden={mode === 'dictation'}
              frozen={showOriginal}
              infinite={infinite}
              sound={sound}
              autoSpeak={autoSpeak}
              fetchMore={fetchMore}
              onAdvance={setStartIndex}
              onComplete={handleComplete}
            />
          </div>

          {/* 本章原文：结算后回看这一组练过的全部单词 */}
          {showOriginal && (
            <ChapterReview
              words={words}
              onRestart={restart}
              onClose={() => setShowOriginal(false)}
            />
          )}
        </>
      )}

      {result && !dismissed && (
        <ResultModal
          title={infinite ? '本轮结束' : mode === 'dictation' ? '默写完成' : '本章完成'}
          stats={result.snapshot.stats}
          errorChars={result.snapshot.errorChars}
          onRestart={restart}
          onClose={() => {
            setDismissed(true);
            setShowOriginal(true);
          }}
        />
      )}
    </div>
  );
}
