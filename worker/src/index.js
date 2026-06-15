/**
 * pixel-sync — 武士零个人主页 数据同步 Worker
 * 使用 Cloudflare Workers + KV 存储用户数据
 */

// CORS
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// 简单 token 认证（用密码的简化 hash）
function verifyAuth(request) {
  const auth = request.headers.get('Authorization');
  if (!auth) return false;
  const [user, token] = atob(auth.replace('Basic ', '')).split(':');
  // 每个用户独立存储，key 为 user_tokenHash
  return { user, key: user + '_' + hash(token) };
}

function hash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h) + str.charCodeAt(i);
    h |= 0;
  }
  return h.toString(36);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // CORS 预检
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const path = url.pathname;

    // GET /api/sync — 拉取数据
    if (path === '/api/sync' && request.method === 'GET') {
      const auth = verifyAuth(request);
      if (!auth) {
        return new Response(JSON.stringify({ error: '未授权' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const raw = await env.PIXEL_DATA.get(auth.key);
      return new Response(raw || '{}', {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // POST /api/sync — 推送数据
    if (path === '/api/sync' && request.method === 'POST') {
      const auth = verifyAuth(request);
      if (!auth) {
        return new Response(JSON.stringify({ error: '未授权' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      try {
        const data = await request.json();
        // 限制数据大小（KV 上限 25MB）
        const json = JSON.stringify(data);
        if (json.length > 20 * 1024 * 1024) {
          return new Response(JSON.stringify({ error: '数据过大，照片太多了' }), {
            status: 413,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        await env.PIXEL_DATA.put(auth.key, json);
        return new Response(JSON.stringify({ ok: true, size: json.length }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    return new Response('pixel-sync worker', {
      headers: corsHeaders,
    });
  },
};
