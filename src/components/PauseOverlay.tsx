import { Pause, Play } from 'lucide-react';

/** 练习暂停浮层：遮罩 + 毛玻璃卡片 + 继续按钮 */
export default function PauseOverlay({ onResume }: { onResume: () => void }) {
  return (
    <div className="animate-in fade-in absolute inset-0 z-20 flex items-center justify-center rounded-3xl bg-slate-900/25 backdrop-blur-[3px] duration-200">
      <div className="animate-in zoom-in-95 slide-in-from-bottom-3 flex w-[min(90%,21rem)] flex-col items-center gap-5 rounded-3xl border border-white/70 bg-white/95 px-8 py-9 text-center shadow-2xl shadow-slate-900/20 duration-300 dark:shadow-black/50">
        <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary-light text-white shadow-lg shadow-primary/40 ring-8 ring-primary/5">
          <Pause size={26} strokeWidth={2.2} />
        </span>

        <div className="space-y-1">
          <p className="text-xl font-semibold tracking-tight text-ink">已暂停</p>
          <p className="text-xs text-muted">计时已停止 · 输入暂不计数</p>
        </div>

        <button
          onClick={onResume}
          className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-white shadow-lg shadow-primary/30 transition-all duration-200 hover:-translate-y-0.5 hover:bg-primary-dark active:translate-y-0"
        >
          <Play size={15} />
          继续练习
        </button>

        <p className="text-[11px] text-faint">
          按
          <kbd className="mx-1 rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-muted">
            Esc
          </kbd>
          可快速继续
        </p>
      </div>
    </div>
  );
}
