import React, { useState, useEffect, useMemo, useRef } from 'react';

const theme = {
  bg: '#F5F3EF',
  card: '#FFFFFF',
  primary: '#C4633A',
  primarySoft: '#F3E0D5',
  success: '#5A9A6E',
  successSoft: '#E6F2EA',
  ink: '#1C1917',
  inkSoft: '#78716C',
  inkMuted: '#A8A29E',
  border: '#E7E5E4',
  borderLight: '#F5F3EF',
  danger: '#DC5F5F',
  dangerSoft: '#FEF2F2',
  shadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
  shadowMd: '0 4px 12px rgba(0,0,0,0.08)',
  shadowLg: '0 8px 24px rgba(0,0,0,0.10)',
  radius: '14px',
  radiusSm: '10px',
  radiusFull: '9999px',
};

const AdminStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

    *, *::before, *::after { box-sizing: border-box; }

    .admin-root {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      -webkit-font-smoothing: antialiased;
      -webkit-tap-highlight-color: transparent;
    }

    .admin-root input, .admin-root select, .admin-root button {
      font-family: inherit;
      box-sizing: border-box;
    }

    .admin-root input[type="date"] {
      -webkit-appearance: none;
      -moz-appearance: none;
      appearance: none;
      min-height: 44px;
    }

    @keyframes fadeUp {
      from { opacity: 0; transform: translateY(12px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    @keyframes scaleIn {
      from { opacity: 0; transform: scale(0.95); }
      to   { opacity: 1; transform: scale(1); }
    }

    .fade-up   { animation: fadeUp 0.35s ease-out both; }
    .scale-in  { animation: scaleIn 0.3s ease-out both; }
    .spin      { animation: spin 0.8s linear infinite; }

    .upload-area {
      transition: all 0.2s ease;
    }
    .upload-area:active {
      transform: scale(0.98);
      background: ${theme.primarySoft} !important;
    }

    .photo-card {
      transition: all 0.2s ease;
    }
    .photo-card:active {
      transform: scale(0.98);
    }

    .btn-press {
      transition: all 0.15s ease;
    }
    .btn-press:active {
      transform: scale(0.97);
    }

    .input-field {
      transition: border-color 0.2s ease, box-shadow 0.2s ease;
      box-sizing: border-box;
    }
    .input-field:focus {
      border-color: ${theme.primary} !important;
      box-shadow: 0 0 0 3px ${theme.primarySoft} !important;
      outline: none;
    }

    .admin-root input[type="date"]::-webkit-calendar-picker-indicator {
      opacity: 0.5;
    }
  `}</style>
);

const isParentFolder = (f) => f.parentId === null || f.parentId === undefined;
const sameId = (a, b) => Number(a) === Number(b);

const IMAGE_EXT = /\.(jpe?g|png|gif|webp|heic|heif)$/i;

// R2에 올릴 파일 이름. 헤더로 보내야 하므로 ASCII로만 만든다.
const makeKey = (name, suffix = '') => {
  const raw = (name.split('.').pop() || '').toLowerCase();
  const ext = /^[a-z0-9]{1,5}$/.test(raw) ? raw : 'bin';
  return `${Date.now()}${suffix}.${ext}`;
};

// 본문을 그대로 보내 워커가 스트리밍으로 R2에 넘기게 한다.
// 구버전 워커에는 이 경로가 없으므로 실패하면 기존 방식으로 돌아간다.
const uploadBlob = async (blob, key, contentType, password) => {
  try {
    const res = await fetch('/functions/api/upload-raw', {
      method: 'POST',
      headers: {
        'X-Password': password,
        'X-Key': key,
        'Content-Type': contentType || 'application/octet-stream',
      },
      body: blob,
    });
    if (res.ok) {
      const result = await res.json();
      if (result.success) return result;
    }
  } catch {
    // 아래 폴백으로 진행
  }

  const formData = new FormData();
  const file = blob instanceof File ? blob : new File([blob], key, { type: contentType });
  formData.append('file', file);
  formData.append('password', password);
  const res = await fetch('/functions/api/upload', { method: 'POST', body: formData });
  return res.json();
};

const R2_BASE = 'https://pub-1b703dcc28274ffc8bea84f2cdabeaf5.r2.dev/';

// 이미 올라간 영상은 워커를 통해 같은 출처로 받는다.
// r2.dev에서 바로 받으면 canvas가 오염돼 프레임을 못 꺼낸다.
const sameOriginUrl = (url, kind = 'media') => {
  const key = decodeURIComponent((url || '').replace(R2_BASE, ''));
  return `/functions/api/${kind}/` + key.split('/').map(encodeURIComponent).join('/');
};

// 영상에서 첫 프레임을 뽑아 포스터 이미지를 만든다.
// 목록에서 영상 본체를 받지 않고도 썸네일을 보여주기 위한 것.
// 브라우저가 못 여는 코덱(HEVC .mov 등)이면 null을 돌려주고 조용히 넘어간다.
const capturePosterFromSrc = (src) => new Promise((resolve) => {
  let settled = false;
  const video = document.createElement('video');

  const finish = (blob) => {
    if (settled) return;
    settled = true;
    clearTimeout(hardTimer);
    clearTimeout(seekTimer);
    video.removeAttribute('src');
    resolve(blob);
  };

  const draw = () => {
    try {
      const w = video.videoWidth || 0;
      const h = video.videoHeight || 0;
      if (!w || !h) return finish(null);

      const scale = Math.min(1, 720 / w);
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(w * scale);
      canvas.height = Math.round(h * scale);
      canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => finish(blob && { blob, w, h }), 'image/jpeg', 0.8);
    } catch {
      finish(null);
    }
  };

  const hardTimer = setTimeout(() => finish(null), 30000);
  let seekTimer = 0;

  video.preload = 'metadata';
  video.muted = true;
  video.playsInline = true;

  video.onloadedmetadata = () => {
    const target = Math.min(0.5, (video.duration || 1) / 2);
    video.currentTime = Number.isFinite(target) && target > 0 ? target : 0;
  };

  // 파일에 따라 seeked가 끝내 오지 않는 경우가 있다. 그때는 지금 프레임이라도 쓴다.
  video.onloadeddata = () => {
    clearTimeout(seekTimer);
    seekTimer = setTimeout(() => { if (video.readyState >= 2) draw(); }, 3000);
  };

  video.onseeked = draw;
  video.onerror = () => finish(null);

  video.src = src;
});

// 사진을 작게 줄인 썸네일. 폴더 목록의 80px 칸에 원본(수 MB)을 쓰지 않기 위한 것.
const makeImageThumb = (src) => new Promise((resolve) => {
  const img = new Image();
  let settled = false;

  const finish = (blob) => {
    if (settled) return;
    settled = true;
    clearTimeout(timer);
    resolve(blob);
  };
  const timer = setTimeout(() => finish(null), 20000);

  img.onload = () => {
    try {
      const w = img.naturalWidth || 0;
      const h = img.naturalHeight || 0;
      if (!w || !h) return finish(null);

      const scale = Math.min(1, 480 / Math.max(w, h));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(w * scale);
      canvas.height = Math.round(h * scale);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => finish(blob && { blob, w, h }), 'image/jpeg', 0.72);
    } catch {
      finish(null);
    }
  };
  img.onerror = () => finish(null);
  img.src = src;
});

const thumbFromFile = async (file) => {
  const objectUrl = URL.createObjectURL(file);
  try {
    return await makeImageThumb(objectUrl);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
};

// 업로드 직전 고른 파일에서 뽑을 때
const captureVideoPoster = async (file) => {
  const objectUrl = URL.createObjectURL(file);
  try {
    return await capturePosterFromSrc(objectUrl);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
};

// 이미 올라간 영상에서 뽑을 때. 워커를 거쳐 같은 출처로 받아야
// canvas가 오염되지 않아 프레임을 꺼낼 수 있다.
const capturePosterFromUrl = (url) => capturePosterFromSrc(url);

export default function Admin() {
  const [password, setPassword] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [photos, setPhotos] = useState([]);
  const [view, setView] = useState('register');
  const [editIndex, setEditIndex] = useState(null);
  const [editData, setEditData] = useState(null);
  const [covers, setCovers] = useState({});
  const [adminLetters, setAdminLetters] = useState([]);
  const [folders, setFolders] = useState([
    { id: 8, name: '0세', label: '0세', parentId: null },
    { id: 1, name: '신생아', label: '0개월', parentId: 8 },
    { id: 2, name: '1개월', label: '1개월', parentId: 8 },
    { id: 3, name: '2개월', label: '2개월', parentId: 8 },
    { id: 4, name: '3개월', label: '3개월', parentId: 8 },
    { id: 5, name: '4개월', label: '4개월', parentId: 8 },
    { id: 6, name: '5개월', label: '5개월', parentId: 8 },
    { id: 7, name: '6개월', label: '6개월', parentId: 8 },
  ]);
  const [newFolderName, setNewFolderName] = useState('');
  const [newChildName, setNewChildName] = useState('');
  const [newChildParent, setNewChildParent] = useState('');
  const [uploadParent, setUploadParent] = useState('');
  const [editParent, setEditParent] = useState('');
  const [listPage, setListPage] = useState(0);
  const PER_PAGE = 20;

  const [newPhoto, setNewPhoto] = useState({ url: '', title: '', date: '', folderId: '1', poster: '', thumb: '', w: 0, h: 0 });
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const fileInputRef = useRef(null);

  // 예전에 올린 영상들은 포스터가 없어서 목록에서 영상을 직접 받아야 한다.
  // 관리자 화면을 열면 한 번씩 만들어 채워 둔다.
  const [backfill, setBackfill] = useState({ total: 0, done: 0, failed: 0, running: false });
  const backfillStop = useRef(false);

  useEffect(() => {
    fetch('/functions/api')
      .then(res => res.json())
      .then(data => setPhotos(data || []))
      .catch(() => {});
    fetch('/functions/api/covers')
      .then(res => res.json())
      .then(data => setCovers(data || {}))
      .catch(() => {});
    fetch('/functions/api/letters')
      .then(res => res.json())
      .then(data => setAdminLetters(data || []))
      .catch(() => {});
    fetch('/functions/api/folders')
      .then(res => res.json())
      .then(data => { if (Array.isArray(data) && data.length) setFolders(data); })
      .catch(() => {});
  }, []);

  // 작은 이미지가 없는 예전 기록. 영상은 포스터, 사진은 썸네일이 대상.
  const posterTargets = useMemo(
    () => photos.filter(item => {
      if (!item.url) return false;
      return IMAGE_EXT.test(item.url) ? !item.thumb : !item.poster;
    }),
    [photos]
  );

  // 예전 영상들의 첫 프레임을 뽑아 포스터로 저장한다.
  // 영상을 한 번씩 받아야 하므로 버튼을 눌렀을 때만 실행한다.
  const runPosterBackfill = async () => {
    if (backfill.running) return;

    const targets = posterTargets;
    if (targets.length === 0) return;

    backfillStop.current = false;
    setBackfill({ total: targets.length, done: 0, failed: 0, running: true });

    const made = {};
    for (const item of targets) {
      if (backfillStop.current) break;

      const isPhoto = IMAGE_EXT.test(item.url);
      let ok = false;

      try {
        // 워커를 거쳐 같은 출처로 받아야 canvas 로 꺼낼 수 있다.
        const src = sameOriginUrl(item.url, isPhoto ? 'media' : 'video');
        const blob = isPhoto ? await makeImageThumb(src) : await capturePosterFromUrl(src);

        if (blob) {
          const key = makeKey(item.url, isPhoto ? '_thumb' : '_poster').replace(/\.[^.]+$/, '.jpg');
          const res = await uploadBlob(blob.blob, key, 'image/jpeg', password);
          if (res.success) {
            made[item.url] = {
              field: isPhoto ? 'thumb' : 'poster',
              url: res.url,
              w: blob.w,
              h: blob.h,
            };
            ok = true;
          }
        }
      } catch {
        ok = false;
      }

      setBackfill(b => ({ ...b, done: b.done + (ok ? 1 : 0), failed: b.failed + (ok ? 0 : 1) }));
    }

    const madeCount = Object.keys(made).length;

    if (madeCount > 0) {
      // 작업 중에 목록이 바뀌었을 수 있으니 최신 목록에 얹는다.
      let base = photos;
      try {
        const fresh = await (await fetch('/functions/api')).json();
        if (Array.isArray(fresh)) base = fresh;
      } catch {
        // 최신 목록을 못 받으면 화면에 있는 것으로 진행
      }

      const next = base.map(item => {
        const entry = made[item.url];
        // 비율(w, h)을 함께 저장해 두면 원본이 오기 전에도 자리를 정확히 잡을 수 있다.
        return entry ? { ...item, [entry.field]: entry.url, w: entry.w, h: entry.h } : item;
      });
      setPhotos(next);

      try {
        await fetch('/functions/api', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password, data: next })
        });
        showToast(`썸네일 ${madeCount}개를 만들었어요`);
      } catch {
        showToast('썸네일 저장에 실패했어요');
      }
    } else {
      showToast('만들 수 있는 썸네일이 없었어요');
    }

    setBackfill(b => ({ ...b, running: false }));
  };

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  };

  const isImageFile = (url) => /\.(jpe?g|png|gif|webp|heic|heif)$/i.test(url || '');

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/functions/api/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      const result = await res.json();

      if (result.success) {
        setIsLoggedIn(true);
      } else {
        showToast('비밀번호가 틀렸어요');
      }
    } catch {
      showToast('로그인에 실패했어요. 잠시 후 다시 시도해 주세요.');
    }
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setPreviewUrl(URL.createObjectURL(file));
    setUploading(true);

    try {
      const isVideo = !IMAGE_EXT.test(file.name);
      const key = makeKey(file.name);
      const result = await uploadBlob(file, key, file.type, password);

      if (!result.success) {
        showToast('업로드 실패: ' + (result.error || '알 수 없는 오류'));
        setPreviewUrl('');
        return;
      }

      // 목록에서 원본을 통째로 받지 않도록 작은 이미지를 함께 올린다.
      // 영상은 첫 프레임 포스터, 사진은 축소 썸네일.
      let poster = '';
      let thumb = '';

      let w = 0;
      let h = 0;

      const small = isVideo ? await captureVideoPoster(file) : await thumbFromFile(file);
      if (small) {
        const smallKey = makeKey(file.name, isVideo ? '_poster' : '_thumb').replace(/\.[^.]+$/, '.jpg');
        const smallRes = await uploadBlob(small.blob, smallKey, 'image/jpeg', password);
        if (smallRes.success) {
          if (isVideo) poster = smallRes.url; else thumb = smallRes.url;
          w = small.w;
          h = small.h;
        }
      }

      setNewPhoto(prev => ({ ...prev, url: result.url, poster, thumb, w, h }));
    } catch {
      showToast('업로드 오류가 발생했어요');
      setPreviewUrl('');
    } finally {
      setUploading(false);
    }
  };

  const handleAddPhoto = (e) => {
    e.preventDefault();
    if (!newPhoto.url || !newPhoto.title || !newPhoto.date) {
      showToast('사진, 제목, 날짜를 모두 입력해 주세요');
      return;
    }

    setPhotos([{ ...newPhoto, uploadedAt: Date.now() }, ...photos]);
    setNewPhoto({ ...newPhoto, url: '', title: '', date: '', poster: '', thumb: '', w: 0, h: 0 });
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl('');
    if (fileInputRef.current) fileInputRef.current.value = '';
    showToast('목록에 추가했어요');
  };

  const handleDelete = async (index) => {
    if (!window.confirm('정말로 삭제하시겠습니까?\nCloudflare에서도 파일이 삭제됩니다.')) return;

    const item = photos[index];
    const updated = photos.filter((_, i) => i !== index);

    // 1. R2에서 실제 파일 삭제 (영상은 포스터 이미지도 함께)
    for (const url of [item.url, item.poster, item.thumb]) {
      if (!url) continue;
      try {
        await fetch('/functions/api/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password, url })
        });
      } catch (_) {}
    }

    // 2. KV 목록에서도 즉시 반영 (저장 버튼 없이 바로 반영)
    try {
      await fetch('/functions/api', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, data: updated })
      });
    } catch (_) {}

    setPhotos(updated);
    setEditIndex(null);
    setEditData(null);
    showToast('삭제했어요');
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch('/functions/api', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, data: photos })
      });
      const result = await response.json();
      if (result.success) {
        showToast('저장 완료!');
      } else {
        showToast('저장 실패: ' + result.error);
      }
    } catch (err) {
      showToast('오류가 발생했어요');
    } finally {
      setSaving(false);
    }
  };

  const folderLabels = Object.fromEntries(folders.map(f => [String(f.id), f.name]));

  const parentFolders = folders.filter(isParentFolder);
  const findFolder = (id) => folders.find(f => sameId(f.id, id));
  const childrenOf = (pid) => folders.filter(f => !isParentFolder(f) && sameId(f.parentId, pid));
  const parentOf = (childId) => {
    const f = findFolder(childId);
    return f && !isParentFolder(f) ? findFolder(f.parentId) : null;
  };

  // 선택 상자에 쓸 값. 사용자가 아직 상위폴더를 고르지 않았으면
  // 현재 폴더의 상위폴더를, 그것도 없으면 첫 상위폴더를 쓴다.
  const resolveParent = (chosen, childId) =>
    String(chosen || parentOf(childId)?.id || parentFolders[0]?.id || '');

  // 대표 이미지는 폴더 id 별로 저장한다. 상위폴더 id 로도 지정할 수 있어
  // 상위폴더 카드에 쓸 사진을 따로 고를 수 있다.
  const toggleCover = async (folderId, url) => {
    const key = String(folderId || '');
    if (!key) return;

    const isCover = covers[key] === url;
    const next = { ...covers };
    if (isCover) delete next[key]; else next[key] = url;
    setCovers(next);

    try {
      await fetch('/functions/api/covers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, covers: next })
      });
      showToast(isCover ? '대표 이미지를 해제했어요' : '대표 이미지로 설정했어요');
    } catch (_) {
      showToast('대표 이미지 저장에 실패했어요');
    }
  };

  const selectStyle = {
    flex: 1, minWidth: 0,
    padding: '11px 12px', fontSize: '14px',
    borderRadius: '8px', border: `1.5px solid ${theme.border}`,
    background: theme.bg, color: theme.ink,
    outline: 'none', fontFamily: 'inherit', cursor: 'pointer',
  };

  const uploadParentValue = resolveParent(uploadParent, newPhoto.folderId);
  const uploadChildren = childrenOf(uploadParentValue);

  const saveFolders = async (next) => {
    setFolders(next);
    try {
      await fetch('/functions/api/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, folders: next })
      });
    } catch (_) {}
  };

  const nextFolderId = () =>
    (folders.length ? Math.max(...folders.map(f => Number(f.id) || 0)) + 1 : 1);

  const handleAddParentFolder = () => {
    const name = newFolderName.trim();
    if (!name) { showToast('상위폴더 이름을 입력해 주세요'); return; }
    saveFolders([...folders, { id: nextFolderId(), name, label: name, parentId: null }]);
    setNewFolderName('');
    showToast('상위폴더를 추가했어요');
  };

  const handleAddChildFolder = () => {
    const name = newChildName.trim();
    const parentId = newChildParent || parentFolders[0]?.id;
    if (!parentId) { showToast('먼저 상위폴더를 만들어 주세요'); return; }
    if (!name) { showToast('하위폴더 이름을 입력해 주세요'); return; }
    saveFolders([...folders, { id: nextFolderId(), name, label: name, parentId: Number(parentId) }]);
    setNewChildName('');
    showToast('하위폴더를 추가했어요');
  };

  const handleDeleteFolder = (id) => {
    const folder = findFolder(id);
    const kids = childrenOf(id);
    const scopeIds = [id, ...kids.map(k => k.id)];
    const count = photos.filter(p => scopeIds.some(sid => sameId(sid, p.folderId))).length;

    const parts = [];
    if (kids.length > 0) parts.push(`하위폴더 ${kids.length}개도 함께 삭제됩니다.`);
    if (count > 0) parts.push(`기록 ${count}개가 목록에서 보이지 않게 됩니다.\n(사진·영상 파일 자체는 남아 있어요)`);
    parts.push(`'${folder?.name}' 폴더를 삭제하시겠습니까?`);

    if (!window.confirm(parts.join('\n\n'))) return;

    saveFolders(folders.filter(f => !scopeIds.some(sid => sameId(sid, f.id))));
    showToast('폴더를 삭제했어요');
  };

  const handleRenameFolder = (id, name) => {
    saveFolders(folders.map(f => Number(f.id) === Number(id) ? { ...f, name, label: name } : f));
  };

  // ─── Login ───
  if (!isLoggedIn) {
    return (
      <div className="admin-root" style={{
        background: `linear-gradient(160deg, ${theme.bg} 0%, #EDE8E0 100%)`,
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}>
        <AdminStyles />
        <div className="fade-up" style={{
          background: theme.card,
          borderRadius: '20px',
          padding: '40px 28px',
          width: '100%',
          maxWidth: '360px',
          boxShadow: theme.shadowLg,
          textAlign: 'center',
        }}>
          <div style={{
            width: '56px', height: '56px',
            background: theme.primarySoft,
            borderRadius: '16px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 20px',
            fontSize: '24px',
          }}>
            🔐
          </div>
          <h1 style={{ fontSize: '20px', fontWeight: '700', color: theme.ink, margin: '0 0 6px' }}>
            한별이 앨범
          </h1>
          <p style={{ fontSize: '13px', color: theme.inkMuted, margin: '0 0 28px' }}>
            관리자 비밀번호를 입력해 주세요
          </p>
          <form onSubmit={handleLogin}>
            <input
              type="password"
              placeholder="비밀번호"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-field"
              style={{
                width: '100%', padding: '14px 16px', fontSize: '16px',
                borderRadius: theme.radiusSm, border: `1.5px solid ${theme.border}`,
                background: theme.bg, outline: 'none',
                textAlign: 'center', letterSpacing: '4px',
              }}
            />
            <button type="submit" className="btn-press" style={{
              width: '100%', padding: '14px', marginTop: '14px',
              fontSize: '15px', fontWeight: '600',
              background: theme.primary, color: 'white',
              border: 'none', borderRadius: theme.radiusSm,
              cursor: 'pointer',
            }}>
              로그인
            </button>
          </form>
        </div>
        {toast && <Toast message={toast} />}
      </div>
    );
  }

  // ─── Main ───
  return (
    <div className="admin-root" style={{
      background: theme.bg,
      minHeight: '100vh',
      paddingBottom: '100px',
    }}>
      <AdminStyles />

      {/* Header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: 'rgba(245,243,239,0.85)',
        backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
        borderBottom: `1px solid ${theme.border}`,
        padding: '14px 20px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <h1 style={{ fontSize: '17px', fontWeight: '700', color: theme.ink, margin: 0 }}>
            {view === 'register' ? '앨범 관리' : view === 'list' ? '등록 목록' : view === 'folders' ? '폴더 관리' : '편지 관리'}
          </h1>
          <p style={{ fontSize: '11px', color: theme.inkMuted, margin: '2px 0 0' }}>
            {photos.length}개 등록됨
          </p>
        </div>
        <button onClick={handleSave} disabled={saving} className="btn-press" style={{
          padding: '9px 18px',
          fontSize: '13px', fontWeight: '600',
          background: theme.success, color: 'white',
          border: 'none', borderRadius: theme.radiusFull,
          cursor: 'pointer', opacity: saving ? 0.6 : 1,
          display: 'flex', alignItems: 'center', gap: '6px',
        }}>
          {saving ? (
            <span className="spin" style={{ display: 'inline-block', width: '14px', height: '14px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%' }} />
          ) : null}
          {saving ? '저장 중' : '저장'}
        </button>
      </div>

      {(posterTargets.length > 0 || backfill.total > 0) && (
        <div style={{ maxWidth: '500px', margin: '12px auto 0', padding: '0 16px' }}>
          <div style={{
            background: theme.card,
            border: `1px solid ${theme.border}`,
            borderRadius: theme.radius,
            boxShadow: theme.shadow,
            padding: '16px',
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px',
            }}>
              <div>
                <div style={{ fontSize: '14px', fontWeight: '600', color: theme.ink }}>
                  썸네일 만들기
                </div>
                <div style={{ fontSize: '11px', color: theme.inkMuted, marginTop: '3px' }}>
                  {backfill.running
                    ? '하나씩 열어보는 중이에요'
                    : posterTargets.length > 0
                      ? `썸네일 없는 사진·영상 ${posterTargets.length}개`
                      : '모두 썸네일이 있어요'}
                </div>
              </div>

              {backfill.running ? (
                <button type="button" className="btn-press"
                  onClick={() => { backfillStop.current = true; }}
                  style={{
                    flexShrink: 0,
                    padding: '8px 16px', fontSize: '13px', fontWeight: '600',
                    background: theme.borderLight, color: theme.inkSoft,
                    border: 'none', borderRadius: theme.radiusFull,
                    cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  중지
                </button>
              ) : posterTargets.length > 0 ? (
                <button type="button" className="btn-press"
                  onClick={runPosterBackfill}
                  style={{
                    flexShrink: 0,
                    padding: '9px 18px', fontSize: '13px', fontWeight: '600',
                    background: theme.primary, color: 'white',
                    border: 'none', borderRadius: theme.radiusFull,
                    cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  만들기
                </button>
              ) : null}
            </div>

            {backfill.total > 0 && (
              <>
                <div style={{
                  height: '6px', marginTop: '14px',
                  background: theme.borderLight, borderRadius: '999px', overflow: 'hidden',
                }}>
                  <div style={{
                    width: `${Math.round(((backfill.done + backfill.failed) / backfill.total) * 100)}%`,
                    height: '100%', background: theme.primary,
                    borderRadius: '999px', transition: 'width 0.3s ease',
                  }} />
                </div>

                <div style={{ fontSize: '11px', color: theme.inkMuted, marginTop: '8px' }}>
                  {backfill.done + backfill.failed} / {backfill.total}개 처리
                  {backfill.done > 0 && ` · ${backfill.done}개 완료`}
                  {backfill.failed > 0 && ` · ${backfill.failed}개 건너뜀`}
                </div>
              </>
            )}

            {!backfill.running && posterTargets.length > 0 && (
              <div style={{ fontSize: '11px', color: theme.inkMuted, marginTop: '10px', lineHeight: 1.6 }}>
                원본을 한 번씩 받아야 해서 시간이 걸립니다. 와이파이에서 하시는 걸 권해요.
                한 번 만들어 두면 폴더 목록과 영상이 훨씬 빨라집니다.
              </div>
            )}
          </div>
        </div>
      )}

      <div style={{ padding: '16px 16px 0', maxWidth: '500px', margin: '0 auto' }}>

        {view === 'register' ? (
          <>
            {/* ── Upload Card ── */}
            <div className="fade-up" style={{
              background: theme.card,
              borderRadius: theme.radius,
              boxShadow: theme.shadow,
              padding: '20px',
              marginBottom: '12px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px' }}>
                <div style={{
                  width: '28px', height: '28px',
                  background: theme.primarySoft, borderRadius: '8px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '14px',
                }}>✨</div>
                <span style={{ fontSize: '15px', fontWeight: '600', color: theme.ink }}>새 사진 등록</span>
              </div>

              {/* Folder — 상위 / 하위 */}
              <label style={{ fontSize: '12px', fontWeight: '600', color: theme.inkSoft, display: 'block', marginBottom: '6px', letterSpacing: '0.02em' }}>
                폴더
              </label>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '18px' }}>
                <select
                  value={uploadParentValue}
                  onChange={e => {
                    const pid = e.target.value;
                    setUploadParent(pid);
                    const first = childrenOf(pid)[0];
                    setNewPhoto(prev => ({ ...prev, folderId: first ? String(first.id) : '' }));
                  }}
                  style={selectStyle}
                >
                  {parentFolders.length === 0 && <option value="">상위폴더 없음</option>}
                  {parentFolders.map(f => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>

                <select
                  value={String(newPhoto.folderId || '')}
                  onChange={e => setNewPhoto(prev => ({ ...prev, folderId: e.target.value }))}
                  style={selectStyle}
                >
                  {uploadChildren.length === 0
                    ? <option value="">하위폴더 없음</option>
                    : uploadChildren.map(f => (
                        <option key={f.id} value={f.id}>{f.name}</option>
                      ))}
                </select>
              </div>

              {/* Photo Upload */}
              <label style={{ fontSize: '12px', fontWeight: '600', color: theme.inkSoft, display: 'block', marginBottom: '6px', letterSpacing: '0.02em' }}>
                사진 / 영상
              </label>

              {previewUrl ? (
                <div className="scale-in" style={{ marginBottom: '16px' }}>
                  <div style={{
                    position: 'relative',
                    borderRadius: theme.radiusSm,
                    overflow: 'hidden',
                    background: '#F1EDE6',
                  }}>
                    {isImageFile(newPhoto.url || previewUrl) || previewUrl.startsWith('blob:') ? (
                      <img src={previewUrl} alt="" style={{
                        width: '100%', maxHeight: '260px',
                        objectFit: 'cover', display: 'block',
                      }} />
                    ) : (
                      <video src={previewUrl} controls style={{
                        width: '100%', maxHeight: '260px', display: 'block',
                      }} />
                    )}
                    {uploading && (
                      <div style={{
                        position: 'absolute', inset: 0,
                        background: 'rgba(0,0,0,0.45)',
                        backdropFilter: 'blur(2px)',
                        display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'center', gap: '10px',
                      }}>
                        <span className="spin" style={{
                          display: 'block', width: '28px', height: '28px',
                          border: '3px solid rgba(255,255,255,0.25)',
                          borderTopColor: 'white', borderRadius: '50%',
                        }} />
                        <span style={{ color: 'white', fontSize: '13px', fontWeight: '500' }}>업로드 중...</span>
                      </div>
                    )}

                    {!uploading && (
                      <button type="button" className="btn-press"
                        onClick={() => {
                          URL.revokeObjectURL(previewUrl);
                          setPreviewUrl('');
                          setNewPhoto(prev => ({ ...prev, url: '' }));
                          if (fileInputRef.current) fileInputRef.current.value = '';
                        }}
                        style={{
                          position: 'absolute', top: '8px', right: '8px',
                          width: '30px', height: '30px',
                          background: 'rgba(0,0,0,0.45)',
                          backdropFilter: 'blur(4px)',
                          border: 'none', borderRadius: '50%',
                          color: 'white', fontSize: '15px',
                          cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <button type="button" className="upload-area"
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    width: '100%',
                    padding: '32px 16px',
                    background: theme.borderLight,
                    border: `2px dashed ${theme.border}`,
                    borderRadius: theme.radiusSm,
                    cursor: 'pointer',
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', gap: '8px',
                    marginBottom: '16px',
                  }}
                >
                  <div style={{
                    width: '44px', height: '44px',
                    background: theme.card,
                    borderRadius: '12px',
                    boxShadow: theme.shadow,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '20px',
                  }}>📷</div>
                  <span style={{ fontSize: '14px', fontWeight: '500', color: theme.inkSoft }}>
                    터치해서 사진 선택
                  </span>
                  <span style={{ fontSize: '11px', color: theme.inkMuted }}>
                    사진 또는 영상을 올릴 수 있어요
                  </span>
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />

              {/* Title */}
              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '12px', fontWeight: '600', color: theme.inkSoft, display: 'block', marginBottom: '6px' }}>제목</label>
                <input type="text" placeholder="이 순간의 제목"
                  value={newPhoto.title}
                  onChange={e => setNewPhoto({ ...newPhoto, title: e.target.value })}
                  className="input-field"
                  style={{
                    width: '100%', padding: '12px', fontSize: '15px',
                    borderRadius: '8px', border: `1.5px solid ${theme.border}`,
                    background: theme.bg, outline: 'none',
                  }}
                />
              </div>

              {/* Date */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '12px', fontWeight: '600', color: theme.inkSoft, display: 'block', marginBottom: '6px' }}>날짜</label>
                <input type="date"
                  value={newPhoto.date}
                  onChange={e => setNewPhoto({ ...newPhoto, date: e.target.value })}
                  className="input-field"
                  style={{
                    width: '100%', padding: '12px', fontSize: '15px',
                    borderRadius: '8px', border: `1.5px solid ${theme.border}`,
                    background: theme.bg, outline: 'none',
                  }}
                />
              </div>

              <button type="button" onClick={handleAddPhoto}
                disabled={!newPhoto.url || uploading}
                className="btn-press"
                style={{
                  width: '100%', padding: '14px',
                  fontSize: '14px', fontWeight: '600',
                  background: (newPhoto.url && !uploading) ? theme.primary : theme.border,
                  color: (newPhoto.url && !uploading) ? 'white' : theme.inkMuted,
                  border: 'none', borderRadius: theme.radiusSm,
                  cursor: (newPhoto.url && !uploading) ? 'pointer' : 'default',
                }}
              >
                목록에 추가
              </button>
            </div>

            {/* ── Go to list button ── */}
            <button
              type="button"
              className="btn-press"
              onClick={() => { setView('list'); window.scrollTo({ top: 0 }); }}
              style={{
                width: '100%',
                padding: '15px',
                background: theme.card,
                border: `1px solid ${theme.border}`,
                borderRadius: theme.radiusSm,
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                boxShadow: theme.shadow,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={theme.inkSoft} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="8" y1="6" x2="21" y2="6" />
                  <line x1="8" y1="12" x2="21" y2="12" />
                  <line x1="8" y1="18" x2="21" y2="18" />
                  <line x1="3" y1="6" x2="3.01" y2="6" />
                  <line x1="3" y1="12" x2="3.01" y2="12" />
                  <line x1="3" y1="18" x2="3.01" y2="18" />
                </svg>
                <span style={{ fontSize: '14px', fontWeight: '600', color: theme.ink }}>등록 목록</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{
                  fontSize: '12px', fontWeight: '700', color: theme.primary,
                  background: theme.primarySoft,
                  padding: '2px 10px', borderRadius: theme.radiusFull,
                }}>
                  {photos.length}
                </span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={theme.inkMuted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m9 18 6-6-6-6" />
                </svg>
              </div>
            </button>

            {/* ── Go to letters button ── */}
            <button
              type="button"
              className="btn-press"
              onClick={() => { setView('letters'); window.scrollTo({ top: 0 }); }}
              style={{
                width: '100%', marginTop: '8px',
                padding: '15px',
                background: theme.card,
                border: `1px solid ${theme.border}`,
                borderRadius: theme.radiusSm,
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                boxShadow: theme.shadow,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '16px' }}>✉️</span>
                <span style={{ fontSize: '14px', fontWeight: '600', color: theme.ink }}>편지 관리</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{
                  fontSize: '12px', fontWeight: '700', color: theme.primary,
                  background: theme.primarySoft,
                  padding: '2px 10px', borderRadius: theme.radiusFull,
                }}>
                  {adminLetters.length}
                </span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={theme.inkMuted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m9 18 6-6-6-6" />
                </svg>
              </div>
            </button>

            {/* ── Go to folders button ── */}
            <button
              type="button"
              className="btn-press"
              onClick={() => { setView('folders'); window.scrollTo({ top: 0 }); }}
              style={{
                width: '100%', marginTop: '8px',
                padding: '15px',
                background: theme.card,
                border: `1px solid ${theme.border}`,
                borderRadius: theme.radiusSm,
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                boxShadow: theme.shadow,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '16px' }}>📁</span>
                <span style={{ fontSize: '14px', fontWeight: '600', color: theme.ink }}>폴더 관리</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{
                  fontSize: '12px', fontWeight: '700', color: theme.primary,
                  background: theme.primarySoft,
                  padding: '2px 10px', borderRadius: theme.radiusFull,
                }}>
                  {folders.length}
                </span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={theme.inkMuted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m9 18 6-6-6-6" />
                </svg>
              </div>
            </button>
          </>
        ) : view === 'list' ? (
          <>
            {/* ── List View ── */}
            <button
              type="button"
              className="btn-press"
              onClick={() => { setView('register'); setEditIndex(null); setEditData(null); window.scrollTo({ top: 0 }); }}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                background: 'none', border: 'none', cursor: 'pointer',
                padding: '0 0 14px', color: theme.inkSoft, fontSize: '14px', fontWeight: '500',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m15 18-6-6 6-6" />
              </svg>
              사진 등록으로 돌아가기
            </button>

            {photos.length === 0 ? (
              <div style={{
                background: theme.card,
                borderRadius: theme.radius,
                boxShadow: theme.shadow,
                padding: '48px 20px',
                textAlign: 'center',
              }}>
                <div style={{ fontSize: '32px', marginBottom: '10px', opacity: 0.4 }}>📸</div>
                <p style={{ fontSize: '13px', color: theme.inkMuted, margin: 0, lineHeight: 1.6 }}>
                  아직 등록한 사진이 없어요<br />
                  사진을 추가해 보세요
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {photos
                  .map((item, index) => ({ item, index }))
                  .slice(listPage * PER_PAGE, (listPage + 1) * PER_PAGE)
                  .map(({ item, index }) => (
                  <div key={index}>
                    {/* Card row */}
                    <div className="photo-card" style={{
                      background: theme.card,
                      borderRadius: editIndex === index ? `${theme.radiusSm} ${theme.radiusSm} 0 0` : theme.radiusSm,
                      boxShadow: theme.shadow,
                      padding: '12px',
                      display: 'flex', alignItems: 'center', gap: '12px',
                    }}>
                      <div style={{
                        width: '52px', height: '52px',
                        borderRadius: '8px',
                        overflow: 'hidden',
                        background: '#F1EDE6',
                        flexShrink: 0,
                      }}>
                        {isImageFile(item.url) ? (
                          <img src={item.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', color: theme.inkMuted }}>▶</div>
                        )}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}
                        onClick={() => {
                          if (editIndex === index) {
                            setEditIndex(null);
                            setEditData(null);
                            setEditParent('');
                          } else {
                            setEditIndex(index);
                            setEditData({ ...item });
                            setEditParent('');
                          }
                        }}
                      >
                        <div style={{
                          fontSize: '14px', fontWeight: '600', color: theme.ink,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>{item.title}</div>
                        <div style={{ fontSize: '12px', color: theme.inkMuted, marginTop: '3px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span>{item.date}</span>
                          <span style={{
                            background: theme.primarySoft, color: theme.primary,
                            fontSize: '10px', fontWeight: '600',
                            padding: '1px 7px', borderRadius: theme.radiusFull,
                          }}>{folderLabels[item.folderId] || item.folderId}</span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                        <button onClick={() => {
                          setEditParent('');
                          if (editIndex === index) { setEditIndex(null); setEditData(null); }
                          else { setEditIndex(index); setEditData({ ...item }); }
                        }} className="btn-press" style={{
                          width: '32px', height: '32px',
                          background: editIndex === index ? theme.primarySoft : theme.borderLight,
                          border: 'none', borderRadius: '8px',
                          color: editIndex === index ? theme.primary : theme.inkMuted,
                          fontSize: '13px', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                          </svg>
                        </button>
                        <button onClick={() => handleDelete(index)} className="btn-press" style={{
                          width: '32px', height: '32px',
                          background: theme.dangerSoft,
                          border: 'none', borderRadius: '8px',
                          color: theme.danger, fontSize: '14px',
                          cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          ✕
                        </button>
                      </div>
                    </div>

                    {/* Edit panel */}
                    {editIndex === index && editData && (
                      <div className="scale-in" style={{
                        background: theme.card,
                        borderTop: `1px solid ${theme.border}`,
                        borderRadius: `0 0 ${theme.radiusSm} ${theme.radiusSm}`,
                        padding: '14px',
                        boxShadow: theme.shadow,
                      }}>
                        <div style={{ marginBottom: '10px' }}>
                          <label style={{ fontSize: '11px', fontWeight: '600', color: theme.inkSoft, display: 'block', marginBottom: '4px' }}>제목</label>
                          <input type="text" value={editData.title}
                            onChange={e => setEditData({ ...editData, title: e.target.value })}
                            className="input-field"
                            style={{ width: '100%', padding: '10px 12px', fontSize: '14px', borderRadius: '8px', border: `1.5px solid ${theme.border}`, background: theme.bg, outline: 'none' }}
                          />
                        </div>
                        <div style={{ marginBottom: '10px' }}>
                          <label style={{ fontSize: '11px', fontWeight: '600', color: theme.inkSoft, display: 'block', marginBottom: '4px' }}>날짜</label>
                          <input type="date" value={editData.date}
                            onChange={e => setEditData({ ...editData, date: e.target.value })}
                            className="input-field"
                            style={{ width: '100%', padding: '10px 12px', fontSize: '14px', borderRadius: '8px', border: `1.5px solid ${theme.border}`, background: theme.bg, outline: 'none' }}
                          />
                        </div>
                        <div style={{ marginBottom: '12px' }}>
                          <label style={{ fontSize: '11px', fontWeight: '600', color: theme.inkSoft, display: 'block', marginBottom: '6px' }}>폴더</label>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <select
                              value={resolveParent(editParent, editData.folderId)}
                              onChange={e => {
                                const pid = e.target.value;
                                setEditParent(pid);
                                const first = childrenOf(pid)[0];
                                setEditData({ ...editData, folderId: first ? String(first.id) : '' });
                              }}
                              style={{ ...selectStyle, padding: '9px 10px', fontSize: '13px' }}
                            >
                              {parentFolders.length === 0 && <option value="">상위폴더 없음</option>}
                              {parentFolders.map(f => (
                                <option key={f.id} value={f.id}>{f.name}</option>
                              ))}
                            </select>

                            <select
                              value={String(editData.folderId || '')}
                              onChange={e => setEditData({ ...editData, folderId: e.target.value })}
                              style={{ ...selectStyle, padding: '9px 10px', fontSize: '13px' }}
                            >
                              {childrenOf(resolveParent(editParent, editData.folderId)).length === 0
                                ? <option value="">하위폴더 없음</option>
                                : childrenOf(resolveParent(editParent, editData.folderId)).map(f => (
                                    <option key={f.id} value={f.id}>{f.name}</option>
                                  ))}
                            </select>
                          </div>
                        </div>
                        {/* Cover image toggle — 이 폴더 / 상위폴더 */}
                        {isImageFile(item.url) && (() => {
                          const fid = String(editData?.folderId || item.folderId || '');
                          const parent = parentOf(fid);
                          const targets = [{ id: fid, kind: '이 폴더', name: findFolder(fid)?.name }];
                          if (parent) targets.push({ id: String(parent.id), kind: '상위폴더', name: parent.name });

                          return (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '10px' }}>
                              {targets.map(target => {
                                const on = covers[target.id] === item.url;
                                return (
                                  <button key={target.id} className="btn-press"
                                    onClick={() => toggleCover(target.id, item.url)}
                                    style={{
                                      width: '100%', padding: '10px',
                                      fontSize: '13px', fontWeight: '600',
                                      background: on ? theme.successSoft : theme.borderLight,
                                      color: on ? theme.success : theme.inkSoft,
                                      border: `1.5px solid ${on ? theme.success : theme.border}`,
                                      borderRadius: '8px', cursor: 'pointer',
                                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                                    }}
                                  >
                                    {on
                                      ? `★ ${target.kind} 대표 이미지 해제`
                                      : `☆ ${target.kind}${target.name ? `(${target.name})` : ''} 대표 이미지로`}
                                  </button>
                                );
                              })}
                            </div>
                          );
                        })()}

                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button className="btn-press" onClick={() => { setEditIndex(null); setEditData(null); }}
                            style={{ flex: 1, padding: '10px', fontSize: '13px', fontWeight: '600', background: theme.borderLight, color: theme.inkSoft, border: 'none', borderRadius: '8px', cursor: 'pointer' }}
                          >취소</button>
                          <button className="btn-press" onClick={() => {
                            if (!editData.title || !editData.date) { showToast('제목과 날짜를 입력해 주세요'); return; }
                            const updated = [...photos];
                            updated[index] = editData;
                            setPhotos(updated);
                            setEditIndex(null);
                            setEditData(null);
                            showToast('수정했어요');
                          }}
                            style={{ flex: 1, padding: '10px', fontSize: '13px', fontWeight: '600', background: theme.primary, color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
                          >수정 완료</button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {/* Pagination */}
                {photos.length > PER_PAGE && (
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    gap: '8px', marginTop: '12px', flexWrap: 'wrap',
                  }}>
                    <button
                      className="btn-press"
                      disabled={listPage === 0}
                      onClick={() => { setListPage(p => Math.max(0, p - 1)); setEditIndex(null); setEditData(null); window.scrollTo({ top: 0 }); }}
                      style={{
                        width: '34px', height: '34px', borderRadius: '8px',
                        border: 'none', cursor: listPage === 0 ? 'default' : 'pointer',
                        background: listPage === 0 ? theme.borderLight : theme.card,
                        color: listPage === 0 ? theme.inkMuted : theme.ink,
                        boxShadow: listPage === 0 ? 'none' : theme.shadow,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        opacity: listPage === 0 ? 0.5 : 1,
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
                    </button>

                    <span style={{ fontSize: '13px', fontWeight: '600', color: theme.inkSoft, minWidth: '54px', textAlign: 'center' }}>
                      {listPage + 1} / {Math.ceil(photos.length / PER_PAGE)}
                    </span>

                    <button
                      className="btn-press"
                      disabled={listPage >= Math.ceil(photos.length / PER_PAGE) - 1}
                      onClick={() => { setListPage(p => Math.min(Math.ceil(photos.length / PER_PAGE) - 1, p + 1)); setEditIndex(null); setEditData(null); window.scrollTo({ top: 0 }); }}
                      style={{
                        width: '34px', height: '34px', borderRadius: '8px',
                        border: 'none',
                        cursor: listPage >= Math.ceil(photos.length / PER_PAGE) - 1 ? 'default' : 'pointer',
                        background: listPage >= Math.ceil(photos.length / PER_PAGE) - 1 ? theme.borderLight : theme.card,
                        color: listPage >= Math.ceil(photos.length / PER_PAGE) - 1 ? theme.inkMuted : theme.ink,
                        boxShadow: listPage >= Math.ceil(photos.length / PER_PAGE) - 1 ? 'none' : theme.shadow,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        opacity: listPage >= Math.ceil(photos.length / PER_PAGE) - 1 ? 0.5 : 1,
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        ) : view === 'letters' ? (
          <>
            {/* ── Letters View ── */}
            <button
              type="button"
              className="btn-press"
              onClick={() => { setView('register'); window.scrollTo({ top: 0 }); }}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                background: 'none', border: 'none', cursor: 'pointer',
                padding: '0 0 14px', color: theme.inkSoft, fontSize: '14px', fontWeight: '500',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m15 18-6-6 6-6" />
              </svg>
              사진 등록으로 돌아가기
            </button>

            {adminLetters.length === 0 ? (
              <div style={{
                background: theme.card,
                borderRadius: theme.radius,
                boxShadow: theme.shadow,
                padding: '48px 20px',
                textAlign: 'center',
              }}>
                <div style={{ fontSize: '32px', marginBottom: '10px', opacity: 0.4 }}>✉️</div>
                <p style={{ fontSize: '13px', color: theme.inkMuted, margin: 0, lineHeight: 1.6 }}>
                  아직 편지가 없어요
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {adminLetters.map((letter, idx) => (
                  <div key={letter.id || idx} style={{
                    background: theme.card,
                    borderRadius: theme.radiusSm,
                    boxShadow: theme.shadow,
                    padding: '14px',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '14px', fontWeight: '600', color: theme.ink }}>{letter.author}</span>
                        {letter.private && (
                          <span style={{ fontSize: '10px', color: theme.success, background: theme.successSoft, padding: '2px 7px', borderRadius: theme.radiusFull, fontWeight: '600' }}>
                            🔒 비공개
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '11px', color: theme.inkMuted }}>{letter.date}</span>
                        <button className="btn-press" onClick={async () => {
                          if (!window.confirm('이 편지를 삭제하시겠습니까?')) return;
                          try {
                            await fetch('/functions/api/letters/delete', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ password, id: letter.id })
                            });
                            setAdminLetters(adminLetters.filter(l => l.id !== letter.id));
                            showToast('편지를 삭제했어요');
                          } catch (_) {
                            showToast('삭제 실패');
                          }
                        }} style={{
                          width: '28px', height: '28px',
                          background: theme.dangerSoft, border: 'none', borderRadius: '6px',
                          color: theme.danger, fontSize: '12px', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>✕</button>
                      </div>
                    </div>
                    <div style={{
                      fontSize: '13px', color: theme.ink,
                      lineHeight: 1.7, whiteSpace: 'pre-wrap',
                    }}>
                      {letter.content}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            {/* ── Folders View ── */}
            <button
              type="button"
              className="btn-press"
              onClick={() => { setView('register'); window.scrollTo({ top: 0 }); }}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                background: 'none', border: 'none', cursor: 'pointer',
                padding: '0 0 14px', color: theme.inkSoft, fontSize: '14px', fontWeight: '500',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m15 18-6-6 6-6" />
              </svg>
              사진 등록으로 돌아가기
            </button>

            {/* 상위폴더 만들기 */}
            <div style={{
              background: theme.card,
              borderRadius: theme.radius,
              boxShadow: theme.shadow,
              padding: '16px',
              marginBottom: '12px',
            }}>
              <label style={{ fontSize: '12px', fontWeight: '600', color: theme.inkSoft, display: 'block', marginBottom: '8px' }}>
                상위폴더 만들기
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  placeholder="예: 1세, 2세"
                  value={newFolderName}
                  onChange={e => setNewFolderName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleAddParentFolder(); }}
                  className="input-field"
                  style={{
                    flex: 1, minWidth: 0, padding: '11px 12px', fontSize: '14px',
                    borderRadius: '8px', border: `1.5px solid ${theme.border}`,
                    background: theme.bg, outline: 'none',
                  }}
                />
                <button className="btn-press" onClick={handleAddParentFolder} style={{
                  padding: '0 18px', fontSize: '14px', fontWeight: '600',
                  background: theme.primary, color: '#fff', border: 'none',
                  borderRadius: '8px', cursor: 'pointer', flexShrink: 0,
                }}>추가</button>
              </div>
            </div>

            {/* 하위폴더 만들기 */}
            <div style={{
              background: theme.card,
              borderRadius: theme.radius,
              boxShadow: theme.shadow,
              padding: '16px',
              marginBottom: '16px',
            }}>
              <label style={{ fontSize: '12px', fontWeight: '600', color: theme.inkSoft, display: 'block', marginBottom: '8px' }}>
                하위폴더 만들기
              </label>
              <select
                value={String(newChildParent || parentFolders[0]?.id || '')}
                onChange={e => setNewChildParent(e.target.value)}
                style={{ ...selectStyle, width: '100%', marginBottom: '8px' }}
              >
                {parentFolders.length === 0
                  ? <option value="">먼저 상위폴더를 만들어 주세요</option>
                  : parentFolders.map(f => (
                      <option key={f.id} value={f.id}>{f.name} 안에</option>
                    ))}
              </select>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  placeholder="예: 7개월, 첫 여행"
                  value={newChildName}
                  onChange={e => setNewChildName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleAddChildFolder(); }}
                  className="input-field"
                  style={{
                    flex: 1, minWidth: 0, padding: '11px 12px', fontSize: '14px',
                    borderRadius: '8px', border: `1.5px solid ${theme.border}`,
                    background: theme.bg, outline: 'none',
                  }}
                />
                <button className="btn-press" onClick={handleAddChildFolder}
                  disabled={parentFolders.length === 0}
                  style={{
                    padding: '0 18px', fontSize: '14px', fontWeight: '600',
                    background: parentFolders.length === 0 ? theme.borderLight : theme.primary,
                    color: parentFolders.length === 0 ? theme.inkMuted : '#fff',
                    border: 'none', borderRadius: '8px',
                    cursor: parentFolders.length === 0 ? 'default' : 'pointer', flexShrink: 0,
                  }}>추가</button>
              </div>
            </div>

            {/* 폴더 목록 — 상위폴더 아래 하위폴더 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {parentFolders.map((parent) => {
                const kids = childrenOf(parent.id);
                const parentCount = photos.filter(ph =>
                  [parent.id, ...kids.map(k => k.id)].some(sid => sameId(sid, ph.folderId))
                ).length;

                return (
                  <div key={parent.id}>
                    {/* 상위폴더 */}
                    <div style={{
                      background: theme.card,
                      borderRadius: theme.radiusSm,
                      boxShadow: theme.shadow,
                      padding: '12px 14px',
                      display: 'flex', alignItems: 'center', gap: '10px',
                      border: `1.5px solid ${theme.borderLight}`,
                    }}>
                      <span style={{ fontSize: '18px' }}>🗂️</span>
                      <input
                        type="text"
                        defaultValue={parent.name}
                        onBlur={e => {
                          const v = e.target.value.trim();
                          if (v && v !== parent.name) handleRenameFolder(parent.id, v);
                        }}
                        className="input-field"
                        style={{
                          flex: 1, minWidth: 0, padding: '8px 10px', fontSize: '14px', fontWeight: '700',
                          color: theme.ink, borderRadius: '6px',
                          border: '1.5px solid transparent', background: 'transparent', outline: 'none',
                        }}
                      />
                      <span style={{
                        fontSize: '11px', color: theme.inkMuted,
                        background: theme.borderLight, padding: '2px 8px',
                        borderRadius: theme.radiusFull, flexShrink: 0,
                      }}>{kids.length}폴더 · {parentCount}개</span>
                      <button className="btn-press" onClick={() => handleDeleteFolder(parent.id)} style={{
                        width: '30px', height: '30px',
                        background: theme.dangerSoft, border: 'none', borderRadius: '7px',
                        color: theme.danger, fontSize: '13px', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      }}>✕</button>
                    </div>

                    {/* 하위폴더 */}
                    {kids.length === 0 ? (
                      <div style={{
                        fontSize: '11px', color: theme.inkMuted,
                        padding: '8px 0 0 30px',
                      }}>
                        하위폴더가 없어요
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px', paddingLeft: '20px' }}>
                        {kids.map((folder) => {
                          const count = photos.filter(ph => sameId(ph.folderId, folder.id)).length;
                          return (
                            <div key={folder.id} style={{
                              background: theme.card,
                              borderRadius: theme.radiusSm,
                              boxShadow: theme.shadow,
                              padding: '10px 12px',
                              display: 'flex', alignItems: 'center', gap: '8px',
                            }}>
                              <span style={{ fontSize: '15px' }}>📁</span>
                              <input
                                type="text"
                                defaultValue={folder.name}
                                onBlur={e => {
                                  const v = e.target.value.trim();
                                  if (v && v !== folder.name) handleRenameFolder(folder.id, v);
                                }}
                                className="input-field"
                                style={{
                                  flex: 1, minWidth: 0, padding: '7px 9px', fontSize: '13px', fontWeight: '600',
                                  color: theme.ink, borderRadius: '6px',
                                  border: '1.5px solid transparent', background: 'transparent', outline: 'none',
                                }}
                              />
                              <span style={{
                                fontSize: '11px', color: theme.inkMuted,
                                background: theme.borderLight, padding: '2px 8px',
                                borderRadius: theme.radiusFull, flexShrink: 0,
                              }}>{count}개</span>
                              <button className="btn-press" onClick={() => handleDeleteFolder(folder.id)} style={{
                                width: '28px', height: '28px',
                                background: theme.dangerSoft, border: 'none', borderRadius: '7px',
                                color: theme.danger, fontSize: '12px', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                              }}>✕</button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <p style={{ fontSize: '11px', color: theme.inkMuted, marginTop: '12px', lineHeight: 1.6, textAlign: 'center' }}>
              폴더 이름을 눌러 수정할 수 있어요.<br />상위폴더를 지우면 그 안의 하위폴더도 함께 지워집니다.<br />변경사항은 자동으로 저장됩니다.
            </p>
          </>
        )}
      </div>

      {/* Toast */}
      {toast && <Toast message={toast} />}
    </div>
  );
}

function Toast({ message }) {
  return (
    <div className="fade-up" style={{
      position: 'fixed',
      bottom: '32px', left: '50%',
      transform: 'translateX(-50%)',
      background: 'rgba(28,25,23,0.88)',
      backdropFilter: 'blur(8px)',
      color: 'white',
      padding: '12px 24px',
      borderRadius: '9999px',
      fontSize: '13px',
      fontWeight: '500',
      zIndex: 100,
      boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
      whiteSpace: 'nowrap',
    }}>
      {message}
    </div>
  );
}
