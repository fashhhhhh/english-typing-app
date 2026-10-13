/**
 * 文章索引构建脚本：扫描 src/data/articles/*.json（排除 index.json），
 * 统计段落数、词数、字符数并生成 index.json，供文章库列表页读取。
 *
 * 用法：node scripts/build-article-index.mjs
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = path.join(root, 'src/data/articles');

const files = readdirSync(dir).filter((f) => f.endsWith('.json') && f !== 'index.json');

const index = files.map((file) => {
  const article = JSON.parse(readFileSync(path.join(dir, file), 'utf8'));
  const text = article.paragraphs.map((p) => p.en).join(' ');
  return {
    id: article.id,
    title: article.title,
    titleZh: article.titleZh,
    author: article.author,
    level: article.level,
    source: article.source,
    intro: article.intro,
    paragraphCount: article.paragraphs.length,
    wordCount: text.trim().split(/\s+/).length,
    charCount: text.length,
  };
});

writeFileSync(path.join(dir, 'index.json'), JSON.stringify(index, null, 2), 'utf8');
for (const meta of index) {
  console.log(`${meta.titleZh}(${meta.title}): ${meta.paragraphCount} 段 / ${meta.wordCount} 词`);
}
