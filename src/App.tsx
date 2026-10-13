import { lazy, Suspense, useEffect } from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import PracticePage from './pages/PracticePage';
import ArticleListPage from './pages/ArticleListPage';
import ArticleCorpusPage from './pages/ArticleCorpusPage';
import ArticlePracticePage from './pages/ArticlePracticePage';
import CorpusPage from './pages/CorpusPage';
import WrongBookPage from './pages/WrongBookPage';
import SettingsPage from './pages/SettingsPage';
import { onSettingsChanged } from './services/settingsBus';
import { useStorage } from './storage/StorageContext';

// 统计页含 recharts，体积较大，按需加载
const StatsPage = lazy(() => import('./pages/StatsPage'));

function StatsFallback() {
  return (
    <div className="flex items-center justify-center px-4 py-32 text-sm text-faint">
      正在加载统计图表…
    </div>
  );
}

function AppShell() {
  const storage = useStorage();

  // 应用主题：白天 / 夜晚 / 跟随系统
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const theme = storage.getSettings().theme;
      const dark = theme === 'dark' || (theme === 'system' && media.matches);
      document.documentElement.classList.toggle('dark', dark);
      document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
    };
    apply();
    const off = onSettingsChanged(apply);
    media.addEventListener('change', apply);
    return () => {
      off();
      media.removeEventListener('change', apply);
    };
  }, [storage]);

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <main className="min-w-0 flex-1">
        <Routes>
          <Route path="/" element={<Navigate to="/practice" replace />} />
          <Route path="/practice" element={<PracticePage />} />
          <Route path="/articles" element={<ArticleListPage />} />
          <Route path="/article-library" element={<ArticleCorpusPage />} />
          <Route path="/articles/:id" element={<ArticlePracticePage />} />
          <Route path="/corpus" element={<CorpusPage />} />
          <Route path="/wrongbook" element={<WrongBookPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route
            path="/stats"
            element={
              <Suspense fallback={<StatsFallback />}>
                <StatsPage />
              </Suspense>
            }
          />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <HashRouter>
      <AppShell />
    </HashRouter>
  );
}
