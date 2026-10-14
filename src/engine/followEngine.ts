export type LetterState = 'normal' | 'correct' | 'wrong';

export type InputResult =
  | 'letter-correct'
  | 'letter-wrong'
  | 'word-complete'
  | 'word-skipped'
  | 'chapter-complete'
  | 'ignored';

export interface FollowWord {
  word: string;
  label: string;
}

export interface WordError {
  word: string;
  label: string;
  errors: number;
}

export interface FollowStats {
  elapsedSec: number;
  wpm: number;
  accuracy: number;
  correctChars: number;
  totalKeystrokes: number;
  correctKeystrokes: number;
  correctWords: number;
  totalWords: number;
  progress: number;
}

export interface FollowSnapshot {
  /** 当前单词下标 */
  wordIndex: number;
  /** 本次练习到达过的最大单词下标（结算时划定"已练范围"） */
  reachedIndex: number;
  /** 当前单词文本 */
  word: string;
  /** 当前单词中文提示 */
  label: string;
  /** 单词内已正确输入的字母数（也用于错误字母的渲染位置） */
  cursor: number;
  letterStates: LetterState[];
  /** 当前词处于"输入错误待重打"状态 */
  hasWrong: boolean;
  /** 当前词本轮累计错误次数 */
  wrongCountInWord: number;
  started: boolean;
  finished: boolean;
  /** 是否处于暂停中（暂停期间不计时、不接受输入） */
  paused: boolean;
  stats: FollowStats;
  /** 本章出现过错误的单词（用于写入错词本） */
  wordsWithErrors: WordError[];
  errorChars: Record<string, number>;
}

const MAX_ERRORS_PER_WORD = 4;

/**
 * 跟打模式引擎（对标 Qwerty Learner）：
 * - 逐字母校验，输错即整词重打（由 UI 在 320ms 后调用 clearWrongInput）
 * - 单词打满自动切下一个，一章打完结束
 * - 同一单词累计错 4 次自动跳过，避免卡死
 */
export class FollowEngine {
  private words: FollowWord[];
  private index = 0;
  private maxIndex = 0;
  private cursor = 0;
  private letterStates: LetterState[] = [];
  private hasWrong = false;
  private wrongCountInWord = 0;
  private correctChars = 0;
  private correctKeystrokes = 0;
  private totalKeystrokes = 0;
  private correctWords = 0;
  private startTime: number | null = null;
  private endTime: number | null = null;
  private pausedMs = 0;
  private pauseStart: number | null = null;
  private readonly errorChars: Record<string, number> = {};
  private readonly wordErrors: number[];

  constructor(words: FollowWord[], startIndex = 0) {
    this.words = [...words];
    this.wordErrors = words.map(() => 0);
    this.index = Math.min(Math.max(0, startIndex), Math.max(0, words.length - 1));
    this.maxIndex = this.index;
    this.resetWordStates();
  }

  /** 追补后续单词（无限练习模式使用） */
  appendWords(more: FollowWord[]) {
    for (const w of more) {
      this.words.push(w);
      this.wordErrors.push(0);
    }
  }

  private currentWord(): FollowWord {
    return this.words[this.index] ?? { word: '', label: '' };
  }

  private resetWordStates() {
    const word = this.currentWord().word;
    this.cursor = 0;
    this.hasWrong = false;
    this.wrongCountInWord = 0;
    this.letterStates = new Array<LetterState>(word.length).fill('normal');
  }

  hasStarted(): boolean {
    return this.startTime !== null;
  }

  /** 直接开始计时（用于中途续练，无需按键触发） */
  start() {
    if (this.startTime === null && !this.isFinished()) this.startTime = Date.now();
  }

  isPaused(): boolean {
    return this.pauseStart !== null;
  }

  /** 暂停：停止计时并忽略输入 */
  pause() {
    if (this.startTime === null || this.isFinished() || this.pauseStart !== null) return;
    this.pauseStart = Date.now();
  }

  /** 继续：把暂停时长从总用时中扣除 */
  resume() {
    if (this.pauseStart === null) return;
    this.pausedMs += Date.now() - this.pauseStart;
    this.pauseStart = null;
  }

  /** 有效用时（毫秒），已扣除暂停时长 */
  private elapsedMs(now: number): number {
    if (this.startTime === null) return 0;
    const end = this.endTime ?? now;
    const currentPause = this.pauseStart !== null ? now - this.pauseStart : 0;
    return Math.max(0, end - this.startTime - this.pausedMs - currentPause);
  }

  isFinished(): boolean {
    return this.endTime !== null;
  }

  /** 输入单个字符 */
  input(char: string): InputResult {
    if (this.isFinished()) return 'ignored';
    if (this.hasWrong) return 'ignored';
    if (this.isPaused()) return 'ignored';
    const word = this.currentWord().word;
    if (word.length === 0) return 'ignored';

    if (this.startTime === null) this.startTime = Date.now();
    this.totalKeystrokes++;

    const expected = word[this.cursor];
    if (expected !== undefined && char.toLowerCase() === expected.toLowerCase()) {
      this.correctKeystrokes++;
      this.correctChars++;
      this.letterStates[this.cursor] = 'correct';
      this.cursor++;
      if (this.cursor >= word.length) {
        this.correctWords++;
        this.advanceWord();
        return this.isFinished() ? 'chapter-complete' : 'word-complete';
      }
      return 'letter-correct';
    }

    // 输入错误：标记错误位置，记录错字
    this.hasWrong = true;
    this.wrongCountInWord++;
    this.wordErrors[this.index] += 1;
    this.errorChars[expected] = (this.errorChars[expected] ?? 0) + 1;
    this.letterStates[this.cursor] = 'wrong';
    if (this.wrongCountInWord >= MAX_ERRORS_PER_WORD) {
      this.advanceWord();
      return this.isFinished() ? 'chapter-complete' : 'word-skipped';
    }
    return 'letter-wrong';
  }

  /** 错误提示动画结束后调用：清空当前词输入，要求整词重打 */
  clearWrongInput() {
    if (this.isFinished()) return;
    const word = this.currentWord().word;
    this.cursor = 0;
    this.hasWrong = false;
    this.letterStates = new Array<LetterState>(word.length).fill('normal');
  }

  private advanceWord() {
    if (this.index >= this.words.length - 1) {
      this.endTime = Date.now();
      const word = this.currentWord().word;
      this.letterStates = new Array<LetterState>(word.length).fill('correct');
      return;
    }
    this.index++;
    if (this.index > this.maxIndex) this.maxIndex = this.index;
    this.resetWordStates();
  }

  /** 手动跳过单词（Ctrl+Shift+方向键） */
  skipWord(direction: 'prev' | 'next') {
    if (this.isFinished()) return;
    if (direction === 'prev') {
      if (this.index > 0) this.index--;
    } else if (this.index < this.words.length - 1) {
      this.index++;
    }
    if (this.index > this.maxIndex) this.maxIndex = this.index;
    this.resetWordStates();
  }

  getErrorChars(): Record<string, number> {
    return { ...this.errorChars };
  }

  getWordsWithErrors(): WordError[] {
    return this.words
      .map((w, i) => ({ word: w.word, label: w.label, errors: this.wordErrors[i] }))
      .filter((w) => w.errors > 0);
  }

  getStats(now: number = Date.now()): FollowStats {
    const elapsedSec = this.elapsedMs(now) / 1000;
    const minutes = elapsedSec / 60;
    return {
      elapsedSec,
      wpm: minutes > 0.0001 ? Math.round(this.correctChars / 5 / minutes) : 0,
      accuracy:
        this.totalKeystrokes === 0
          ? 100
          : Math.round((this.correctKeystrokes / this.totalKeystrokes) * 1000) / 10,
      correctChars: this.correctChars,
      totalKeystrokes: this.totalKeystrokes,
      correctKeystrokes: this.correctKeystrokes,
      correctWords: this.correctWords,
      totalWords: this.words.length,
      progress:
        this.words.length === 0
          ? 0
          : this.isFinished()
            ? 100
            : Math.round((this.index / this.words.length) * 100),
    };
  }

  getSnapshot(now: number = Date.now()): FollowSnapshot {
    const current = this.currentWord();
    return {
      wordIndex: this.index,
      reachedIndex: this.maxIndex,
      word: current.word,
      label: current.label,
      cursor: this.cursor,
      letterStates: [...this.letterStates],
      hasWrong: this.hasWrong,
      wrongCountInWord: this.wrongCountInWord,
      started: this.hasStarted(),
      finished: this.isFinished(),
      paused: this.isPaused(),
      stats: this.getStats(now),
      wordsWithErrors: this.getWordsWithErrors(),
      errorChars: this.getErrorChars(),
    };
  }
}
