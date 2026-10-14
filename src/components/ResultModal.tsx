import { RotateCcw, Trophy, X } from 'lucide-react';
import { FollowStats } from '../engine/followEngine';
import { displayChar, formatDuration, topErrors } from '../engine/stats';

interface ResultModalProps {
  stats: FollowStats;
  errorChars: Record<string, number>;
  /** 标题文案，默认"练习完成" */
  title?: string;
  /** 附加操作按钮（如"默写本章"） */
  extraAction?: { label: string; onClick: () => void };
  onRestart: () => void;
  onClose: () => void;
}

export default function ResultModal({
  stats,
  errorChars,
  title = '练习完成',
  extraAction,
  onRestart,
  onClose,
}: ResultModalProps) {
  const errors = topErrors(errorChars, 6);
  const grade =
    stats.accuracy >= 98 && stats.wpm >= 40
      ? '出色'
      : stats.accuracy >= 95
        ? '优秀'
        : stats.accuracy >= 90
          ? '良好'
          : '继续加油';

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 backdrop-blur-sm sm:items-center">
      <div className="animate-in slide-in-from-bottom-8 fade-in w-full max-w-md rounded-t-3xl bg-white p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-2xl duration-300 sm:rounded-3xl sm:p-7">
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-warning/10 text-warning">
              <Trophy size={20} />
            </span>
            <div>
              <h2 className="text-lg font-semibold text-ink">
                {title} · {grade}
              </h2>
              <p className="text-xs text-muted">本次成绩已自动记录</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="cursor-pointer rounded-full p-2 text-faint transition-colors hover:bg-slate-100 hover:text-ink"
            aria-label="关闭"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mb-5 grid grid-cols-3 gap-3">
          {[
            { label: 'WPM', value: String(stats.wpm) },
            { label: '正确率', value: `${stats.accuracy}%` },
            { label: '用时', value: formatDuration(stats.elapsedSec) },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-2xl bg-slate-50 px-3 py-4 text-center">
              <p className="text-2xl font-bold tabular-nums text-ink">{value}</p>
              <p className="mt-0.5 text-xs text-muted">{label}</p>
            </div>
          ))}
        </div>

        {errors.length > 0 && (
          <div className="mb-6">
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted">
              易错字符
            </p>
            <div className="flex flex-wrap gap-2">
              {errors.map(({ char, count }) => (
                <span
                  key={char}
                  className="rounded-lg bg-danger/10 px-2.5 py-1 font-mono text-sm text-danger"
                >
                  {displayChar(char)} ×{count}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          <button
            onClick={onRestart}
            className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-white shadow-lg shadow-primary/30 transition-all duration-200 hover:-translate-y-0.5 hover:bg-primary-dark active:translate-y-0"
          >
            <RotateCcw size={16} />
            再来一组
          </button>
          {extraAction && (
            <button
              onClick={extraAction.onClick}
              className="flex-1 cursor-pointer rounded-xl border border-primary/30 bg-primary/5 px-5 py-3 text-sm font-semibold text-primary transition-all duration-200 hover:-translate-y-0.5 hover:bg-primary/10"
            >
              {extraAction.label}
            </button>
          )}
          <button
            onClick={onClose}
            className="cursor-pointer rounded-xl border border-slate-200 px-5 py-3 text-sm font-medium text-muted transition-colors hover:bg-slate-50 hover:text-ink"
          >
            查看原文
          </button>
        </div>
      </div>
    </div>
  );
}
