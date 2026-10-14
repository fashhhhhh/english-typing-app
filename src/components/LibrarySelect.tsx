import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Library } from 'lucide-react';
import { getLevelWordCount, LevelMeta } from '../services/corpusService';

interface LibrarySelectProps {
  levels: LevelMeta[];
  value: string;
  onChange: (id: string) => void;
}

/** 词库下拉选择器：词库变多后替代横向胶囊，展开时才加载各库词数 */
export default function LibrarySelect({ levels, value, onChange }: LibrarySelectProps) {
  const [open, setOpen] = useState(false);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const wrapRef = useRef<HTMLDivElement>(null);

  const current = levels.find((l) => l.id === value);
  const currentCount = counts[value];

  // 展开时异步加载各级别词数（按需、带缓存）
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    Promise.all(
      levels.map(async (l) => [l.id, await getLevelWordCount(l.id)] as const),
    ).then((entries) => {
      if (!cancelled) setCounts(Object.fromEntries(entries));
    });
    return () => {
      cancelled = true;
    };
  }, [open, levels]);

  // 点击外部或 Esc 关闭
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    // pointerdown 同时覆盖鼠标与触摸，手机上点击外部也能关闭
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div ref={wrapRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`flex cursor-pointer items-center gap-2 rounded-full border bg-white px-3 py-2 text-xs font-medium shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow sm:px-4 sm:py-2.5 sm:text-sm ${
          open ? 'border-primary/40 text-primary' : 'border-slate-200 text-ink'
        }`}
      >
        <Library size={15} className="shrink-0 text-primary" />
        <span className="truncate">{current?.name ?? '选择词库'}</span>
        {currentCount !== undefined && (
          <span className="hidden text-xs font-normal text-faint sm:inline">{currentCount} 词</span>
        )}
        <ChevronDown
          size={15}
          className={`text-faint transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div
          role="listbox"
          className="animate-in fade-in slide-in-from-top-1 absolute left-0 top-full z-30 mt-2 w-56 max-w-[calc(100vw-2rem)] rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl duration-150 sm:w-60"
        >
          {levels.map((l) => {
            const selected = l.id === value;
            return (
              <button
                key={l.id}
                role="option"
                aria-selected={selected}
                onClick={() => {
                  onChange(l.id);
                  setOpen(false);
                }}
                className={`flex w-full cursor-pointer items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors duration-150 ${
                  selected
                    ? 'bg-primary/10 font-semibold text-primary'
                    : 'text-ink hover:bg-slate-50'
                }`}
              >
                <span className="flex items-center gap-2">
                  {selected ? (
                    <Check size={14} />
                  ) : (
                    <span className="w-[14px]" aria-hidden />
                  )}
                  {l.name}
                </span>
                <span className="text-xs font-normal text-faint">
                  {counts[l.id] !== undefined ? `${counts[l.id]} 词` : '…'}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
