// 목록에 쓸 표시용 사진(썸네일)을 서버에서 만든다.
//
// 브라우저에서 만들던 방식은 큰 사진을 자꾸 건너뛴다. 아이폰 사파리는
// 약 1,670만 화소가 넘는 이미지를 canvas 에 그려주지 않는데, 아이폰이 찍은
// 사진이 2천만 화소대라 정작 줄여야 할 사진들이 전부 걸러졌다.
// 여기서는 ImageMagick 으로 처리하므로 그런 제한이 없다.
//
// mov → mp4 변환과 같은 방식이다. 사이트의 관리자 API 만 쓰고,
// 관리자 비밀번호 하나만 있으면 어디서든 돌릴 수 있다.

import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const SITE = process.env.INONESTAR_SITE || 'https://inonestar.obliviscor29.workers.dev';
const PASSWORD = process.env.INONESTAR_ADMIN_PASSWORD;
const LIMIT = Number(process.env.INONESTAR_LIMIT || 0) || Infinity;

// 화면 가로폭이 기준이라 긴 변이 아니라 가로를 맞춘다.
// 앨범 카드 폭이 약 488px 이고 요즘 폰은 그걸 2~3배로 그리므로 1080px 면 선명하다.
const THUMB_WIDTH = 1080;
// 썸네일을 다시 만들어야 할 때 올린다. src/Admin.jsx 의 THUMB_VERSION 과 같아야 한다.
const THUMB_VERSION = 2;

const IMAGE_EXT = /\.(jpe?g|png|gif|webp|heic|heif)$/i;
// 워커가 X-Key 헤더로 받아주는 형식. 한글 등이 섞인 키는 보낼 수 없다.
const SAFE_KEY = /^[A-Za-z0-9._-]{1,128}$/;

const log = (msg) => console.log(`${new Date().toISOString()}  ${msg}`);

// ImageMagick 7 은 magick 하나로 모든 걸 하고, 6 은 convert/identify 로 나뉘어 있다.
const hasMagick = (() => {
  try {
    execFileSync('magick', ['-version'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
})();
const magick = (tool, args) =>
  execFileSync(hasMagick ? 'magick' : tool, hasMagick && tool !== 'convert' ? [tool, ...args] : args,
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });

const api = async (path, options = {}) => {
  const res = await fetch(SITE + path, options);
  if (!res.ok) throw new Error(`${path} → HTTP ${res.status}`);
  return res.json();
};

// 주소 끝의 파일 이름. 인코딩 방식이 달라도 같은 값이 나오도록 디코딩해서 비교한다.
const keyOf = (url) => {
  try {
    return decodeURIComponent(String(url || '').split('/').pop());
  } catch {
    return String(url || '').split('/').pop();
  }
};

// 원본 이름에서 만든다. 같은 사진은 늘 같은 이름이 나오므로 다시 돌려도 덮어쓴다.
const thumbKeyOf = (url) => keyOf(url).replace(/\.[^.]+$/, '') + `_t${THUMB_VERSION}.jpg`;

// 회전 정보를 반영한 뒤의 크기. 앨범이 사진 비율을 잡는 데 쓴다.
const sizeOf = (path) => {
  const out = magick('identify', ['-format', '%w %h', `${path}[0]`]);
  const [w, h] = out.trim().split(/\s+/).map(Number);
  return { w, h };
};

const main = async (work) => {
  const photos = await api('/functions/api');

  const targets = photos.filter(item =>
    item.url && IMAGE_EXT.test(item.url) && (!item.thumb || item.thumbV !== THUMB_VERSION)
  );

  if (targets.length === 0) {
    log('표시용 사진을 만들 대상이 없습니다.');
    return 0;
  }

  const queue = targets.slice(0, LIMIT);
  log(`사진 ${targets.length}개 중 ${queue.length}개를 처리합니다.`);

  const made = [];
  const origPath = join(work, 'in');
  const thumbPath = join(work, 'out.jpg');

  for (const [i, item] of queue.entries()) {
    const tag = `[${i + 1}/${queue.length}] ${keyOf(item.url)}`;
    const thumbKey = thumbKeyOf(item.url);

    if (!SAFE_KEY.test(thumbKey)) {
      log(`${tag} 건너뜀 — 파일 이름에 쓸 수 없는 문자가 있습니다.`);
      continue;
    }

    try {
      const res = await fetch(item.url);
      if (!res.ok) throw new Error(`다운로드 실패 HTTP ${res.status}`);
      writeFileSync(origPath, Buffer.from(await res.arrayBuffer()));

      // -auto-orient: 아이폰 사진의 회전 정보를 실제 픽셀에 반영한다.
      //   브라우저는 이 정보를 보고 돌려서 보여주지만, 줄인 사본에는 정보가 남지 않아
      //   반영해 두지 않으면 눕거나 뒤집힌 채로 뜬다.
      // -resize '1080x>': 가로가 1080 을 넘을 때만 줄인다. 작은 사진은 그대로 둔다.
      // -interlace Plane: 위에서 아래로 한 줄씩이 아니라 전체가 흐릿하게 먼저 뜬다.
      magick('convert', [
        `${origPath}[0]`,
        '-auto-orient',
        '-resize', `${THUMB_WIDTH}x>`,
        '-strip',
        '-sampling-factor', '4:2:0',
        '-interlace', 'Plane',
        '-quality', '75',
        thumbPath,
      ]);

      const { w, h } = sizeOf(thumbPath);
      if (!w || !h) throw new Error('만들어진 사진의 크기를 읽지 못했습니다');

      const beforeKb = Math.round(statSync(origPath).size / 1024);
      const afterKb = Math.round(statSync(thumbPath).size / 1024);

      const uploaded = await api('/functions/api/upload-raw', {
        method: 'POST',
        headers: {
          'Content-Type': 'image/jpeg',
          'X-Key': thumbKey,
          'X-Password': PASSWORD,
        },
        body: readFileSync(thumbPath),
      });
      if (!uploaded.success) throw new Error(uploaded.error || '업로드 실패');

      made.push({ key: keyOf(item.url), thumb: uploaded.url, oldThumb: item.thumb, w, h });
      log(`${tag} 완료 (${beforeKb}KB → ${afterKb}KB, ${w}x${h})`);
    } catch (err) {
      log(`${tag} 실패 — ${err.message}`);
    } finally {
      rmSync(origPath, { force: true });
      rmSync(thumbPath, { force: true });
    }
  }

  if (made.length === 0) {
    log('만들어진 사진이 없어 여기서 멈춥니다.');
    return 1;
  }

  // 작업하는 동안 목록이 바뀌었을 수 있으니 최신 목록에 얹는다.
  const fresh = await api('/functions/api');
  const byKey = new Map(made.map(m => [m.key, m]));

  let touched = 0;
  const next = fresh.map(item => {
    const m = byKey.get(keyOf(item.url));
    if (!m) return item;
    touched++;
    return { ...item, thumb: m.thumb, w: m.w, h: m.h, thumbV: THUMB_VERSION };
  });

  const saved = await api('/functions/api', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: PASSWORD, data: next }),
  });
  if (!saved.success) throw new Error('기록 저장 실패');
  log(`기록 ${touched}건이 새 표시용 사진을 가리키도록 바뀌었습니다.`);

  // 기록이 더 이상 참조하지 않는 예전 썸네일을 지운다.
  const stale = made.filter(m => m.oldThumb && keyOf(m.oldThumb) !== keyOf(m.thumb));
  for (const m of stale) {
    try {
      await api('/functions/api/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: PASSWORD, url: m.oldThumb }),
      });
    } catch (err) {
      log(`예전 썸네일 삭제 실패: ${keyOf(m.oldThumb)} — ${err.message}`);
    }
  }
  if (stale.length) log(`예전 썸네일 ${stale.length}개를 지웠습니다.`);

  const left = targets.length - made.length;
  log(`끝. ${made.length}개 완료.${left > 0 ? ` 남은 대상 ${left}개는 다시 실행하면 이어서 합니다.` : ''}`);
  return 0;
};

if (!PASSWORD) {
  console.error('INONESTAR_ADMIN_PASSWORD 가 없습니다.');
  console.error('GitHub 저장소 Settings → Secrets and variables → Actions 에서');
  console.error('INONESTAR_ADMIN_PASSWORD 를 추가해 주세요.');
  process.exit(1);
}

const work = mkdtempSync(join(tmpdir(), 'thumb-'));
try {
  process.exitCode = await main(work);
} finally {
  rmSync(work, { recursive: true, force: true });
}
