/** 将秒数格式化为 m:ss */
export function formatDuration(elapsedSec: number): string {
  const total = Math.floor(elapsedSec);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export interface ErrorEntry {
  char: string;
  count: number;
}

/** 取错误次数最多的前 n 个字符（用于结果页错字热力） */
export function topErrors(errorChars: Record<string, number>, n = 6): ErrorEntry[] {
  return Object.entries(errorChars)
    .map(([char, count]) => ({ char, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, n);
}

/** 错误字符的可读展示（空格显示为 ␣） */
export function displayChar(char: string): string {
  if (char === ' ') return '␣';
  if (char === '\n') return '↵';
  return char;
}
