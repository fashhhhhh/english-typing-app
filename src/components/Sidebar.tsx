import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Keyboard } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { navLinks } from './navLinks';

const COLLAPSE_KEY = 'eta_sidebar_collapsed';

/** 左侧垂直导航：可折叠（状态本地持久化） */
export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(() => {
    const raw = window.localStorage.getItem(COLLAPSE_KEY);
    return raw === '1';
  });

  useEffect(() => {
    window.localStorage.setItem(COLLAPSE_KEY, collapsed ? '1' : '0');
  }, [collapsed]);

  return (
    <aside
      className={`sticky top-0 hidden h-screen shrink-0 flex-col border-r border-slate-200/80 bg-white/80 backdrop-blur-xl transition-[width] duration-300 md:flex ${
        collapsed ? 'w-[68px]' : 'w-[212px]'
      }`}
    >
      {/* 品牌 */}
      <div className={`flex h-16 items-center gap-2.5 ${collapsed ? 'justify-center' : 'px-5'}`}>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary-light text-white shadow-lg shadow-primary/30">
          <Keyboard size={18} strokeWidth={2.2} />
        </span>
        {!collapsed && (
          <span className="truncate text-[15px] font-semibold tracking-tight text-ink">
            TypeEnglish
          </span>
        )}
      </div>

      {/* 导航项 */}
      <nav className="flex flex-1 flex-col gap-1.5 px-2.5 pt-2">
        {navLinks.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            title={collapsed ? label : undefined}
            className={({ isActive }) =>
              `flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                collapsed ? 'justify-center' : ''
              } ${
                isActive
                  ? 'bg-primary text-white shadow-md shadow-primary/30'
                  : 'text-muted hover:bg-slate-100 hover:text-ink'
              }`
            }
          >
            <Icon size={18} className="shrink-0" />
            {!collapsed && <span className="truncate">{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* 折叠开关 */}
      <button
        onClick={() => setCollapsed((v) => !v)}
        title={collapsed ? '展开侧栏' : '隐藏侧栏'}
        className="mx-2.5 mb-4 flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 py-2.5 text-xs font-medium text-muted transition-all duration-200 hover:bg-slate-50 hover:text-ink"
      >
        {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        {!collapsed && <span>隐藏侧栏</span>}
      </button>
    </aside>
  );
}
