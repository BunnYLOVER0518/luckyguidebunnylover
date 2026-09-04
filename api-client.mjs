export class ApiError extends Error {
  constructor(message, status = 0, retryAt = 0) { super(message); this.status = status; this.retryAt = retryAt; }
}

export function createApiClient({ baseUrl, fetcher = fetch, now = Date.now, timeoutMs = 12000 }) {
  const base = new URL(baseUrl);
  if (!['http:', 'https:'].includes(base.protocol)) throw new Error('올바르지 않은 API 주소');
  const cache = new Map();
  const pending = new Map();
  let version = '';
  let epoch = 0;
  let blockedUntil = 0;
  async function load(path) {
    const hit = cache.get(path);
    if (hit && hit.expires > now()) return hit.value;
    if (pending.has(path)) return pending.get(path);
    if (blockedUntil > now()) throw new ApiError('요청이 많습니다. 잠시 후 다시 시도해 주세요.', 429, blockedUntil);
    const promise = (async () => {
      const startingEpoch = epoch;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const response = await fetcher(new URL(path, base), { credentials: 'omit', signal: controller.signal });
        if (!response.ok) {
          const seconds = Number(response.headers.get('Retry-After')) || 60;
          const retryAt = [429,503].includes(response.status) ? now() + seconds * 1000 : 0;
          if (response.status === 429) blockedUntil = retryAt;
          throw new ApiError(response.status === 429 ? '조회가 많습니다. 1분 후 다시 시도해 주세요.' : '정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.', response.status, retryAt);
        }
        const result = await response.json();
        if (result.apiVersion !== 1 || !result.version) throw new ApiError('서버 응답 형식을 확인해 주세요.');
        if (version && version !== result.version) {
          if(startingEpoch !== epoch) throw new ApiError('데이터가 갱신되었습니다. 다시 열어 주세요.');
          cache.clear(); epoch++;
        }
        version = result.version;
        const value = result.items ?? result.item;
        if (!value) throw new ApiError('정보가 비어 있습니다.');
        cache.set(path, { value, expires: now() + 300000 });
        return value;
      } catch (error) {
        if (error instanceof ApiError) throw error;
        throw new ApiError('서버 연결을 확인하고 다시 시도해 주세요.');
      } finally { clearTimeout(timer); }
    })();
    pending.set(path, promise);
    try { return await promise; } finally { pending.delete(path); }
  }
  return {
    catalog(category, filters) {
      const params = new URLSearchParams();
      for (const [key,value] of Object.entries(filters || {})) if (value && value !== '전체') params.set(key,value);
      return load(`api/v1/catalog/${encodeURIComponent(category)}${params.size ? '?' + params : ''}`);
    },
    detail: (category, id) => load(`api/v1/${encodeURIComponent(category)}/${encodeURIComponent(id)}`),
  };
}
