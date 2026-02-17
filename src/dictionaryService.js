const DICT_PATHS = [
  '../data/ecdict-dictionary.json',
  '../data/sample-dictionary.json',
];

let dictionaryIndex = null;
const WORD_PATTERN = /^[\p{L}][\p{L}'-]*[\p{L}]$/u;

export async function preloadDictionary() {
  if (dictionaryIndex) {
    return;
  }
  await loadDictionarySequentially(DICT_PATHS);
  if (!dictionaryIndex) {
    console.error('[Dictionary] 未能加载任何词典数据，请确认 data 目录下的词典文件存在。');
    dictionaryIndex = new Map();
  }
}

export async function lookupWord(word) {
  if (!dictionaryIndex) {
    await preloadDictionary();
  }
  if (!dictionaryIndex) {
    return null;
  }
  const normalized = word.toLowerCase();
  const direct = dictionaryIndex.get(normalized);
  if (direct) {
    return decorateEntry(direct, word);
  }

  const fallback = inferBaseWord(normalized);
  if (fallback) {
    const resolved = dictionaryIndex.get(fallback);
    if (resolved) {
      return decorateEntry(resolved, word, fallback);
    }
  }
  return null;
}

function normalizeEntry(entry) {
  const phonetics = entry.phonetics ?? '';
  const meanings = (entry.meanings || []).map((item) => ({
    pos: item.pos,
    zh: item.zh,
  }));

  const derivatives = (entry.derivatives || [])
    .map((item) => ({
      word: item.word,
      pos: item.pos,
      zh: item.zh,
      deMarker: resolveDeMarker(item.pos),
    }))
    .filter((item) => isValidVariantToken(item.word));
  const variants = (entry.variants || []).filter((variant) => isValidVariantToken(variant));

  return {
    word: entry.word,
    phonetics,
    meanings,
    derivatives,
    variants,
  };
}

function resolveDeMarker(pos) {
  if (!pos) {
    return '得';
  }
  const normalized = pos.toLowerCase();
  if (normalized.startsWith('adj')) {
    return '的';
  }
  if (normalized.startsWith('adv')) {
    return '地';
  }
  return '得';
}

function decorateEntry(entry, originalWord, fallbackWord) {
  return {
    ...entry,
    requested: originalWord,
    base: fallbackWord ?? entry.word.toLowerCase(),
  };
}

function isValidVariantToken(value) {
  if (!value) {
    return false;
  }
  const token = value.trim();
  if (token.length <= 1) {
    return false;
  }
  return WORD_PATTERN.test(token);
}

function inferBaseWord(word) {
  if (word.endsWith("'s")) {
    return word.slice(0, -2);
  }
  if (word.endsWith('ies')) {
    return `${word.slice(0, -3)}y`;
  }
  if (word.endsWith('ing') && word.length > 4) {
    const trimmed = word.slice(0, -3);
    if (dictionaryIndex?.has(trimmed)) {
      return trimmed;
    }
    if (dictionaryIndex?.has(`${trimmed}e`)) {
      return `${trimmed}e`;
    }
  }
  if (word.endsWith('ed')) {
    const trimmed = word.slice(0, -2);
    if (dictionaryIndex?.has(trimmed)) {
      return trimmed;
    }
    if (dictionaryIndex?.has(`${trimmed}e`)) {
      return `${trimmed}e`;
    }
  }
  if (word.endsWith('s') && word.length > 3) {
    const singular = word.slice(0, -1);
    if (dictionaryIndex?.has(singular)) {
      return singular;
    }
  }
  return null;
}

async function loadDictionarySequentially(paths) {
  for (const resource of paths) {
    try {
      const response = await fetch(resource);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();
      const map = new Map();
      data.forEach((entry) => {
        const normalized = normalizeEntry(entry);
        map.set(normalized.word.toLowerCase(), normalized);
        (normalized.variants || []).forEach((variant) => {
          map.set(variant.toLowerCase(), normalized);
        });
      });
      dictionaryIndex = map;
      console.info(`[Dictionary] Loaded ${map.size} entries from ${resource}`);
      return;
    } catch (error) {
      console.warn(`[Dictionary] 加载 ${resource} 失败:`, error);
    }
  }
}
