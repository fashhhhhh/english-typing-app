/**
 * 词库构建脚本：把 temp/ 下下载的开源词表（Travisun/english-vocabulary，
 * 源自 kajweb/dict）转换为应用使用的分级 JSON 词库。
 *
 * 用法：先下载词表到 temp/ 下（文件名见 SOURCES），再执行 node scripts/build-word-data.mjs
 * 规则：
 * - 仅保留纯单词（可含连字符/撇号），过滤词组
 * - 词长 2~18，释义压缩空白并截断到 60 字符
 * - 各词库自身去重（忽略大小写），互不排除（六级/考研/托福均含基础词，符合各自大纲）
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const SOURCES = [
  { file: 'gaokao.txt', level: 'gaokao', out: 'gaokao-words.json', name: '高考' },
  { file: 'cet4.txt', level: 'cet4', out: 'cet4-words.json', name: 'CET-4' },
  { file: 'cet6.txt', level: 'cet6', out: 'cet6-words.json', name: 'CET-6' },
  { file: 'kaoyan.txt', level: 'kaoyan', out: 'kaoyan-words.json', name: '考研' },
  { file: 'toefl.txt', level: 'toefl', out: 'toefl-words.json', name: '托福' },
];

function readTxt(file, level) {
  const lines = readFileSync(path.join(root, 'temp', file), 'utf8').split(/\r?\n/);
  const map = new Map();
  for (const raw of lines) {
    const line = raw.replace(/^\uFEFF/, '');
    const idx = line.indexOf('\t');
    if (idx === -1) continue;
    const word = line.slice(0, idx).trim();
    const meaning = line.slice(idx + 1).trim().replace(/\s+/g, ' ').slice(0, 60);
    if (!word || !meaning) continue;
    if (!/^[a-zA-Z][a-zA-Z'-]*$/.test(word)) continue;
    if (word.length < 2 || word.length > 18) continue;
    const key = word.toLowerCase();
    if (!map.has(key)) map.set(key, { word, meaning, level });
  }
  return [...map.values()];
}

for (const source of SOURCES) {
  const items = readTxt(source.file, source.level);
  writeFileSync(path.join(root, 'src/data', source.out), JSON.stringify(items), 'utf8');
  console.log(`${source.name}(${source.level}): ${items.length} 词 -> ${source.out}`);
}
