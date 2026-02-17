import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parse } from 'csv-parse/sync';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const WORD_PATTERN = /^[\p{L}][\p{L}'-]*[\p{L}]$/u;

const SOURCE_PATH = path.resolve(ROOT, process.argv[2] ?? 'ecdict.csv');
const OUTPUT_PATH = path.resolve(ROOT, process.argv[3] ?? path.join('data', 'ecdict-dictionary.json'));

if (!fs.existsSync(SOURCE_PATH)) {
  console.error(`[build-dictionary] 未找到词库文件：${SOURCE_PATH}`);
  console.error('请将 ecdict.csv 放在项目根目录，或运行：node scripts/build-dictionary.js <源文件路径> <输出文件路径>');
  process.exit(1);
}

const csvBuffer = fs.readFileSync(SOURCE_PATH);
const records = parse(csvBuffer, {
  columns: true,
  skip_empty_lines: true,
});

const recordMap = new Map();
records.forEach((row) => {
  if (row.word) {
    recordMap.set(row.word.trim().toLowerCase(), row);
  }
});

const TAG_TO_POS = {
  r: 'adj.',
  t: 'adj.',
  s: 'n.',
  p: 'v.',
  d: 'v.',
  i: 'v.',
  '3': 'v.',
};

const EXCHANGE_LABEL = {
  p: '过去式',
  d: '过去分词',
  i: '现在分词',
  '3': '第三人称单数',
  r: '比较级',
  t: '最高级',
  s: '复数',
};

const entries = records
  .map((row) => buildEntry(row))
  .filter((entry) => entry && entry.word);

fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
fs.writeFileSync(OUTPUT_PATH, JSON.stringify(entries, null, 2), 'utf-8');

console.log(`[build-dictionary] 已写入 ${entries.length} 个词条 -> ${OUTPUT_PATH}`);

function buildEntry(row) {
  const word = (row.word || '').trim();
  if (!word) {
    return null;
  }

  const phonetics = formatPhonetics(row.phonetic);
  const meanings = parseMeanings(row.translation);
  const derivatives = parseDerivatives(row, meanings);
  const variants = extractVariants(row, derivatives);

  return {
    word,
    phonetics,
    meanings,
    derivatives,
    variants,
  };
}

function formatPhonetics(raw) {
  if (!raw) {
    return '';
  }
  const trimmed = raw.trim().replace(/^\/|\/$/g, '');
  return trimmed ? `/${trimmed}/` : '';
}

function parseMeanings(raw) {
  if (!raw) {
    return [];
  }
  return raw
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = line.match(/^([a-zA-Z.&\s]+\.)(.+)$/);
      if (match) {
        return {
          pos: match[1].trim(),
          zh: match[2].trim(),
        };
      }
      const [pos, ...rest] = line.split('.');
      if (rest.length > 0) {
        return {
          pos: `${pos.trim()}.`,
          zh: rest.join('.').trim(),
        };
      }
      return {
        pos: '',
        zh: line,
      };
    });
}

function parseDerivatives(row, baseMeanings) {
  const exchange = row.exchange;
  if (!exchange) {
    return [];
  }

  const derivatives = [];
  const parsed = exchange
    .split('/')
    .map((pair) => pair.split(':').map((item) => item.trim()))
    .filter(([tag, form]) => tag && form && form !== row.word);

  parsed.forEach(([tag, form]) => {
    if (!EXCHANGE_LABEL[tag] && !TAG_TO_POS[tag]) {
      return;
    }
    if (!isValidWordLike(form)) {
      return;
    }
    const normalized = form.toLowerCase();
    const linkedRecord = recordMap.get(normalized);
    const linkedMeanings = linkedRecord ? parseMeanings(linkedRecord.translation) : [];
    const fallbackLabel = EXCHANGE_LABEL[tag] ?? '';
    const pos = linkedMeanings[0]?.pos || inferPosFromTag(tag) || linkedRecord?.pos || '';

    let zh = linkedMeanings[0]?.zh || fallbackLabel;
    if (!zh && baseMeanings[0]?.zh) {
      zh = `${baseMeanings[0].zh}（${fallbackLabel || '相关词形'}）`;
    }

    derivatives.push({
      word: form,
      pos,
      zh,
    });
  });

  return dedupeByWord(derivatives);
}

function extractVariants(row, derivatives) {
  const variants = new Set();

  if (row.detail) {
    const matches = row.detail.match(/#[^#]+#/g);
    if (matches) {
      matches.forEach((item) => {
        const value = item.replace(/#/g, '').trim();
        if (isValidWordLike(value) && value.toLowerCase() !== row.word.toLowerCase()) {
          variants.add(value);
        }
      });
    }
  }

  derivatives.forEach((item) => {
    if (isValidWordLike(item.word)) {
      variants.add(item.word);
    }
  });

  if (row.exchange) {
    row.exchange.split('/').forEach((pair) => {
      const [, form] = pair.split(':');
      if (form) {
        const value = form.trim();
        if (isValidWordLike(value) && value.toLowerCase() !== row.word.toLowerCase()) {
          variants.add(value);
        }
      }
    });
  }

  return Array.from(variants);
}

function dedupeByWord(list) {
  const map = new Map();
  list.forEach((item) => {
    const key = item.word.toLowerCase();
    if (!map.has(key)) {
      map.set(key, item);
    }
  });
  return Array.from(map.values());
}

function inferPosFromTag(tag) {
  if (!tag) {
    return '';
  }
  return TAG_TO_POS[tag] ?? '';
}

function isValidWordLike(value) {
  if (!value) {
    return false;
  }
  const token = value.trim();
  if (token.length <= 1) {
    return false;
  }
  return WORD_PATTERN.test(token);
}
