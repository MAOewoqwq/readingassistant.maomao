import crypto from 'crypto';

const CONFIG = {
  appKey: process.env.YOUDAO_API_ID || '',
  appSecret: process.env.YOUDAO_API_KEY || '',
  endpoint: 'https://openapi.youdao.com/api',
  q: '食べる',
  from: 'ja',
  to: 'zh-CHS',
};

function truncateQuery(q) {
  if (!q) return '';
  const len = q.length;
  if (len <= 20) {
    return q;
  }
  return `${q.slice(0, 10)}${len}${q.slice(-10)}`;
}

async function main() {
  const q = String(CONFIG.q || '').trim();
  const appKey = String(CONFIG.appKey || '').trim();
  const appSecret = String(CONFIG.appSecret || '').trim();
  const endpoint = String(CONFIG.endpoint || '').trim().replace(/\/+$/, '');
  const from = String(CONFIG.from || 'auto').trim();
  const to = String(CONFIG.to || 'zh-CHS').trim();

  if (!appKey || !appSecret) {
    throw new Error('请先在环境变量中设置 YOUDAO_API_ID 和 YOUDAO_API_KEY');
  }
  if (!q) {
    throw new Error('请先在 CONFIG.q 中填写要翻译的文本');
  }

  const salt = String(Date.now());
  const curtime = String(Math.floor(Date.now() / 1000));
  const signStr = `${appKey}${truncateQuery(q)}${salt}${curtime}${appSecret}`;
  const sign = crypto.createHash('sha256').update(signStr).digest('hex');

  const params = new URLSearchParams({
    q,
    from,
    to,
    appKey,
    salt,
    sign,
    signType: 'v3',
    curtime,
  });

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }

  console.log(JSON.stringify(data, null, 2));
}

main().catch((error) => {
  console.error('[Youdao Manual Script] 请求失败:', error.message || error);
  process.exitCode = 1;
});
