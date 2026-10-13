import { HeatDay } from '../services/streak';

/** 练习次数 → 颜色档位 */
function levelClass(count: number): string {
  if (count <= 0) return 'bg-slate-100';
  if (count === 1) return 'bg-primary/25';
  if (count <= 3) return 'bg-primary/45';
  if (count <= 5) return 'bg-primary/70';
  return 'bg-primary';
}

const WEEKDAY_LABELS = ['一', '二', '三', '四', '五', '六', '日'];

/** GitHub 贡献图式的每日打卡热力图 */
export default function ActivityHeatmap({ weeks }: { weeks: HeatDay[][] }) {
  return (
    <div>
      <div className="flex gap-3">
        {/* 星期标签 */}
        <div className="flex flex-col gap-[3px] pt-[18px] text-[10px] leading-none text-faint">
          {WEEKDAY_LABELS.map((label, i) => (
            <span key={label} className="flex h-[13px] items-center">
              {i % 2 === 0 ? label : ''}
            </span>
          ))}
        </div>

        {/* 热力格 */}
        <div className="flex gap-[3px] overflow-x-auto pb-1">
          {weeks.map((column, ci) => {
            const firstDay = column[0];
            const prevColumn = weeks[ci - 1];
            const monthStart =
              !prevColumn || firstDay.key.slice(0, 7) !== prevColumn[0].key.slice(0, 7);
            return (
              <div key={firstDay.key} className="flex flex-col gap-[3px]">
                <span className="h-[15px] text-[10px] leading-none text-faint">
                  {monthStart ? `${Number(firstDay.key.slice(5, 7))}月` : ''}
                </span>
                {column.map((day) => (
                  <span
                    key={day.key}
                    title={
                      day.count < 0
                        ? ''
                        : `${day.key} · ${day.count > 0 ? `${day.count} 次练习` : '未练习'}`
                    }
                    className={`h-[13px] w-[13px] rounded-[3px] transition-colors duration-200 ${
                      day.count < 0 ? 'bg-transparent' : levelClass(day.count)
                    } ${day.count > 0 ? 'hover:ring-2 hover:ring-primary/30' : ''}`}
                  />
                ))}
              </div>
            );
          })}
        </div>
      </div>

      {/* 图例 */}
      <div className="mt-3 flex items-center justify-end gap-1.5 text-[11px] text-faint">
        <span>少</span>
        {[0, 1, 2, 4, 6].map((n) => (
          <span key={n} className={`h-[11px] w-[11px] rounded-[3px] ${levelClass(n)}`} />
        ))}
        <span>多</span>
      </div>
    </div>
  );
}
