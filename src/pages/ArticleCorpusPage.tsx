import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, FileText, Import, Pencil, Trash2, X } from 'lucide-react';
import {
  ARTICLE_LEVELS,
  articleLevelName,
  countWords,
  estimateMinutes,
  getAllArticles,
  splitParagraphBlocks,
} from '../services/articleService';
import { useStorage } from '../storage/StorageContext';
import { genId } from '../storage/localProvider';

const MAX_CHARS = 30000;
const PLACEHOLDER_EN = `The policeman on the beat moved up the avenue impressively.

Bits of bright light showed here and there.

（段落之间空一行，段内请勿换行）`;

const PLACEHOLDER_ZH = `巡逻的警察威风凛凛地沿大街走来。

这里那里透出点点亮光。

（与英文段落一一对应，可留空表示暂无译文）`;

export default function ArticleCorpusPage() {
  const storage = useStorage();
  const [refreshKey, setRefreshKey] = useState(0);
  const [title, setTitle] = useState('');
  const [titleEn, setTitleEn] = useState('');
  const [author, setAuthor] = useState('');
  const [level, setLevel] = useState('intermediate');
  const [intro, setIntro] = useState('');
  const [rawEn, setRawEn] = useState('');
  const [rawZh, setRawZh] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const articles = useMemo(
    () => getAllArticles(storage),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [storage, refreshKey],
  );

  const parsed = useMemo(() => {
    const enBlocks = splitParagraphBlocks(rawEn);
    const zhBlocks = splitParagraphBlocks(rawZh);
    const charCount = enBlocks.join(' ').length;
    return {
      paragraphs: enBlocks.map((en, i) => ({ en, zh: zhBlocks[i] ?? '' })),
      charCount,
      wordCount: countWords(enBlocks),
      tooLarge: charCount > MAX_CHARS,
    };
  }, [rawEn, rawZh]);

  useEffect(() => {
    void refreshKey;
  }, [refreshKey]);

  const canImport =
    title.trim().length > 0 && parsed.paragraphs.length > 0 && !parsed.tooLarge;

  const handleImport = () => {
    if (!canImport) return;
    storage.saveCustomArticle({
      id: genId(),
      title: title.trim(),
      titleEn: titleEn.trim(),
      author: author.trim(),
      level,
      intro: intro.trim() || '自定义文章，按段落跟打练习。',
      paragraphs: parsed.paragraphs,
      createdAt: Date.now(),
    });
    setTitle('');
    setTitleEn('');
    setAuthor('');
    setIntro('');
    setRawEn('');
    setRawZh('');
    setRefreshKey((k) => k + 1);
  };

  const handleDelete = (id: string) => {
    storage.deleteCustomArticle(id);
    setRefreshKey((k) => k + 1);
  };

  const saveRename = (id: string) => {
    const target = storage.getCustomArticles().find((a) => a.id === id);
    const nextName = editingName.trim();
    if (target && nextName) storage.saveCustomArticle({ ...target, title: nextName });
    setEditingId(null);
    setRefreshKey((k) => k + 1);
  };

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8 px-5 py-6 sm:py-10">
      <section>
        <h1 className="text-2xl font-semibold text-ink">文章库</h1>
        <p className="mt-1 text-sm text-muted">
          内置中英对照短篇可直接练习；粘贴自己的英文文章＋中文译文即可创建自定义文章（段落用空行分隔）。
        </p>
      </section>

      {/* 文章卡片网格 */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {articles.map((a) => (
          <div
            key={a.id}
            className="flex flex-col rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
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
                {a.custom &&
                  (editingId === a.id ? (
                    <span className="flex items-center gap-1">
                      <button
                        onClick={() => saveRename(a.id)}
                        className="cursor-pointer rounded-full p-1.5 text-success transition-colors hover:bg-success/10"
                        aria-label="保存标题"
                      >
                        <Check size={14} />
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="cursor-pointer rounded-full p-1.5 text-faint transition-colors hover:bg-slate-100"
                        aria-label="取消重命名"
                      >
                        <X size={14} />
                      </button>
                    </span>
                  ) : (
                    <>
                      <button
                        onClick={() => {
                          setEditingId(a.id);
                          setEditingName(a.titleZh);
                        }}
                        className="cursor-pointer rounded-full p-1.5 text-faint transition-colors hover:bg-primary/10 hover:text-primary"
                        aria-label="重命名"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(a.id)}
                        className="cursor-pointer rounded-full p-1.5 text-faint transition-colors hover:bg-danger/10 hover:text-danger"
                        aria-label="删除文章"
                      >
                        <Trash2 size={14} />
                      </button>
                    </>
                  ))}
              </div>
            </div>

            {editingId === a.id ? (
              <input
                value={editingName}
                autoFocus
                data-testid="article-rename-input"
                onChange={(e) => setEditingName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveRename(a.id);
                  if (e.key === 'Escape') setEditingId(null);
                }}
                className="w-full rounded-lg border border-primary/40 bg-white px-2.5 py-1.5 text-sm font-semibold text-ink outline-none focus:ring-2 focus:ring-primary/20"
              />
            ) : (
              <h3 className="truncate text-base font-semibold text-ink">
                {a.titleZh}
                {a.title && a.title !== a.titleZh && (
                  <span className="ml-2 font-mono text-xs font-normal text-faint">{a.title}</span>
                )}
              </h3>
            )}
            <p className="mt-0.5 text-xs text-muted">
              {a.author} · {a.source}
            </p>
            <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-muted">{a.intro}</p>

            <div className="mt-4 flex items-center justify-between text-[11px] text-faint">
              <span>
                {a.paragraphCount} 段 · {a.wordCount} 词 · 约 {estimateMinutes(a.wordCount)} 分钟
              </span>
              <Link
                to={`/articles/${a.id}`}
                className="rounded-full bg-primary/10 px-3 py-1 font-medium text-primary transition-colors hover:bg-primary/20"
              >
                去练习
              </Link>
            </div>
          </div>
        ))}
      </section>

      {/* 自定义文章导入 */}
      <section className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-ink">
          <Import size={18} className="text-primary" />
          添加自定义文章
        </h2>
        <p className="mt-1 text-sm text-muted">
          英文正文与中文译文都用「空行」分隔段落，一一对应；中文可留空。
        </p>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="中文标题（必填），如：我的第一篇英语日记"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-ink outline-none transition-all placeholder:text-faint focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20"
          />
          <input
            value={titleEn}
            onChange={(e) => setTitleEn(e.target.value)}
            placeholder="英文标题（可空）"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-ink outline-none transition-all placeholder:text-faint focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20"
          />
          <input
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            placeholder="作者（可空）"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-ink outline-none transition-all placeholder:text-faint focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20"
          />
          <div className="flex rounded-xl border border-slate-200 bg-slate-50 p-1">
            {ARTICLE_LEVELS.map((l) => (
              <button
                key={l.id}
                onClick={() => setLevel(l.id)}
                className={`flex-1 cursor-pointer rounded-lg py-1.5 text-sm font-medium transition-all ${
                  level === l.id ? 'bg-white text-ink shadow' : 'text-muted hover:text-ink'
                }`}
              >
                {l.name}
              </button>
            ))}
          </div>
          <input
            value={intro}
            onChange={(e) => setIntro(e.target.value)}
            placeholder="简介（可空，会显示在文章页顶部）"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-ink outline-none transition-all placeholder:text-faint focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20 sm:col-span-2"
          />
        </div>

        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <textarea
            value={rawEn}
            onChange={(e) => setRawEn(e.target.value)}
            rows={9}
            placeholder={PLACEHOLDER_EN}
            className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-mono text-sm leading-relaxed text-ink outline-none transition-all placeholder:text-faint focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20"
          />
          <textarea
            value={rawZh}
            onChange={(e) => setRawZh(e.target.value)}
            rows={9}
            placeholder={PLACEHOLDER_ZH}
            className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-relaxed text-ink outline-none transition-all placeholder:text-faint focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs leading-relaxed text-muted">
            <p>
              将创建：
              <span className="font-semibold text-primary">{title.trim() || '—'}</span>
              <span className="ml-2">
                已解析 <span className="font-semibold text-primary">{parsed.paragraphs.length}</span>{' '}
                段 / {parsed.wordCount} 词
              </span>
            </p>
            {parsed.tooLarge && (
              <p className="mt-1 text-danger">正文过长（超过 {MAX_CHARS} 字符），请拆分成多篇。</p>
            )}
          </div>
          <button
            onClick={handleImport}
            disabled={!canImport}
            className={`flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold transition-all duration-200 ${
              canImport
                ? 'cursor-pointer bg-primary text-white shadow-lg shadow-primary/30 hover:-translate-y-0.5 hover:bg-primary-dark'
                : 'cursor-not-allowed bg-slate-100 text-faint'
            }`}
          >
            <Import size={15} />
            创建文章
          </button>
        </div>
      </section>
    </div>
  );
}
