const ADMIN_PASSWORD = '4547';
const KV_KEY = 'album-photos';
const R2_PUBLIC_BASE = 'https://pub-1b703dcc28274ffc8bea84f2cdabeaf5.r2.dev/';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    try {
      if (url.pathname === '/functions/api') {
        if (request.method === 'GET') return handleGetAlbum(env);
        if (request.method === 'POST') return handleSaveAlbum(request, env);
      }

      if (url.pathname === '/functions/api/list-photos' && request.method === 'GET') {
        return handleListPhotos(env);
      }
    } catch (err) {
      return Response.json({ error: err.message }, { status: 500 });
    }

    return env.ASSETS.fetch(request);
  }
};

async function handleGetAlbum(env) {
  const data = await env.ALBUM_KV.get(KV_KEY);
  return Response.json(data ? JSON.parse(data) : []);
}

async function handleSaveAlbum(request, env) {
  const body = await request.json();

  if (body.password !== ADMIN_PASSWORD) {
    return Response.json({ success: false, error: '비밀번호가 틀렸습니다.' }, { status: 401 });
  }

  await env.ALBUM_KV.put(KV_KEY, JSON.stringify(body.data || []));
  return Response.json({ success: true });
}

async function handleListPhotos(env) {
  const listed = await env.PHOTO_BUCKET.list({ limit: 1000 });

  const files = listed.objects
    .filter(obj => /\.(jpe?g|png|gif|webp|heic|heif|mp4|mov)$/i.test(obj.key))
    .map(obj => ({
      key: obj.key,
      url: R2_PUBLIC_BASE + obj.key.split('/').map(encodeURIComponent).join('/'),
      uploaded: obj.uploaded,
      size: obj.size
    }))
    .sort((a, b) => new Date(b.uploaded) - new Date(a.uploaded));

  return Response.json(files);
}
