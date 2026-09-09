const KV_KEY = 'album-photos';
const COVERS_KEY = 'folder-covers';
const LETTERS_KEY = 'letters';
const FOLDERS_KEY = 'folders';

const DEFAULT_FOLDERS = [
  { id: 1, name: '신생아', label: '0개월' },
  { id: 2, name: '1개월', label: '1개월' },
  { id: 3, name: '2개월', label: '2개월' },
  { id: 4, name: '3개월', label: '3개월' },
  { id: 5, name: '4개월', label: '4개월' },
  { id: 6, name: '5개월', label: '5개월' },
  { id: 7, name: '6개월', label: '6개월' },
];
const R2_PUBLIC_BASE = 'https://pub-1b703dcc28274ffc8bea84f2cdabeaf5.r2.dev/';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    try {
      if (url.pathname === '/functions/api') {
        if (request.method === 'GET') return handleGetAlbum(env);
        if (request.method === 'POST') return handleSaveAlbum(request, env);
      }

      if (url.pathname === '/functions/api/upload' && request.method === 'POST') {
        return handleUpload(request, env);
      }

      if (url.pathname === '/functions/api/upload-raw' && request.method === 'POST') {
        return handleUploadRaw(request, env);
      }

      if (url.pathname === '/functions/api/delete' && request.method === 'POST') {
        return handleDeleteFile(request, env);
      }

      if (url.pathname === '/functions/api/covers') {
        if (request.method === 'GET') return handleGetCovers(env);
        if (request.method === 'POST') return handleSaveCovers(request, env);
      }

      if (url.pathname === '/functions/api/folders') {
        if (request.method === 'GET') return handleGetFolders(env);
        if (request.method === 'POST') return handleSaveFolders(request, env);
      }

      if (url.pathname === '/functions/api/letters') {
        if (request.method === 'GET') return handleGetLetters(env);
        if (request.method === 'POST') return handleAddLetter(request, env);
      }

      if (url.pathname === '/functions/api/letters/delete' && request.method === 'POST') {
        return handleDeleteLetter(request, env);
      }

      if (url.pathname.startsWith('/functions/api/video/') ||
          url.pathname.startsWith('/functions/api/media/')) {
        return handleMediaStream(request, url, env);
      }

      if (url.pathname === '/functions/api/list-photos' && request.method === 'GET') {
        return handleListPhotos(env);
      }

      if (url.pathname === '/functions/api/verify' && request.method === 'POST') {
        return handleVerify(request, env);
      }
    } catch (err) {
      return Response.json({ error: err.message }, { status: 500 });
    }

    return env.ASSETS.fetch(request);
  }
};

async function handleVerify(request, env) {
  const body = await request.json();

  if (body.password !== env.ADMIN_PASSWORD) {
    return Response.json({ success: false, error: '비밀번호가 틀렸습니다.' }, { status: 401 });
  }

  return Response.json({ success: true });
}

async function handleGetAlbum(env) {
  const data = await env.ALBUM_KV.get(KV_KEY);
  return Response.json(data ? JSON.parse(data) : []);
}

async function handleSaveAlbum(request, env) {
  const body = await request.json();

  if (body.password !== env.ADMIN_PASSWORD) {
    return Response.json({ success: false, error: '비밀번호가 틀렸습니다.' }, { status: 401 });
  }

  await env.ALBUM_KV.put(KV_KEY, JSON.stringify(body.data || []));
  return Response.json({ success: true });
}

async function handleUpload(request, env) {
  const formData = await request.formData();
  const file = formData.get('file');
  const password = formData.get('password');

  if (password !== env.ADMIN_PASSWORD) {
    return Response.json({ success: false, error: '비밀번호가 틀렸습니다.' }, { status: 401 });
  }

  if (!file || !file.name) {
    return Response.json({ success: false, error: '파일이 없습니다.' }, { status: 400 });
  }

  const ext = file.name.split('.').pop();
  const key = `${Date.now()}.${ext}`;

  await env.PHOTO_BUCKET.put(key, await file.arrayBuffer(), {
    httpMetadata: { contentType: file.type }
  });

  const url = R2_PUBLIC_BASE + encodeURIComponent(key);
  return Response.json({ success: true, url, key });
}

async function handleUploadRaw(request, env) {
  const password = request.headers.get('X-Password');
  if (password !== env.ADMIN_PASSWORD) {
    return Response.json({ success: false, error: '비밀번호가 틀렸습니다.' }, { status: 401 });
  }

  const key = request.headers.get('X-Key');
  if (!key || !/^[A-Za-z0-9._-]{1,128}$/.test(key)) {
    return Response.json({ success: false, error: '잘못된 파일 이름입니다.' }, { status: 400 });
  }

  if (!request.body) {
    return Response.json({ success: false, error: '파일이 없습니다.' }, { status: 400 });
  }

  const contentType = request.headers.get('Content-Type') || 'application/octet-stream';

  // 본문을 그대로 R2로 흘려보낸다. 큰 영상을 워커 메모리에 통째로 올리지 않기 위함.
  await env.PHOTO_BUCKET.put(key, request.body, {
    httpMetadata: { contentType }
  });

  const url = R2_PUBLIC_BASE + encodeURIComponent(key);
  return Response.json({ success: true, url, key });
}

async function handleGetCovers(env) {
  const data = await env.ALBUM_KV.get(COVERS_KEY);
  return Response.json(data ? JSON.parse(data) : {});
}

async function handleSaveCovers(request, env) {
  const body = await request.json();

  if (body.password !== env.ADMIN_PASSWORD) {
    return Response.json({ success: false, error: '비밀번호가 틀렸습니다.' }, { status: 401 });
  }

  await env.ALBUM_KV.put(COVERS_KEY, JSON.stringify(body.covers || {}));
  return Response.json({ success: true });
}

// 폴더는 parentId 로 상위/하위를 구분한다. parentId 가 null 이면 상위폴더.
// 예전 데이터에는 parentId 자체가 없으므로, 읽을 때 '0세' 상위폴더를 만들어
// 기존 폴더들을 그 아래로 넣는다. 같은 입력이면 항상 같은 결과가 나온다.
function normalizeFolders(list) {
  if (!Array.isArray(list) || list.length === 0) return [];

  const isLegacy = list.every(f => f.parentId === undefined);
  if (!isLegacy) return list;

  const rootId = Math.max(...list.map(f => Number(f.id) || 0)) + 1;
  return [
    { id: rootId, name: '0세', label: '0세', parentId: null },
    ...list.map(f => ({ ...f, parentId: rootId })),
  ];
}

async function handleGetFolders(env) {
  const data = await env.ALBUM_KV.get(FOLDERS_KEY);
  const stored = data ? JSON.parse(data) : DEFAULT_FOLDERS;
  return Response.json(normalizeFolders(stored));
}

async function handleSaveFolders(request, env) {
  const body = await request.json();

  if (body.password !== env.ADMIN_PASSWORD) {
    return Response.json({ success: false, error: '비밀번호가 틀렸습니다.' }, { status: 401 });
  }

  await env.ALBUM_KV.put(FOLDERS_KEY, JSON.stringify(normalizeFolders(body.folders || DEFAULT_FOLDERS)));
  return Response.json({ success: true });
}

async function handleDeleteFile(request, env) {
  const body = await request.json();

  if (body.password !== env.ADMIN_PASSWORD) {
    return Response.json({ success: false, error: '비밀번호가 틀렸습니다.' }, { status: 401 });
  }

  if (!body.url) {
    return Response.json({ success: false, error: '삭제할 파일 URL이 없습니다.' }, { status: 400 });
  }

  const key = decodeURIComponent(body.url.replace(R2_PUBLIC_BASE, ''));
  await env.PHOTO_BUCKET.delete(key);
  return Response.json({ success: true });
}

async function handleGetLetters(env) {
  const data = await env.ALBUM_KV.get(LETTERS_KEY);
  return Response.json(data ? JSON.parse(data) : []);
}

async function handleAddLetter(request, env) {
  const body = await request.json();
  if (!body.author || !body.content) {
    return Response.json({ success: false, error: '이름과 내용을 입력해 주세요.' }, { status: 400 });
  }

  const data = await env.ALBUM_KV.get(LETTERS_KEY);
  const letters = data ? JSON.parse(data) : [];

  letters.unshift({
    id: Date.now(),
    author: body.author,
    content: body.content,
    private: !!body.private,
    date: new Date().toISOString().split('T')[0],
  });

  await env.ALBUM_KV.put(LETTERS_KEY, JSON.stringify(letters));
  return Response.json({ success: true });
}

async function handleDeleteLetter(request, env) {
  const body = await request.json();
  if (body.password !== env.ADMIN_PASSWORD) {
    return Response.json({ success: false, error: '비밀번호가 틀렸습니다.' }, { status: 401 });
  }

  const data = await env.ALBUM_KV.get(LETTERS_KEY);
  const letters = data ? JSON.parse(data) : [];
  const filtered = letters.filter(l => l.id !== body.id);
  await env.ALBUM_KV.put(LETTERS_KEY, JSON.stringify(filtered));
  return Response.json({ success: true });
}

const CONTENT_TYPES = {
  mp4: 'video/mp4', mov: 'video/quicktime',
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
  gif: 'image/gif', webp: 'image/webp',
  heic: 'image/heic', heif: 'image/heif',
};

// R2 파일을 워커를 통해 내보낸다. r2.dev 로 직접 받는 것과 달리
// 캐시 헤더가 붙고, 같은 출처라 canvas 로 썸네일을 뽑을 수 있다.
async function handleMediaStream(request, url, env) {
  const key = decodeURIComponent(
    url.pathname.replace('/functions/api/video/', '').replace('/functions/api/media/', '')
  );
  const rangeHeader = request.headers.get('Range');

  const opts = rangeHeader ? { range: { suffix: undefined } } : {};
  if (rangeHeader) {
    const m = rangeHeader.match(/bytes=(\d+)-(\d*)/);
    if (m) {
      opts.range = { offset: parseInt(m[1]) };
      if (m[2]) opts.range.length = parseInt(m[2]) - parseInt(m[1]) + 1;
    }
  }

  const obj = await env.PHOTO_BUCKET.get(key, opts);
  if (!obj) {
    return new Response('Not found', { status: 404 });
  }

  const ext = (key.split('.').pop() || '').toLowerCase();
  const contentType = CONTENT_TYPES[ext] || 'application/octet-stream';

  const headers = {
    'Content-Type': contentType,
    'Accept-Ranges': 'bytes',
    'Cache-Control': 'public, max-age=86400',
  };

  if (rangeHeader && obj.range) {
    const { offset, length } = obj.range;
    headers['Content-Range'] = `bytes ${offset}-${offset + length - 1}/${obj.size}`;
    headers['Content-Length'] = length;
    return new Response(obj.body, { status: 206, headers });
  }

  headers['Content-Length'] = obj.size;
  return new Response(obj.body, { status: 200, headers });
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
