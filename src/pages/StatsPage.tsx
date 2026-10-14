import { useMemo, useState } from 'react';
import { BarChart3, CalendarCheck, Flame, Trash2, Trophy } from 'lucide-react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import ActivityHeatmap from '../components/ActivityHeatmap';
import { buildDayCounts, buildHeatmapWeeks, computeStreak } from '../services/streak';
import { useStorage } from '../storage/StorageContext';
import { formatDuration } from '../engine/stats';

export default function StatsPage() {
  const storage = useStorage();
  const [refreshKey, setRefreshKey] = useState(0);

  const history = useMemo(
    () => storage.getHistory(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [storage, refreshKey],
  );

  const dayCounts = useMemo(() => buildDayCounts(history), [history]);
  const streak = useMemo(() => computeStreak(dayCounts), [dayCounts]);
  const heatmapWeeks = useMemo(() => buildHeatmapWeeks(dayCounts, 16), [dayCounts]);

  const chartData = useMemo(
    () =>
      [...history]
        .slice(0, 20)
        .reverse()
        .map((r, i) => ({ name: `#${i + 1}`, wpm: r.wpm, accuracy: r.accuracy })),
    [history],
  );

  const summary = useMemo(() => {
    if (history.length === 0) return null;
    const avgWpm = Math.round(history.reduce((s, r) => s + r.wpm, 0) / history.length);
    const avgAcc =
      Math.round((history.reduce((s, r) => s + r.accuracy, 0) / history.length) * 10) / 10;
    const best = Math.max(...history.map((r) => r.wpm));
    return { avgWpm, avgAcc, best, total: history.length };
  }, [history]);

  const clearHistory = () => {
    if (
      !window.confirm(
        `确定清空全部 ${history.length} 条练习记录吗？打卡热力图与 WPM 趋势也会一并清零。`,
      )
    ) {
      return;
    }
    storage.clearHistory();
    setRefreshKey((k) => k + 1);
  };

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-6 sm:py-10">
      <section className="flex items-end justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-2xl font-semibold text-ink">
            学习统计
            {streak.current > 0 && (
              <span className="flex items-center gap-1.5 rounded-full bg-warning/10 px-3.5 py-1.5 text-sm font-semibold text-warning">
                <Flame size={15} />
                连续练习 {streak.current} 天
              </span>
            )}
          </h1>
          <p className="mt-1 text-sm text-muted">每一次练习都会自动记录在这里。</p>
        </div>
        {history.length > 0 && (
          <button
            onClick={clearHistory}
            className="flex cursor-pointer items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-muted shadow-sm transition-all hover:text-danger"
          >
            <Trash2 size={13} />
            清空记录
          </button>
        )}
      </section>

      {history.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-slate-300 bg-white/60 py-20 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <BarChart3 size={26} />
          </span>
          <p className="font-medium text-ink">还没有练习记录</p>
          <p className="text-sm text-muted">去完成一章练习，成绩和打卡会自动出现在这里。</p>
        </div>
      ) : (
        <>
          {summary && (
            <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: '练习次数', value: String(summary.total) },
                { label: '平均 WPM', value: String(summary.avgWpm) },
                { label: '最佳 WPM', value: String(summary.best) },
                { label: '平均正确率', value: `${summary.avgAcc}%` },
              ].map(({ label, value }) => (
                <div
                  key={label}
                  className="rounded-2xl border border-slate-200/80 bg-white px-5 py-4 shadow-sm"
                >
                  <p className="text-2xl font-bold tabular-nums text-ink">{value}</p>
                  <p className="mt-0.5 text-xs text-muted">{label}</p>
                </div>
              ))}
            </section>
          )}

          <section className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
                <CalendarCheck size={16} className="text-primary" />
                每日打卡（近 16 周）
              </h2>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="flex items-center gap-1.5 rounded-full bg-warning/10 px-3 py-1.5 font-medium text-warning">
                  <Flame size={13} />
                  连续 {streak.current} 天
                </span>
                <span className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 font-medium text-primary">
                  <Trophy size={13} />
                  最长 {streak.longest} 天
                </span>
                <span className="rounded-full bg-slate-100 px-3 py-1.5 font-medium text-muted">
                  累计打卡 {streak.totalDays} 天
                </span>
              </div>
            </div>
            <ActivityHeatmap weeks={heatmapWeeks} />
          </section>

          <section className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="mb-4 text-sm font-semibold text-ink">近 20 次 WPM 趋势</h2>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: -18 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94A3B8' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 12,
                      border: '1px solid #E2E8F0',
                      fontSize: 12,
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="wpm"
                    stroke="#2563EB"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: '#2563EB' }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-xs uppercase tracking-wider text-muted">
                    <th className="px-5 py-3.5 font-medium">时间</th>
                    <th className="px-5 py-3.5 font-medium">来源</th>
                    <th className="px-5 py-3.5 font-medium">WPM</th>
                    <th className="px-5 py-3.5 font-medium">正确率</th>
                    <th className="px-5 py-3.5 font-medium">用时</th>
                  </tr>
                </thead>
                <tbody>
                  {history.slice(0, 30).map((r) => (
                    <tr
                      key={r.id}
                      className="border-b border-slate-50 transition-colors last:border-0 hover:bg-slate-50/60"
                    >
                      <td className="px-5 py-3 tabular-nums text-muted">
                        {new Date(r.createdAt).toLocaleString('zh-CN', {
                          month: 'numeric',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="px-5 py-3">
                        <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary">
                          {r.sourceName}
                        </span>
                      </td>
                      <td className="px-5 py-3 font-semibold tabular-nums text-ink">{r.wpm}</td>
                      <td className="px-5 py-3 tabular-nums text-muted">{r.accuracy}%</td>
                      <td className="px-5 py-3 tabular-nums text-muted">
                        {formatDuration(r.durationSec)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
