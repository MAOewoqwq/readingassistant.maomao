function parseResponsePayload(text) {
  if (!text) {
    return {};
  }
  try {
    return JSON.parse(text);
  } catch (error) {
    return { raw: text };
  }
}

async function requestJSON(url, { method = 'GET', body } = {}) {
  const headers = {};
  const options = {
    method,
    credentials: 'include',
    headers,
  };
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);
  const text = await response.text();
  const payload = parseResponsePayload(text);

  if (!response.ok) {
    const message = payload?.error || `Request failed (${response.status})`;
    const detail = payload?.detail ? `: ${JSON.stringify(payload.detail)}` : '';
    throw new Error(`${message}${detail}`);
  }

  return payload;
}

export function fetchCurrentUser() {
  return requestJSON('/api/auth/me');
}

export function loginWithPassword(username, password) {
  return requestJSON('/api/auth/login', {
    method: 'POST',
    body: { username, password },
  });
}

export function registerWithPassword(username, password) {
  return requestJSON('/api/auth/register', {
    method: 'POST',
    body: { username, password },
  });
}

export function logoutSession() {
  return requestJSON('/api/auth/logout', { method: 'POST' });
}

export function fetchCloudBootstrap() {
  return requestJSON('/api/sync/bootstrap');
}

export function fetchCloudArticleLog(articleId) {
  return requestJSON(`/api/sync/article-log?articleId=${encodeURIComponent(articleId || '')}`);
}

export function saveCloudArticleLog(articleId, savedWordLog, conversationLog) {
  return requestJSON('/api/sync/article-log', {
    method: 'POST',
    body: {
      articleId,
      savedWordLog,
      conversationLog,
    },
  });
}
