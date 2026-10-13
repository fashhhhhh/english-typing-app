import { useRef, useState } from 'react';
import {
  Check,
  Database,
  Download,
  Eye,
  Keyboard,
  Monitor,
  Moon,
  Palette,
  Sun,
  Trash2,
  Upload,
} from 'lucide-react';
import LibrarySelect from '../components/LibrarySelect';
import Switch from '../components/Switch';
import { backupSizeKb, downloadBackup, readFileAsText } from '../services/backup';
import { WORD_LEVELS } from '../services/corpusService';
import { useStorage } from '../storage/StorageContext';
import { AppSettings, ThemeMode } from '../storage/types';

const THEMES: { id: ThemeMode; label: string; icon: typeof Sun }[] = [
  { id: 'light', label: '白天', icon: Sun },
  { id: 'dark', label: '夜晚', icon: Moon },
  { id: 'system', label: '跟随系统', icon: Monitor },
];

function Row({
  title,
  desc,
  children,
}: {
  title: string;
  desc?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 py-4">
      <div className="min-w-0">
        <p className="text-sm font-medium text-ink">{title}</p>
        {desc && <p className="mt-0.5 text-xs text-muted">{desc}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof Sun;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-7">
      <h2 className="flex items-center gap-2 text-base font-semibold text-ink">
        <Icon size={17} className="text-primary" />
        {title}
      </h2>
      <div className="mt-2 divide-y divide-slate-100">{children}</div>
    </section>
  );
}

export default function SettingsPage() {
  const storage = useStorage();
  const [settings, setSettings] = useState<AppSettings>(() => storage.getSettings());
  const [sizeInput, setSizeInput] = useState(() => String(settings.chapterSize));
  const [refreshKey, setRefreshKey] = useState(0);
  const [backupMsg, setBackupMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const update = (patch: Partial<AppSettings>) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    storage.saveSettings(next);
  };

  const applySize = (raw: string) => {
    setSizeInput(raw);
    const n = Number(raw);
    if (Number.isFinite(n) && n >= 1 && n <= 100) update({ chapterSize: Math.round(n) });
  };

  const counts = (() => {
    void refreshKey;
    return {
      history: storage.getHistory().length,
      wrong: storage.getWrongBook().length,
      corpora: storage.getCustomCorpora().length,
      articles: storage.getCustomArticles().length,
    };
  })();

  const clearHistory = () => {
    if (!window.confirm('确定清空全部练习记录吗？打卡热力图与趋势也会一并清零。')) return;
    storage.clearHistory();
    setRefreshKey((k) => k + 1);
  };

  const clearWrongBook = () => {
    if (!window.confirm('确定清空错词本吗？')) return;
    storage.getWrongBook().forEach((w) => storage.deleteWrongItem(w.id));
    setRefreshKey((k) => k + 1);
  };

  const handleExport = () => {
    const name = downloadBackup(storage);
    setBackupMsg({ ok: true, text: `已导出备份：${name}` });
  };

  const handleImportFile = async (file: File | undefined) => {
    if (!file) return;
    if (!window.confirm('导入备份会覆盖当前的练习记录、错词本、自定义词库/文章与设置，确定继续吗？')) {
      if (fileRef.current) fileRef.current.value = '';
      return;
    }
    try {
      const text = await readFileAsText(file);
      const result = storage.restoreBackup(text);
      if (!result.ok) {
        setBackupMsg({ ok: false, text: result.error ?? '导入失败' });
      } else {
        setBackupMsg({ ok: true, text: '导入成功，正在刷新…' });
        window.setTimeout(() => window.location.reload(), 600);
      }
    } catch (error) {
      setBackupMsg({ ok: false, text: error instanceof Error ? error.message : '导入失败' });
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 px-5 py-6 sm:py-10">
      <section>
        <h1 className="text-2xl font-semibold text-ink">设置</h1>
        <p className="mt-1 text-sm text-muted">所有设置保存在本机，重启后依然生效。</p>
      </section>

      <Section icon={Palette} title="外观">
        <Row title="主题" desc="夜晚模式降低亮度，适合夜间练习">
          <div className="flex rounded-full border border-slate-200 bg-slate-50 p-1">
            {THEMES.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => update({ theme: id })}
                className={`flex cursor-pointer items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-medium transition-all duration-200 sm:text-sm ${
                  settings.theme === id ? 'bg-white text-ink shadow' : 'text-muted hover:text-ink'
                }`}
              >
                <Icon size={14} />
                {label}
              </button>
            ))}
          </div>
        </Row>
      </Section>

      <Section icon={Keyboard} title="练习偏好">
        <Row title="默认词库" desc="打开练习页时默认使用的词库">
          <LibrarySelect
            levels={WORD_LEVELS}
            value={settings.defaultLevel}
            onChange={(id) => update({ defaultLevel: id })}
          />
        </Row>
        <Row title="默认输入方式">
          <div className="flex rounded-full border border-slate-200 bg-slate-50 p-1">
            {(
              [
                { id: 'follow', label: '跟打' },
                { id: 'dictation', label: '默写' },
              ] as const
            ).map((m) => (
              <button
                key={m.id}
                onClick={() => update({ defaultMode: m.id })}
                className={`cursor-pointer rounded-full px-4 py-2 text-xs font-medium transition-all duration-200 sm:text-sm ${
                  settings.defaultMode === m.id
                    ? 'bg-white text-ink shadow'
                    : 'text-muted hover:text-ink'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </Row>
        <Row title="每组词数" desc="1 ~ 100，练习中途随时可点「结束并结算」">
          <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5">
            <input
              type="number"
              min={1}
              max={100}
              value={sizeInput}
              disabled={settings.infinite}
              onChange={(e) => applySize(e.target.value)}
              onBlur={() => setSizeInput(String(settings.chapterSize))}
              aria-label="每组词数"
              className={`w-16 rounded-lg border border-slate-200 px-2 py-1 text-center text-sm outline-none transition-all ${
                settings.infinite
                  ? 'cursor-not-allowed bg-slate-100 text-faint'
                  : 'bg-white text-ink focus:border-primary focus:ring-2 focus:ring-primary/20'
              }`}
            />
            <span className="text-xs text-muted">词</span>
          </div>
        </Row>
        <Row title="无限练习" desc="不设每组长度，练到想停时点「结束并结算」">
          <Switch
            checked={settings.infinite}
            onChange={(v) => update({ infinite: v })}
            label="无限练习"
          />
        </Row>
      </Section>

      <Section icon={Eye} title="反馈">
        <Row title="按键音效" desc="正确按键的机械键盘音与错误提示音">
          <Switch
            checked={settings.sound}
            onChange={(v) => update({ sound: v })}
            label="按键音效"
          />
        </Row>
        <Row title="自动朗读" desc="进入新单词/新段落时自动朗读英文">
          <Switch
            checked={settings.autoSpeak}
            onChange={(v) => update({ autoSpeak: v })}
            label="自动朗读"
          />
        </Row>
      </Section>

      <Section icon={Eye} title="文章练习">
        <Row title="默认显示中文对照" desc="关闭后可在练习中用 Tab 临时查看">
          <Switch
            checked={settings.articleShowZh}
            onChange={(v) => update({ articleShowZh: v })}
            label="默认显示中文对照"
          />
        </Row>
      </Section>

      <Section icon={Database} title="数据">
        <Row
          title="本机数据概览"
          desc={`练习记录 ${counts.history} 条 · 错词 ${counts.wrong} 个 · 自定义词库 ${counts.corpora} 个 · 自定义文章 ${counts.articles} 篇`}
        >
          <span className="flex items-center gap-1.5 rounded-full bg-success/10 px-3 py-1.5 text-xs font-medium text-success">
            <Check size={13} />
            本地存储
          </span>
        </Row>
        <Row
          title="备份与恢复"
          desc={`把全部本机数据导出成一个 JSON 文件（当前约 ${backupSizeKb(storage)} KB），换电脑或清浏览器前先备份`}
        >
          <div className="flex items-center gap-2">
            <button
              onClick={handleExport}
              className="flex cursor-pointer items-center gap-1.5 rounded-full border border-primary/30 bg-primary/5 px-4 py-2 text-xs font-semibold text-primary transition-all hover:bg-primary/10"
            >
              <Download size={13} />
              导出备份
            </button>
            <button
              onClick={() => fileRef.current?.click()}
              className="flex cursor-pointer items-center gap-1.5 rounded-full border border-slate-200 px-4 py-2 text-xs font-medium text-muted transition-all hover:text-ink"
            >
              <Upload size={13} />
              导入恢复
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={(e) => void handleImportFile(e.target.files?.[0])}
            />
          </div>
        </Row>

        {backupMsg && (
          <div
            className={`py-3 text-xs font-medium ${
              backupMsg.ok ? 'text-success' : 'text-danger'
            }`}
          >
            {backupMsg.text}
          </div>
        )}

        <Row title="清空练习记录" desc="包含打卡热力图与 WPM 趋势数据">
          <button
            onClick={clearHistory}
            className="flex cursor-pointer items-center gap-1.5 rounded-full border border-slate-200 px-4 py-2 text-xs font-medium text-muted transition-all hover:text-danger"
          >
            <Trash2 size={13} />
            清空
          </button>
        </Row>
        <Row title="清空错词本">
          <button
            onClick={clearWrongBook}
            className="flex cursor-pointer items-center gap-1.5 rounded-full border border-slate-200 px-4 py-2 text-xs font-medium text-muted transition-all hover:text-danger"
          >
            <Trash2 size={13} />
            清空
          </button>
        </Row>
      </Section>

      <p className="px-1 text-xs leading-relaxed text-faint">
        提示：练习记录、错词本、自定义词库与文章都存在浏览器本地（localStorage），不会上传；换浏览器或清理浏览器数据会丢失。
      </p>
    </div>
  );
}
