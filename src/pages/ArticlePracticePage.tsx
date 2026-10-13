import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import ArticleSession from './article/ArticleSession';
import ResultModal from '../components/ResultModal';
import { ArticleSnapshot } from '../engine/articleEngine';
import {
  ArticleData,
  articleLevelName,
  loadArticle,
} from '../services/articleService';
import { useStorage } from '../storage/StorageContext';
import { genId } from '../storage/localProvider';

export default function ArticlePracticePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const storage = useStorage();
  const settings = storage.getSettings();

  const [article, setArticle] = useState<ArticleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [round, setRound] = useState(0);
  const [result, setResult] = useState<ArticleSnapshot | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setResult(null);
    loadArticle(id ?? '', storage).then((data) => {
      if (cancelled) return;
      setArticle(data);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const handleComplete = useCallback(
    (snapshot: ArticleSnapshot) => {
      if (article) {
        storage.addRecord({
          id: genId(),
          mode: 'article',
          sourceName: `文章 · ${article.titleZh}`,
          level: article.level,
          wpm: snapshot.stats.wpm,
          accuracy: snapshot.stats.accuracy,
          durationSec: Math.round(snapshot.stats.elapsedSec),
          errorChars: snapshot.errorChars,
          createdAt: Date.now(),
        });
      }
      setDismissed(false);
      setResult(snapshot);
    },
    [storage, article],
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center gap-3 py-32 text-muted">
        <span className="h-8 w-8 animate-spin rounded-full border-[3px] border-slate-200 border-t-primary" />
        <p className="text-sm">正在加载文章…</p>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="flex flex-col items-center gap-3 py-32 text-center">
        <p className="text-muted">没有找到这篇文章。</p>
        <Link
          to="/articles"
          className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary/30"
        >
          返回文章库
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-5 px-5 py-6 sm:py-8">
      {/* 顶部信息 */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <button
            onClick={() => navigate('/articles')}
            title="返回文章库"
            className="mt-0.5 cursor-pointer rounded-full border border-slate-200 bg-white p-2.5 text-muted shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:text-ink hover:shadow"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="text-xl font-semibold text-ink sm:text-2xl">
              {article.titleZh}
              <span className="ml-2 font-mono text-sm font-normal text-faint">{article.title}</span>
            </h1>
            <p className="mt-0.5 text-xs text-muted">
              {article.author} · {articleLevelName(article.level)} · {article.paragraphCount} 段 ·{' '}
              {article.wordCount} 词
            </p>
          </div>
        </div>
      </div>

      <p className="rounded-2xl bg-slate-100/80 px-5 py-3.5 text-sm leading-relaxed text-muted">
        {article.intro}
      </p>

      <ArticleSession
        key={round}
        paragraphs={article.paragraphs}
        sound={settings.sound}
        autoSpeak={false}
        defaultShowZh={settings.articleShowZh}
        onComplete={handleComplete}
      />

      {result && !dismissed && (
        <ResultModal
          title="文章完成"
          stats={result.stats}
          errorChars={result.errorChars}
          onRestart={() => {
            setDismissed(true);
            setResult(null);
            setRound((r) => r + 1);
          }}
          onClose={() => {
            setDismissed(true);
            navigate('/articles');
          }}
        />
      )}
    </div>
  );
}
