import { FollowStats } from '../engine/followEngine';
import { formatDuration } from '../engine/stats';

/**
 * 底部统计条：桌面五格（时间/输入数/WPM/正确数/正确率）。
 * compact 模式（手机键盘弹出、竖向空间紧张时）压缩为三格单行。
 */
export default function SpeedBar({
  stats,
  compact = false,
}: {
  stats: FollowStats;
  compact?: boolean;
}) {
  const items = compact
    ? [
        { label: '时间', value: formatDuration(stats.elapsedSec) },
        { label: 'WPM', value: String(stats.wpm) },
        { label: '正确率', value: `${stats.accuracy}%` },
      ]
    : [
        { label: '时间', value: formatDuration(stats.elapsedSec) },
        { label: '输入数', value: String(stats.totalKeystrokes) },
        { label: 'WPM', value: String(stats.wpm) },
        { label: '正确数', value: String(stats.correctKeystrokes) },
        { label: '正确率', value: `${stats.accuracy}%` },
      ];

  return (
    <div
      className={`flex w-full max-w-2xl items-center rounded-2xl bg-white/80 shadow-sm ring-1 ring-slate-200/70 backdrop-blur ${
        compact ? 'gap-1 px-3 py-1.5' : 'px-4 py-3 sm:gap-2 sm:px-8 sm:py-4'
      }`}
    >
      {items.map(({ label, value }) => (
        <div key={label} className="flex flex-1 flex-col items-center gap-0.5">
          <span
            className={`font-semibold tabular-nums text-ink ${
              compact ? 'text-base' : 'text-lg sm:text-xl'
            }`}
          >
            {value}
          </span>
          <span className="text-[11px] text-muted sm:text-xs">{label}</span>
        </div>
      ))}
    </div>
  );
}
