import { FollowStats } from './followEngine';

export type ArticleCharState = 'pending' | 'correct' | 'wrong';

export type ArticleInputResult =
  | 'correct'
  | 'wrong'
  | 'paragraph-complete'
  | 'article-complete'
  | 'ignored';

export interface ArticleSnapshot {
  /** 当前段落下标 */
  paragraphIndex: number;
  /** 当前段落英文原文 */
  paragraphText: string;
  /** 段内已输入的字符位置 */
  cursor: number;
  states: ArticleCharState[];
  started: boolean;
  finished: boolean;
  /** 是否暂停中（暂停不计时、不接受输入） */
  paused: boolean;
  /** 累计错误字符（错字热力） */
  errorChars: Record<string, number>;
  stats: FollowStats;
}

/**
 * 文章跟打引擎：
 * - 以段落为单位推进，段内逐字符校验
 * - 输入错误时停在原地（必须输对才能继续），错误计入统计
 * - 支持退格回退已输入的字符
 * - 大小写不敏感（便于专注拼写与节奏）
 */
export class ArticleEngine {
  private readonly paragraphs: string[];
  private index = 0;
  private cursor = 0;
  private states: ArticleCharState[] = [];
  private startTime: number | null = null;
  private endTime: number | null = null;
  private correctChars = 0;
  private correctKeystrokes = 0;
  private totalKeystrokes = 0;
  private completedParagraphs = 0;
  private hasWrongNow = false;
  private pausedMs = 0;
  private pauseStart: number | null = null;
  private readonly errorChars: Record<string, number> = {};

  constructor(paragraphs: string[]) {
    this.paragraphs = paragraphs;
    this.resetParagraph();
  }

  private currentText(): string {
    return this.paragraphs[this.index] ?? '';
  }

  private resetParagraph() {
    this.cursor = 0;
    this.hasWrongNow = false;
    this.states = new Array<ArticleCharState>(this.currentText().length).fill('pending');
  }

  start() {
    if (this.startTime === null && !this.isFinished()) this.startTime = Date.now();
  }

  hasStarted(): boolean {
    return this.startTime !== null;
  }

  isFinished(): boolean {
    return this.endTime !== null;
  }

  /** 当前字符是否处于"刚输错"状态（用于抖动动效） */
  isWrongNow(): boolean {
    return this.hasWrongNow;
  }

  isPaused(): boolean {
    return this.pauseStart !== null;
  }

  /** 暂停：停止计时并忽略输入 */
  pause() {
    if (this.startTime === null || this.isFinished() || this.pauseStart !== null) return;
    this.pauseStart = Date.now();
  }

  resume() {
    if (this.pauseStart === null) return;
    this.pausedMs += Date.now() - this.pauseStart;
    this.pauseStart = null;
  }

  input(char: string): ArticleInputResult {
    if (this.isFinished() || this.isPaused()) return 'ignored';
    const text = this.currentText();
    if (text.length === 0) return 'ignored';

    this.start();
    this.totalKeystrokes++;
    const expected = text[this.cursor];

    if (char === expected || char.toLowerCase() === expected.toLowerCase()) {
      this.states[this.cursor] = 'correct';
      this.correctKeystrokes++;
      this.correctChars++;
      this.cursor++;
      this.hasWrongNow = false;

      if (this.cursor >= text.length) {
        this.completedParagraphs++;
        if (this.index >= this.paragraphs.length - 1) {
          this.endTime = Date.now();
          return 'article-complete';
        }
        this.index++;
        this.resetParagraph();
        return 'paragraph-complete';
      }
      return 'correct';
    }

    // 输错：标记红色并停在原地
    this.states[this.cursor] = 'wrong';
    this.hasWrongNow = true;
    this.errorChars[expected] = (this.errorChars[expected] ?? 0) + 1;
    return 'wrong';
  }

  backspace() {
    if (this.isFinished() || this.cursor <= 0) return;
    // 同时清除"待输入字符"上的错误标记，避免退格后红字残留
    this.states[this.cursor] = 'pending';
    this.cursor--;
    this.states[this.cursor] = 'pending';
    this.hasWrongNow = false;
  }

  getErrorChars(): Record<string, number> {
    return { ...this.errorChars };
  }

  /** 有效用时（秒），已扣除暂停时长 */
  private elapsedSec(now: number): number {
    if (this.startTime === null) return 0;
    const end = this.endTime ?? now;
    const currentPause = this.pauseStart !== null ? now - this.pauseStart : 0;
    return Math.max(0, (end - this.startTime - this.pausedMs - currentPause) / 1000);
  }

  getSnapshot(now: number = Date.now()): ArticleSnapshot {
    const elapsed = this.elapsedSec(now);
    const minutes = elapsed / 60;
    const totalChars = this.paragraphs.reduce((sum, p) => sum + p.length, 0);
    const doneChars =
      this.paragraphs.slice(0, this.index).reduce((sum, p) => sum + p.length, 0) + this.cursor;

    const stats: FollowStats = {
      elapsedSec: elapsed,
      wpm: minutes > 0.0001 ? Math.round(this.correctChars / 5 / minutes) : 0,
      accuracy:
        this.totalKeystrokes === 0
          ? 100
          : Math.round((this.correctKeystrokes / this.totalKeystrokes) * 1000) / 10,
      correctChars: this.correctChars,
      totalKeystrokes: this.totalKeystrokes,
      correctKeystrokes: this.correctKeystrokes,
      correctWords: this.completedParagraphs,
      totalWords: this.paragraphs.length,
      progress: totalChars === 0 ? 0 : Math.round((doneChars / totalChars) * 100),
    };

    return {
      paragraphIndex: this.index,
      paragraphText: this.currentText(),
      cursor: this.cursor,
      states: [...this.states],
      started: this.hasStarted(),
      finished: this.isFinished(),
      paused: this.isPaused(),
      errorChars: this.getErrorChars(),
      stats,
    };
  }
}
