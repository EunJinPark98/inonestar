// R2에 쌓인 .mov 를 .mp4 로 바꾼다.
//
// 아이폰이 찍는 .mov(HEVC)는 브라우저가 재생하지 못해 썸네일도 안 만들어지고
// 기기에 따라 아예 열리지 않는다. 주기적으로 찾아서 변환해 둔다.
//
// 사이트의 관리자 API 만 쓴다. Cloudflare 계정 인증이 필요 없고
// 관리자 비밀번호 하나만 있으면 어디서든 돌릴 수 있다.

import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const SITE = process.env.INONESTAR_SITE || 'https://inonestar.obliviscor29.workers.dev';
const PASSWORD = process.env.INONESTAR_ADMIN_PASSWORD;

// 워커가 X-Key 헤더로 받아주는 형식. 한글 등이 섞인 키는 보낼 수 없다.
const SAFE_KEY = /^[A-Za-z0-9._-]{1,128}$/;

const log = (msg) => console.log(`${new Date().toISOString()}  ${msg}`);

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

const main = async (work) => {
  const files = await api('/functions/api/list-photos');
  const movs = files.filter(f => /\.mov$/i.test(f.key));

  if (movs.length === 0) {
    log('변환할 .mov 가 없습니다.');
    return 0;
  }
  log(`.mov ${movs.length}개를 찾았습니다.`);

  const converted = [];

  for (const [i, file] of movs.entries()) {
    const tag = `[${i + 1}/${movs.length}] ${file.key}`;
    const mp4Key = file.key.replace(/\.mov$/i, '.mp4');

    if (!SAFE_KEY.test(mp4Key)) {
      log(`${tag} 건너뜀 — 파일 이름에 쓸 수 없는 문자가 있습니다.`);
      continue;
    }

    const movPath = join(work, 'in.mov');
    const mp4Path = join(work, 'out.mp4');

    try {
      log(`${tag} 내려받는 중`);
      const res = await fetch(file.url);
      if (!res.ok) throw new Error(`다운로드 실패 HTTP ${res.status}`);
      writeFileSync(movPath, Buffer.from(await res.arrayBuffer()));

      // faststart: 재생에 필요한 정보를 파일 앞으로 옮겨, 전체를 받기 전에 재생이 시작된다.
      // scale: 가로 1280을 넘으면 줄인다. 4K 원본이 그대로 올라가 있는 경우가 많다.
      log(`${tag} 변환 중`);
      execFileSync('ffmpeg', [
        '-i', movPath,
        '-vf', "scale='min(1280,iw)':-2",
        '-c:v', 'libx264', '-preset', 'fast', '-crf', '23',
        '-c:a', 'aac',
        '-movflags', '+faststart',
        '-y', mp4Path,
      ], { stdio: ['ignore', 'ignore', 'pipe'] });

      const body = readFileSync(mp4Path);
      const sizeMb = (statSync(mp4Path).size / 1024 / 1024).toFixed(1);
      const beforeMb = (file.size / 1024 / 1024).toFixed(1);

      log(`${tag} 올리는 중 (${beforeMb}MB → ${sizeMb}MB)`);
      const uploaded = await api('/functions/api/upload-raw', {
        method: 'POST',
        headers: {
          'Content-Type': 'video/mp4',
          'X-Key': mp4Key,
          'X-Password': PASSWORD,
        },
        body,
      });
      if (!uploaded.success) throw new Error(uploaded.error || '업로드 실패');

      converted.push({ oldKey: file.key, oldUrl: file.url, newUrl: uploaded.url });
      log(`${tag} 완료`);
    } catch (err) {
      log(`${tag} 실패 — ${err.message}`);
    } finally {
      rmSync(movPath, { force: true });
      rmSync(mp4Path, { force: true });
    }
  }

  if (converted.length === 0) {
    log('변환된 파일이 없어 여기서 멈춥니다.');
    return 1;
  }

  // 기록이 새 mp4 를 가리키도록 바꾼다. 이게 끝나기 전에는 원본을 지우지 않는다.
  const photos = await api('/functions/api');
  const byKey = new Map(converted.map(c => [c.oldKey, c.newUrl]));

  let touched = 0;
  const next = photos.map(item => {
    const replacement = byKey.get(keyOf(item.url));
    if (!replacement) return item;
    touched++;
    return { ...item, url: replacement };
  });

  const saved = await api('/functions/api', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: PASSWORD, data: next }),
  });
  if (!saved.success) throw new Error('기록 저장 실패');
  log(`기록 ${touched}건이 새 mp4 를 가리키도록 바뀌었습니다.`);

  // 기록이 더 이상 참조하지 않으니 원본 .mov 를 지운다.
  for (const c of converted) {
    try {
      await api('/functions/api/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: PASSWORD, url: c.oldUrl }),
      });
      log(`원본 삭제: ${c.oldKey}`);
    } catch (err) {
      log(`원본 삭제 실패: ${c.oldKey} — ${err.message}`);
    }
  }

  log(`끝. ${converted.length}개 변환.`);
  return 0;
};

if (!PASSWORD) {
  console.error('INONESTAR_ADMIN_PASSWORD 가 없습니다.');
  console.error('GitHub 저장소 Settings → Secrets and variables → Actions 에서');
  console.error('INONESTAR_ADMIN_PASSWORD 를 추가해 주세요.');
  process.exit(1);
}

const work = mkdtempSync(join(tmpdir(), 'mov-'));
try {
  process.exitCode = await main(work);
} finally {
  rmSync(work, { recursive: true, force: true });
}
