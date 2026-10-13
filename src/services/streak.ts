import { PracticeRecord } from '../storage/types';

const DAY_MS = 24 * 60 * 60 * 1000;

/** 本地日期键：YYYY-MM-DD */
export function dayKey(ts: number): string {
  const d = new Date(ts);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

/** 统计每天的练习次数 */
export function buildDayCounts(records: PracticeRecord[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const r of records) {
    const key = dayKey(r.createdAt);
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

export interface StreakInfo {
  /** 当前连续天数 */
  current: number;
  /** 历史最长连续天数 */
  longest: number;
  /** 累计打卡天数 */
  totalDays: number;
}

function isNextDay(prev: string, next: string): boolean {
  const a = new Date(`${prev}T00:00:00`).getTime();
  const b = new Date(`${next}T00:00:00`).getTime();
  return b - a === DAY_MS;
}

/**
 * 计算连续练习天数：
 * 今天已练习则从今天往前数；今天还没练则从昨天往前数（当天结束前不算断签）。
 */
export function computeStreak(counts: Record<string, number>): StreakInfo {
  const days = Object.keys(counts).sort();
  if (days.length === 0) return { current: 0, longest: 0, totalDays: 0 };

  let longest = 1;
  let run = 1;
  for (let i = 1; i < days.length; i++) {
    run = isNextDay(days[i - 1], days[i]) ? run + 1 : 1;
    if (run > longest) longest = run;
  }

  const now = Date.now();
  let cursor = dayKey(now);
  if (!counts[cursor]) {
    cursor = dayKey(now - DAY_MS);
    if (!counts[cursor]) return { current: 0, longest, totalDays: days.length };
  }

  let current = 0;
  while (counts[cursor]) {
    current++;
    const d = new Date(`${cursor}T00:00:00`);
    cursor = dayKey(d.getTime() - DAY_MS);
  }

  return { current, longest, totalDays: days.length };
}

export interface HeatDay {
  key: string;
  /** 练习次数；-1 表示未来日期（不渲染） */
  count: number;
}

/** 生成热力图矩阵：weeks 列（每列周一→周日），最后一列为本周 */
export function buildHeatmapWeeks(
  counts: Record<string, number>,
  weeks = 16,
): HeatDay[][] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayKey = dayKey(today.getTime());
  const mondayOffset = (today.getDay() + 6) % 7; // 周一为 0
  const thisMonday = today.getTime() - mondayOffset * DAY_MS;

  const matrix: HeatDay[][] = [];
  for (let w = weeks - 1; w >= 0; w--) {
    const monday = thisMonday - w * 7 * DAY_MS;
    const column: HeatDay[] = [];
    for (let d = 0; d < 7; d++) {
      const key = dayKey(monday + d * DAY_MS);
      column.push({ key, count: key <= todayKey ? (counts[key] ?? 0) : -1 });
    }
    matrix.push(column);
  }
  return matrix;
}
