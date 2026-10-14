import { BarChart3, BookMarked, BookOpen, Keyboard, Library, Newspaper, Settings } from 'lucide-react';

/** 全站导航项（桌面侧栏与移动抽屉共用） */
export const navLinks = [
  { to: '/practice', label: '单词练习', icon: Keyboard },
  { to: '/corpus', label: '单词库', icon: BookOpen },
  { to: '/wrongbook', label: '错词本', icon: BookMarked },
  { to: '/articles', label: '文章练习', icon: Newspaper },
  { to: '/article-library', label: '文章库', icon: Library },
  { to: '/stats', label: '学习统计', icon: BarChart3 },
  { to: '/settings', label: '设置', icon: Settings },
];
