// Cloudflare Worker (ES module). Required Secret binding: WORKER_TOKEN.
// Optional variable: ALLOWED_SPREADSHEET_IDS (comma-separated Spreadsheet IDs).
const json = (data, status) => new Response(JSON.stringify(data), {
  status, headers: {'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-WordFlow-Source': 'worker'},
});

async function matchesToken(provided, expected) {
  const digest = async (value) => new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)));
  const [a, b] = await Promise.all([digest(provided), digest(expected)]);
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

export default {
  async fetch(request, env) {
    if (typeof env.WORKER_TOKEN !== 'string' || env.WORKER_TOKEN === '') {
      return json({error: {code: 'worker_token_missing', message: 'WORKER_TOKEN is not defined in this deployed Worker.'}}, 503);
    }
    if ( env.WORKER_TOKEN.length < 32 || env.WORKER_TOKEN.length > 256 || /[^\x21-\x7E]/.test(env.WORKER_TOKEN)) {
      return json({error: {code: 'worker_token_invalid', message: 'WORKER_TOKEN is missing or invalid.'}}, 503);
    }
    const token = request.headers.get('X-Worker-Token') || '';
    if (token.length > 256 || !await matchesToken(token, env.WORKER_TOKEN)) {
      return json({error: {code: 'worker_token_mismatch', message: 'Unauthorized.'}}, 401);
    }
    if (request.method !== 'POST') {
      return json({error: {message: 'Only POST is supported.'}}, 405);
    }
    if (!(request.headers.get('Content-Type') || '').toLowerCase().startsWith('application/json')) {
      return json({error: {message: 'Expected application/json.'}}, 415);
    }
    let input;
    try {
      // Bound the actual streamed body, not just the client-supplied Content-Length.
      const reader = request.body?.getReader();
      if (!reader) return json({error: {message: 'Request body is required.'}}, 400);
      const chunks = [];
      let size = 0;
      while (true) {
        const {done, value} = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > 16384) {
          await reader.cancel();
          return json({error: {message: 'Request too large.'}}, 413);
        }
        chunks.push(value);
      }
      const bytes = new Uint8Array(size);
      let offset = 0;
      for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
      input = JSON.parse(new TextDecoder().decode(bytes));
    } catch {
      return json({error: {message: 'Invalid JSON.'}}, 400);
    }
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
      return json({error: {message: 'Invalid request.'}}, 400);
    }
    const {spreadsheetId, apiKey, sheetName, range} = input;
    if (![spreadsheetId, apiKey, sheetName, range].every(v => typeof v === 'string' && v.trim().length > 0 && v.length <= 4096)
        || !/^[A-Za-z0-9_-]+$/.test(spreadsheetId)) {
      return json({error: {message: 'Invalid sheet credentials.'}}, 400);
    }
    const allowed = (env.ALLOWED_SPREADSHEET_IDS || '').split(',').map(v => v.trim()).filter(Boolean);
    if (allowed.length && !allowed.includes(spreadsheetId)) {
      return json({error: {message: 'Spreadsheet is not allowed.'}}, 403);
    }
    // Fixed destination and read-only endpoint. Never accept a destination URL from clients.
    const url = new URL(`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(`${sheetName}!${range}`)}`);
    url.searchParams.set('majorDimension', 'ROWS');
    const abort = new AbortController();
    const timer = setTimeout(() => abort.abort(), 25000);
    try {
      const upstream = await fetch(url.toString(), {
        method: 'GET',
        headers: {'X-Goog-Api-Key': apiKey, 'Accept': 'application/json'},
        redirect: 'manual',
        signal: abort.signal,
      });
      if (upstream.status >= 300 && upstream.status < 400) {
        return json({error: {message: 'Unexpected Google redirect.'}}, 502);
      }
      // Buffer under the deadline; no cached sheet data or exposed upstream headers.
      const body = await upstream.arrayBuffer();
      return new Response(body, {
        status: upstream.status,
        headers: {'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-WordFlow-Source': 'google'},
      });
    } catch {
      return json({error: {message: 'Google Sheets connection failed.'}}, 502);
    } finally {
      clearTimeout(timer);
    }
  },
};
