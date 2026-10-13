/** 章节进度条 */
export default function ChapterProgress({ progress }: { progress: number }) {
  return (
    <div className="w-full max-w-2xl">
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200/80">
        <div
          className="h-full rounded-full bg-gradient-to-r from-primary to-primary-light transition-all duration-300"
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        />
      </div>
    </div>
  );
}
