import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Clock, FileText, Layers, PenLine } from 'lucide-react';
import {
  ARTICLE_LEVELS,
  articleLevelName,
  estimateMinutes,
  getAllArticles,
} from '../services/articleService';
import { useStorage } from '../storage/StorageContext';

export default function ArticleListPage() {
  const storage = useStorage();
  const [level, setLevel] = useState('all');
  const articles = useMemo(
    () => getAllArticles(storage).filter((a) => level === 'all' || a.level === level),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [storage, level],
  );

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-7 px-5 py-6 sm:py-10">
      <section>
        <h1 className="text-2xl font-semibold text-ink">文章练习</h1>
        <p className="mt-1 text-sm text-muted">
          中英对照短篇，按段落逐句跟打。想添加自己的文章请到左侧「文章库」。
        </p>
      </section>

      <div className="flex rounded-full border border-slate-200 bg-white p-1 shadow-sm">
        {[{ id: 'all', name: '全部' }, ...ARTICLE_LEVELS].map((l) => (
          <button
            key={l.id}
            onClick={() => setLevel(l.id)}
            className={`cursor-pointer rounded-full px-3.5 py-2 text-xs font-medium transition-all duration-200 sm:text-sm ${
              level === l.id ? 'bg-ink text-white shadow' : 'text-muted hover:text-ink'
            }`}
          >
            {l.name}
          </button>
        ))}
      </div>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {articles.map((a) => (
          <Link
            key={a.id}
            to={`/articles/${a.id}`}
            className="group flex flex-col rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-primary/30 hover:shadow-lg"
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <FileText size={18} />
              </span>
              <div className="flex items-center gap-2">
                {a.custom && (
                  <span className="rounded-full bg-warning/10 px-2.5 py-1 text-[11px] font-medium text-warning">
                    自定义
                  </span>
                )}
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-muted">
                  {articleLevelName(a.level)}
                </span>
              </div>
            </div>

            <h3 className="text-lg font-semibold text-ink">
              {a.titleZh}
              <span className="ml-2 font-mono text-sm font-normal text-faint">{a.title}</span>
            </h3>
            <p className="mt-0.5 text-xs text-muted">
              {a.author} · {a.source}
            </p>
            <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-muted">{a.intro}</p>

            <div className="mt-4 flex flex-wrap items-center gap-3 text-[11px] text-faint">
              <span className="flex items-center gap-1">
                <Layers size={12} />
                {a.paragraphCount} 段
              </span>
              <span>{a.wordCount} 词</span>
              <span className="flex items-center gap-1">
                <Clock size={12} />
                约 {estimateMinutes(a.wordCount)} 分钟
              </span>
            </div>
          </Link>
        ))}
      </section>

      {articles.length === 0 && (
        <p className="py-16 text-center text-sm text-muted">该难度暂无文章。</p>
      )}
    </div>
  );
}
