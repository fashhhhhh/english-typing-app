import { useEffect, useState } from 'react';
import { Keyboard, Menu, X } from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import { navLinks } from './navLinks';

/** 移动端顶部栏 + 抽屉式导航（桌面侧栏在 md 以下隐藏） */
export default function MobileNav() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();

  // 切换页面后自动收起抽屉
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // 抽屉打开时锁定页面滚动
  useEffect(() => {
    if (!open) return;
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.documentElement.style.overflow = prev;
    };
  }, [open]);

  const current = navLinks.find((l) => pathname.startsWith(l.to));
  const CurrentIcon = current?.icon ?? Keyboard;

  return (
    <>
      {/* 顶栏不透明：正文区滚动时会从下方穿过，半透明会显得杂乱 */}
      <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-1.5 border-b border-slate-200/80 bg-white px-2.5 md:hidden">
        <button
          onClick={() => setOpen(true)}
          aria-label="打开菜单"
          className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl text-muted transition-colors active:bg-slate-100"
        >
          <Menu size={20} />
        </button>
        <span className="flex items-center gap-2 text-sm font-semibold text-ink">
          <CurrentIcon size={16} className="text-primary" />
          {current?.label ?? 'TypeEnglish'}
        </span>
      </header>

      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="animate-in fade-in absolute inset-0 bg-ink/40 backdrop-blur-sm duration-200"
            onClick={() => setOpen(false)}
          />
          <aside className="animate-in slide-in-from-left absolute inset-y-0 left-0 flex w-[264px] max-w-[82vw] flex-col bg-white shadow-2xl duration-200">
            <div className="flex h-14 items-center gap-2.5 px-4">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary-light text-white shadow-lg shadow-primary/30">
                <Keyboard size={18} strokeWidth={2.2} />
              </span>
              <span className="truncate text-[15px] font-semibold tracking-tight text-ink">
                TypeEnglish
              </span>
              <button
                onClick={() => setOpen(false)}
                aria-label="关闭菜单"
                className="ml-auto flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-xl text-muted active:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-2.5 pb-4 pt-1">
              {navLinks.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? 'bg-primary text-white shadow-md shadow-primary/30'
                        : 'text-muted active:bg-slate-100'
                    }`
                  }
                >
                  <Icon size={18} className="shrink-0" />
                  <span className="truncate">{label}</span>
                </NavLink>
              ))}
            </nav>

            <p className="px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] text-[11px] leading-relaxed text-faint">
              练习数据保存在本机浏览器，不会上传
            </p>
          </aside>
        </div>
      )}
    </>
  );
}
