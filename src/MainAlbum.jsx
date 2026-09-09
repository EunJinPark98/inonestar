import React, { useState, useEffect, useMemo, useRef } from 'react';

// parentId 가 null 이면 상위폴더, 값이 있으면 그 폴더의 하위폴더.
const DEFAULT_FOLDERS = [
  { id: 8, name: '0세', label: '0세', parentId: null },
  { id: 1, name: '신생아', label: '0개월', parentId: 8 },
  { id: 2, name: '1개월', label: '1개월', parentId: 8 },
  { id: 3, name: '2개월', label: '2개월', parentId: 8 },
  { id: 4, name: '3개월', label: '3개월', parentId: 8 },
  { id: 5, name: '4개월', label: '4개월', parentId: 8 },
  { id: 6, name: '5개월', label: '5개월', parentId: 8 },
  { id: 7, name: '6개월', label: '6개월', parentId: 8 },
];

const isParent = (f) => f.parentId === null || f.parentId === undefined;
const sameId = (a, b) => Number(a) === Number(b);

const isImage = (url) => /\.(jpe?g|png|gif|webp|heic|heif)$/i.test(url || '');

const R2_BASE = 'https://pub-1b703dcc28274ffc8bea84f2cdabeaf5.r2.dev/';
const getVideoUrl = (url) => {
  if (!url || isImage(url)) return url;
  const key = url.replace(R2_BASE, '');
  return '/functions/api/video/' + key;
};

const PAGE_SIZE = 15;

const parseDate = (d) => new Date((d || '').replace(/\./g, '-'));

const sortByDate = (items) =>
  [...items].sort((a, b) => {
    const diff = parseDate(a.date) - parseDate(b.date);
    if (diff !== 0) return diff;
    // 같은 날짜면 먼저 올린 것이 위로 오도록 업로드 시간 오름차순.
    // uploadedAt이 없는 옛 기록은 가장 먼저 올라간 것으로 취급한다.
    return (a.uploadedAt || 0) - (b.uploadedAt || 0);
  });

const t = {
  bg: '#FAF8F5',
  card: '#FFFFFF',
  accent: '#B8734A',
  accentSoft: '#F1E4D8',
  ink: '#2C2520',
  inkSoft: '#7A6E65',
  inkMuted: '#B5ADA6',
  border: '#EDE8E2',
  sage: '#7C8A6E',
  sageSoft: '#E8EDE4',
  warm1: '#F6F0EA',
  warm2: '#EDE4DA',
  shadow: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.03)',
  shadowMd: '0 4px 16px rgba(0,0,0,0.06)',
};

const Styles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@300;400;500;600;700&family=Inter:wght@300;400;500;600;700&display=swap');

    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    .album-root {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      -webkit-font-smoothing: antialiased;
      -webkit-tap-highlight-color: transparent;
      background: ${t.bg};
      min-height: 100vh;
      overflow-x: hidden;
    }

    .serif { font-family: 'Noto Serif KR', 'Georgia', serif; }

    @keyframes fadeUp {
      from { opacity: 0; transform: translateY(14px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    @keyframes shimmer {
      0%   { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }

    .fade-up  { animation: fadeUp 0.24s ease both; }

    .folder-card {
      transition: all 0.2s ease;
      cursor: pointer;
    }
    .folder-card:active {
      transform: scale(0.97);
    }

    .photo-entry {
      animation: fadeUp 0.24s ease both;
    }

    .back-btn {
      transition: all 0.2s ease;
      cursor: pointer;
    }
    .back-btn:active {
      transform: scale(0.95);
    }

    .img-loading {
      background: linear-gradient(90deg, ${t.warm1} 25%, ${t.warm2} 50%, ${t.warm1} 75%);
      background-size: 200% 100%;
      animation: shimmer 1.8s ease-in-out infinite;
    }

    .scroll-btn {
      width: 38px; height: 38px;
      border-radius: 50%;
      border: none;
      background: rgba(255,255,255,0.9);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      box-shadow: 0 2px 10px rgba(0,0,0,0.12);
      color: ${t.inkSoft};
      cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      transition: all 0.2s ease;
    }
    .scroll-btn:active {
      transform: scale(0.9);
    }
  `}</style>
);

export default function MainAlbum() {
  const [currentParent, setCurrentParent] = useState(null);
  const [currentFolder, setCurrentFolder] = useState(null);
  const [page, setPage] = useState('album');
  const [photos, setPhotos] = useState([]);
  const [covers, setCovers] = useState({});
  const [letters, setLetters] = useState([]);
  const [folders, setFolders] = useState(DEFAULT_FOLDERS);

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
      .then(data => setLetters(data || []))
      .catch(() => {});
    fetch('/functions/api/folders')
      .then(res => res.json())
      .then(data => { if (Array.isArray(data) && data.length) setFolders(data); })
      .catch(() => {});
  }, []);

  // NEW 배지 기준 시각. 렌더마다 한 번만 읽어 화면 전체가 같은 기준을 쓴다.
  const now = Date.now();
  const isNew = (ts) => Boolean(ts) && now - ts < 24 * 60 * 60 * 1000;
  const hasNewLetter = letters.some(l => isNew(l.id));

  const allFolderItems = useMemo(() => {
    const result = {};
    folders.forEach(f => {
      const dynamicItems = photos.filter(item => Number(item.folderId) === Number(f.id));
      result[f.id] = sortByDate(dynamicItems);
    });
    return result;
  }, [photos, folders]);

  const parentFolders = useMemo(() => folders.filter(isParent), [folders]);

  const childrenByParent = useMemo(() => {
    const map = {};
    parentFolders.forEach(p => { map[p.id] = []; });
    folders.forEach(f => {
      if (isParent(f)) return;
      if (!map[f.parentId]) map[f.parentId] = [];
      map[f.parentId].push(f);
    });
    return map;
  }, [folders, parentFolders]);

  const currentItems = currentFolder ? (allFolderItems[currentFolder] || []) : [];
  const selectedFolder = folders.find(f => sameId(f.id, currentFolder));
  const selectedParent = folders.find(f => sameId(f.id, currentParent));
  const currentChildren = currentParent !== null ? (childrenByParent[currentParent] || []) : [];

  // 폴더 목록의 작은 썸네일에 원본 사진을 쓰면 장당 수 MB가 오간다.
  // 업로드할 때 만들어 둔 작은 썸네일이 있으면 그걸 쓴다.
  const thumbByUrl = useMemo(() => {
    const map = {};
    photos.forEach(item => { if (item.thumb) map[item.url] = item.thumb; });
    return map;
  }, [photos]);

  const getCoverImage = (folderId) => {
    const chosen = covers[String(folderId)];
    if (chosen) return thumbByUrl[chosen] || chosen;

    const items = allFolderItems[folderId] || [];
    const img = items.find(item => isImage(item.url));
    return img ? (img.thumb || img.url) : null;
  };

  // 화면을 바로 바꾼다. 예전에는 전체를 흐리게 했다가 되돌리느라
  // 하위폴더가 보이기까지 시간이 더 걸렸다. 등장 효과는 카드별 애니메이션이 맡는다.
  const transitionTo = (fn) => {
    fn();
    window.scrollTo({ top: 0 });
  };

  const openParent = (id) => transitionTo(() => setCurrentParent(id));
  const openFolder = (id) => transitionTo(() => setCurrentFolder(id));
  const backToParents = () => transitionTo(() => { setCurrentParent(null); setCurrentFolder(null); });
  const backToChildren = () => transitionTo(() => setCurrentFolder(null));

  const goToPage = (p) => transitionTo(() => {
    setPage(p);
    setCurrentParent(null);
    setCurrentFolder(null);
  });

  return (
    <div className="album-root">
      <Styles />
      {page === 'letters' ? (
        <LettersView onBack={() => goToPage('album')} />
      ) : currentFolder !== null ? (
        <PhotoDetailView
          key={selectedFolder?.id}
          folder={selectedFolder}
          parent={selectedParent}
          items={currentItems}
          onBack={backToChildren}
        />
      ) : currentParent !== null ? (
        <ChildFolderView
          parent={selectedParent}
          folders={currentChildren}
          isNew={isNew}
          allFolderItems={allFolderItems}
          getCoverImage={getCoverImage}
          onSelect={openFolder}
          onBack={backToParents}
        />
      ) : (
        <FolderListView
          parents={parentFolders}
          childrenByParent={childrenByParent}
          isNew={isNew}
          allFolderItems={allFolderItems}
          getCoverImage={getCoverImage}
          onSelect={openParent}
          onLetters={() => goToPage('letters')}
          hasNewLetter={hasNewLetter}
        />
      )}
    </div>
  );
}

/* ═══════════════════════════════════
   Folder List (Home)
   ═══════════════════════════════════ */
function FolderListView({ parents, childrenByParent, allFolderItems, getCoverImage, isNew, onSelect, onLetters, hasNewLetter }) {
  // 상위폴더의 기록 수·커버·NEW 여부는 하위폴더들을 합쳐서 구한다.
  const summarize = (parent) => {
    const kids = childrenByParent[parent.id] || [];
    const scope = kids.length ? kids : [parent];
    let count = 0;
    let hasNew = false;
    let cover = getCoverImage(parent.id);

    scope.forEach(f => {
      const items = allFolderItems[f.id] || [];
      count += items.length;
      if (!cover) cover = getCoverImage(f.id);
      if (items.some(i => isNew(i.uploadedAt))) hasNew = true;
    });

    return { count, cover, hasNew, childCount: kids.length };
  };

  return (
    <div style={{ maxWidth: '520px', margin: '0 auto' }}>

      {/* Hero */}
      <div className="fade-up" style={{
        padding: '60px 28px 44px',
        textAlign: 'center',
      }}>
        {/* Decorative line accent */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: '14px', marginBottom: '20px',
        }}>
          <div style={{ width: '28px', height: '1px', background: t.accent, opacity: 0.4 }} />
          <div style={{
            fontSize: '9px', fontWeight: '700',
            letterSpacing: '0.3em',
            color: t.accent,
            textTransform: 'uppercase',
          }}>
            Growth Journal
          </div>
          <div style={{ width: '28px', height: '1px', background: t.accent, opacity: 0.4 }} />
        </div>

        <h1 className="serif" style={{
          fontSize: '30px',
          fontWeight: '600',
          color: t.ink,
          lineHeight: 1.35,
          margin: '0 0 10px',
        }}>
          한별이 앨범
        </h1>

        <p style={{
          fontSize: '13px',
          color: t.inkMuted,
          lineHeight: 1.6,
          fontWeight: '400',
        }}>
          사랑하는 우리 딸 한별이의 소중한 성장 기록
        </p>
      </div>

      {/* Folder Cards */}
      <div style={{ padding: '0 20px 60px' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '12px',
        }}>
          {parents.map((parent, idx) => {
            const { count, cover, hasNew, childCount } = summarize(parent);

            return (
              <div key={parent.id}
                className="folder-card fade-up"
                style={{
                  animationDelay: `${Math.min(idx, 5) * 0.02}s`,
                  background: t.card,
                  borderRadius: '16px',
                  boxShadow: t.shadow,
                  border: `1px solid ${t.border}`,
                  overflow: 'hidden',
                }}
                onClick={() => onSelect(parent.id)}
              >
                {/* Cover */}
                <div style={{
                  position: 'relative',
                  aspectRatio: '1 / 1',
                  background: cover
                    ? `url(${cover}) center/cover`
                    : `linear-gradient(135deg, ${t.warm1} 0%, ${t.warm2} 100%)`,
                }}>
                  {!cover && (
                    <div style={{
                      position: 'absolute', inset: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: t.inkMuted, opacity: 0.35,
                    }}>
                      <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2" />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <path d="m21 15-5-5L5 21" />
                      </svg>
                    </div>
                  )}

                  {hasNew && (
                    <span style={{
                      position: 'absolute', top: '8px', right: '8px',
                      fontSize: '9px', fontWeight: '700', color: '#fff',
                      background: '#E85D4A', padding: '2px 7px',
                      borderRadius: '9999px', letterSpacing: '0.04em',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
                    }}>
                      NEW
                    </span>
                  )}
                </div>

                {/* Info */}
                <div style={{ padding: '12px 12px 14px' }}>
                  <div className="serif" style={{
                    fontSize: '16px',
                    fontWeight: '500',
                    color: t.ink,
                    lineHeight: 1.3,
                  }}>
                    {parent.name}
                  </div>
                  <div style={{
                    fontSize: '11px',
                    color: t.inkMuted,
                    marginTop: '4px',
                  }}>
                    {childCount > 0
                      ? `폴더 ${childCount}개 · 기록 ${count}개`
                      : (count > 0 ? `${count}개의 기록` : '아직 기록이 없어요')}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Letters button */}
        <div style={{
          marginTop: '48px',
          paddingTop: '32px',
          borderTop: `1px solid ${t.border}`,
          display: 'flex', flexDirection: 'column', alignItems: 'center',
        }}>
          <button className="folder-card" onClick={onLetters} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px',
            padding: '8px 20px',
          }}>
            <div style={{
              position: 'relative',
              width: '56px', height: '56px',
              borderRadius: '16px',
              background: `linear-gradient(145deg, ${t.warm1} 0%, ${t.warm2} 100%)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(0,0,0,0.06)',
            }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={t.accent} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
              </svg>
              {hasNewLetter && (
                <span style={{
                  position: 'absolute', top: '-5px', right: '-5px',
                  fontSize: '9px', fontWeight: '700', color: '#fff',
                  background: '#E85D4A', padding: '2px 6px',
                  borderRadius: '9999px', letterSpacing: '0.04em',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
                }}>
                  NEW
                </span>
              )}
            </div>
            <div style={{ textAlign: 'center' }}>
              <div className="serif" style={{ fontSize: '15px', fontWeight: '500', color: t.ink }}>
                한별이 편지함
              </div>
              <div style={{ fontSize: '11px', color: t.inkMuted, marginTop: '3px' }}>
                사랑하는 마음을 남겨보세요
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════
   Child Folder List — 상위폴더 안의 하위폴더들
   ═══════════════════════════════════ */
function ChildFolderView({ parent, folders, allFolderItems, getCoverImage, isNew, onSelect, onBack }) {
  return (
    <div style={{ maxWidth: '520px', margin: '0 auto' }}>

      {/* Sticky Header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: 'rgba(250,248,245,0.88)',
        backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
        borderBottom: `1px solid ${t.border}`,
      }}>
        <div style={{
          display: 'flex', alignItems: 'center',
          padding: '12px 16px', gap: '12px',
        }}>
          <button className="back-btn" onClick={onBack} style={{
            width: '34px', height: '34px',
            background: t.warm1, border: 'none', borderRadius: '10px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: t.inkSoft,
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>
          <div>
            <div className="serif" style={{ fontSize: '15px', fontWeight: '600', color: t.ink }}>
              {parent?.name}
            </div>
            <div style={{ fontSize: '11px', color: t.inkMuted }}>
              {folders.length}개의 폴더
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding: '20px 16px 60px' }}>
        {folders.length === 0 ? (
          <div className="fade-up" style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{
              width: '56px', height: '56px',
              margin: '0 auto 14px',
              background: t.warm1, borderRadius: '14px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: t.inkMuted,
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" />
              </svg>
            </div>
            <p className="serif" style={{ fontSize: '15px', color: t.inkSoft, lineHeight: 1.6 }}>
              아직 하위 폴더가 없어요
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {folders.map((folder, idx) => {
              const items = allFolderItems[folder.id] || [];
              const count = items.length;
              const cover = getCoverImage(folder.id);
              const hasPhotos = count > 0;
              const hasNew = items.some(item => isNew(item.uploadedAt));

              return (
                <div key={folder.id}
                  className="folder-card fade-up"
                  style={{
                    animationDelay: `${Math.min(idx, 5) * 0.02}s`,
                    background: t.card,
                    borderRadius: '14px',
                    boxShadow: t.shadow,
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'stretch',
                    minHeight: '80px',
                    border: `1px solid ${t.border}`,
                  }}
                  onClick={() => onSelect(folder.id)}
                >
                  {/* Thumbnail */}
                  <div style={{
                    width: '80px',
                    flexShrink: 0,
                    background: cover
                      ? `url(${cover}) center/cover`
                      : `linear-gradient(135deg, ${t.warm1} 0%, ${t.warm2} 100%)`,
                    position: 'relative',
                  }}>
                    {!cover && (
                      <div style={{
                        position: 'absolute', inset: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: t.inkMuted, opacity: 0.35,
                      }}>
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="3" width="18" height="18" rx="2" />
                          <circle cx="8.5" cy="8.5" r="1.5" />
                          <path d="m21 15-5-5L5 21" />
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div style={{
                    flex: 1,
                    padding: '13px 14px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                  }}>
                    <div style={{
                      fontSize: '10px',
                      fontWeight: '600',
                      color: hasPhotos ? t.sage : t.inkMuted,
                      letterSpacing: '0.06em',
                      marginBottom: '3px',
                      textTransform: 'uppercase',
                    }}>
                      {folder.label}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                      <span className="serif" style={{ fontSize: '16px', fontWeight: '500', color: t.ink }}>
                        {folder.name}
                      </span>
                      {hasNew && (
                        <span style={{
                          fontSize: '9px', fontWeight: '700', color: '#fff',
                          background: '#E85D4A', padding: '1px 6px',
                          borderRadius: '9999px', letterSpacing: '0.04em',
                        }}>
                          NEW
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '11px', color: t.inkMuted }}>
                      {hasPhotos ? `${count}개의 기록` : '아직 기록이 없어요'}
                    </div>
                  </div>

                  {/* Arrow */}
                  <div style={{
                    display: 'flex', alignItems: 'center',
                    paddingRight: '14px', color: t.inkMuted,
                  }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m9 18 6-6-6-6" />
                    </svg>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <button className="back-btn" onClick={onBack} style={{
          width: '100%',
          marginTop: '24px',
          padding: '14px',
          background: t.card,
          border: `1px solid ${t.border}`,
          borderRadius: '12px',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
          color: t.inkSoft,
          fontSize: '14px', fontWeight: '500',
          boxShadow: t.shadow,
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6" />
          </svg>
          목록으로 돌아가기
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════
   Photo Detail View
   ═══════════════════════════════════ */
function PhotoDetailView({ folder, parent, items, onBack }) {
  const [page, setPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const current = Math.min(page, totalPages);
  const start = (current - 1) * PAGE_SIZE;
  const pageItems = items.slice(start, start + PAGE_SIZE);

  const goPage = (p) => setPage(p);

  // 페이지를 넘기면 목록 맨 위에서 시작하도록 한다.
  // 부드러운 스크롤은 목록이 길면 몇 초씩 걸리고, 그 사이 화면을 건드리면
  // 중간에 멈춰버려서 바로 이동시킨다. 내용이 바뀐 뒤에 옮겨야 하므로
  // 클릭 핸들러가 아니라 렌더 이후에 처리한다.
  const isFirstPage = useRef(true);
  useEffect(() => {
    if (isFirstPage.current) {
      isFirstPage.current = false;
      return;
    }
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [current]);

  return (
    <div style={{ maxWidth: '520px', margin: '0 auto' }}>

      {/* Sticky Header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: 'rgba(250,248,245,0.88)',
        backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
        borderBottom: `1px solid ${t.border}`,
      }}>
        <div style={{
          display: 'flex', alignItems: 'center',
          padding: '12px 16px',
          gap: '12px',
        }}>
          <button className="back-btn" onClick={onBack} style={{
            width: '34px', height: '34px',
            background: t.warm1,
            border: 'none',
            borderRadius: '10px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: t.inkSoft,
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>
          <div>
            <div className="serif" style={{ fontSize: '15px', fontWeight: '600', color: t.ink }}>
              {folder?.name}
            </div>
            <div style={{ fontSize: '11px', color: t.inkMuted }}>
              {parent?.name ? `${parent.name} · ` : ''}{folder?.label} · {items.length}개의 기록
              {totalPages > 1 && ` · ${start + 1}–${start + pageItems.length}번째`}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '20px 16px 60px' }}>
        {items.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {pageItems.map((item, index) => (
                <PhotoCard key={item.id || start + index} item={item} index={index} />
              ))}
            </div>
            <Pager current={current} total={totalPages} onChange={goPage} />
          </>
        )}

        {/* Bottom back button */}
        {items.length > 0 && (
          <button className="back-btn" onClick={onBack} style={{
            width: '100%',
            marginTop: '24px',
            padding: '14px',
            background: t.card,
            border: `1px solid ${t.border}`,
            borderRadius: '12px',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
            color: t.inkSoft,
            fontSize: '14px', fontWeight: '500',
            boxShadow: t.shadow,
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 18-6-6 6-6" />
            </svg>
            목록으로 돌아가기
          </button>
        )}
      </div>

      <ScrollButtons />
    </div>
  );
}

/* ═══════════════════════════════════
   Pager — 10개씩 나눠 보기
   ═══════════════════════════════════ */
function Pager({ current, total, onChange }) {
  if (total <= 1) return null;

  // 페이지가 많아도 번호는 최대 5개만 보여준다.
  const span = 5;
  const to = Math.min(total, Math.max(1, current - 2) + span - 1);
  const from = Math.max(1, to - span + 1);

  const pages = [];
  for (let p = from; p <= to; p++) pages.push(p);

  const arrowStyle = (disabled) => ({
    width: '34px', height: '34px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: t.card,
    border: `1px solid ${t.border}`,
    borderRadius: '10px',
    color: t.inkSoft,
    cursor: disabled ? 'default' : 'pointer',
    opacity: disabled ? 0.4 : 1,
  });

  const ellipsis = (
    <span style={{ color: t.inkMuted, fontSize: '12px', padding: '0 2px' }}>…</span>
  );

  return (
    <div style={{
      marginTop: '28px',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      gap: '6px', flexWrap: 'wrap',
    }}>
      <button className="back-btn" aria-label="이전 페이지"
        disabled={current === 1}
        onClick={() => onChange(current - 1)}
        style={arrowStyle(current === 1)}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m15 18-6-6 6-6" />
        </svg>
      </button>

      {from > 1 && ellipsis}

      {pages.map(p => (
        <button key={p} className="back-btn"
          onClick={() => onChange(p)}
          aria-current={p === current ? 'page' : undefined}
          style={{
            minWidth: '34px', height: '34px', padding: '0 8px',
            background: p === current ? t.accent : t.card,
            border: `1px solid ${p === current ? t.accent : t.border}`,
            borderRadius: '10px',
            color: p === current ? '#FFFFFF' : t.inkSoft,
            fontSize: '13px',
            fontWeight: p === current ? '700' : '500',
            fontFamily: 'inherit',
            cursor: 'pointer',
          }}
        >
          {p}
        </button>
      ))}

      {to < total && ellipsis}

      <button className="back-btn" aria-label="다음 페이지"
        disabled={current === total}
        onClick={() => onChange(current + 1)}
        style={arrowStyle(current === total)}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m9 18 6-6-6-6" />
        </svg>
      </button>
    </div>
  );
}

/* ═══════════════════════════════════
   Photo Card — caption on top
   ═══════════════════════════════════ */
function PhotoCard({ item, index }) {
  const [loaded, setLoaded] = useState(false);
  const [playing, setPlaying] = useState(false);
  const videoRef = useRef(null);
  const wrapRef = useRef(null);
  const photo = isImage(item.url);
  const hasPoster = Boolean(item.poster);

  // 포스터가 없는 예전 영상은 첫 프레임을 받아 썸네일로 써야 한다.
  // 목록에 들어오자마자 전부 받으면 느리니, 화면에 보일 때만 받는다.
  const [inView, setInView] = useState(
    () => typeof window === 'undefined' || !('IntersectionObserver' in window)
  );
  // 재생을 누르면 포스터가 사라지고 영상 크기 정보가 들어올 때까지 박스가
  // 잠깐 줄었다 커진다. 크기를 미리 붙잡아 두면 흔들리지 않는다.
  const [boxHeight, setBoxHeight] = useState(null);
  const [ratio, setRatio] = useState(null);
  // 재생을 누르면 브라우저가 포스터를 치워버려 첫 프레임이 올 때까지
  // 회색 화면이 뜬다. 실제로 재생이 시작될 때까지 포스터를 덮어 둔다.
  const [started, setStarted] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const needsFrame = !photo && !hasPoster;
  const useFrame = needsFrame && inView;

  const lockBoxHeight = () => {
    const h = videoRef.current?.getBoundingClientRect().height;
    if (h > 0) setBoxHeight(h);
  };

  const startPlay = () => {
    const v = videoRef.current;
    if (!v) return;
    lockBoxHeight();
    setWaiting(true);
    if (useFrame && v.currentTime) v.currentTime = 0;
    v.play();
  };

  // 포스터 비율로 박스를 못박아 두면, 영상이 로드돼도 크기가 변하지 않는다.
  useEffect(() => {
    if (!item.poster) return;
    let alive = true;
    const img = new Image();
    img.onload = () => {
      if (alive && img.naturalWidth && img.naturalHeight) {
        setRatio(img.naturalWidth / img.naturalHeight);
      }
    };
    img.src = item.poster;
    return () => { alive = false; };
  }, [item.poster]);

  useEffect(() => {
    if (!needsFrame || inView) return;
    const el = wrapRef.current;
    if (!el) return;

    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        setInView(true);
        io.disconnect();
      });
    }, { rootMargin: '300px 0px' });

    io.observe(el);
    return () => io.disconnect();
  }, [needsFrame, inView]);

  return (
    <div
      ref={wrapRef}
      className="photo-entry"
      style={{ animationDelay: `${Math.min(index, 5) * 0.02}s` }}
    >
      {/* Caption above media */}
      <div style={{
        padding: '0 2px 8px',
      }}>
        <div style={{
          fontSize: '11px',
          fontWeight: '500',
          color: t.inkMuted,
          letterSpacing: '0.03em',
          marginBottom: '3px',
        }}>
          {item.date}
        </div>
        <div className="serif" style={{
          fontSize: '16px',
          fontWeight: '500',
          color: t.ink,
          lineHeight: 1.4,
        }}>
          {item.title}
        </div>
      </div>

      {/* Media */}
      <div style={{
        position: 'relative',
        // 원본이 도착하기 전에는 작은 썸네일을 먼저 깔아 둔다.
        background: (photo && item.thumb && !loaded)
          ? `url(${item.thumb}) center/cover`
          : t.warm1,
        borderRadius: '14px',
        overflow: 'hidden',
        boxShadow: t.shadowMd,
        minHeight: photo ? '200px' : '200px',
      }}>
        {!loaded && photo && !item.thumb && (
          <div className="img-loading" style={{
            position: 'absolute', inset: 0,
          }} />
        )}

        {photo ? (
          <img
            src={item.url}
            alt={item.title}
            loading="lazy"
            decoding="async"
            onLoad={() => setLoaded(true)}
            style={{
              width: '100%',
              display: 'block',
              opacity: loaded ? 1 : 0,
              transition: 'opacity 0.5s ease',
            }}
          />
        ) : (
          <>
            <video
              ref={videoRef}
              src={getVideoUrl(item.url) + (useFrame ? '#t=0.5' : '')}
              poster={item.poster || undefined}
              preload={useFrame ? 'metadata' : 'none'}
              playsInline
              controls={playing}
              onPlay={() => setPlaying(true)}
              onPlaying={() => { setStarted(true); setWaiting(false); }}
              onPause={() => setPlaying(false)}
              onEnded={() => setPlaying(false)}
              onLoadedMetadata={lockBoxHeight}
              style={{
                width: '100%',
                display: 'block',
                aspectRatio: ratio ? String(ratio) : undefined,
                minHeight: ratio
                  ? undefined
                  : (boxHeight ? `${boxHeight}px` : (hasPoster ? undefined : '220px')),
              }}
            />
            {/* 첫 프레임이 나오기 전까지 포스터를 덮어 회색 화면을 가린다 */}
            {hasPoster && !started && (
              <img
                src={item.poster}
                alt=""
                aria-hidden="true"
                style={{
                  position: 'absolute', inset: 0,
                  width: '100%', height: '100%',
                  objectFit: 'cover',
                  pointerEvents: 'none',
                }}
              />
            )}

            {waiting && (
              <div style={{
                position: 'absolute', inset: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(0,0,0,0.18)',
                pointerEvents: 'none',
              }}>
                <div style={{
                  width: '38px', height: '38px',
                  borderRadius: '50%',
                  border: '3px solid rgba(255,255,255,0.45)',
                  borderTopColor: '#FFFFFF',
                  animation: 'spin 0.8s linear infinite',
                }} />
              </div>
            )}

            {!playing && !waiting && (
              <div
                onClick={startPlay}
                style={{
                  position: 'absolute', inset: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer',
                  background: 'rgba(0,0,0,0.12)',
                }}
              >
                <div style={{
                  width: '52px', height: '52px',
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.92)',
                  backdropFilter: 'blur(4px)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 2px 12px rgba(0,0,0,0.2)',
                }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill={t.accent}>
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════
   Scroll Top / Bottom Buttons
   ═══════════════════════════════════ */
function ScrollButtons() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 300);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (!show) return null;

  return (
    <div style={{
      position: 'fixed',
      right: '16px', bottom: '24px',
      display: 'flex', flexDirection: 'column', gap: '8px',
      zIndex: 20,
    }}>
      <button className="scroll-btn"
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="m18 15-6-6-6 6" />
        </svg>
      </button>
      <button className="scroll-btn"
        onClick={() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
    </div>
  );
}

/* ═══════════════════════════════════
   Empty State
   ═══════════════════════════════════ */
function EmptyState() {
  return (
    <div className="fade-up" style={{
      textAlign: 'center',
      padding: '60px 20px',
    }}>
      <div style={{
        width: '56px', height: '56px',
        margin: '0 auto 14px',
        background: t.warm1,
        borderRadius: '14px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: t.inkMuted,
      }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <path d="m21 15-5-5L5 21" />
        </svg>
      </div>
      <p className="serif" style={{
        fontSize: '15px',
        color: t.inkSoft,
        lineHeight: 1.6,
      }}>
        아직 기록된 순간이 없어요
      </p>
      <p style={{
        fontSize: '12px',
        color: t.inkMuted,
        marginTop: '4px',
      }}>
      </p>
    </div>
  );
}

/* ═══════════════════════════════════
   Letters View
   ═══════════════════════════════════ */
function LettersView({ onBack }) {
  const [letters, setLetters] = useState([]);
  const [author, setAuthor] = useState('');
  const [content, setContent] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState('');

  useEffect(() => {
    fetch('/functions/api/letters')
      .then(res => res.json())
      .then(data => setLetters(data || []))
      .catch(() => {});
  }, []);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!author.trim() || !content.trim()) {
      showToast('이름과 내용을 모두 입력해 주세요');
      return;
    }

    setSending(true);
    try {
      const res = await fetch('/functions/api/letters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ author: author.trim(), content: content.trim(), private: isPrivate })
      });
      const result = await res.json();
      if (result.success) {
        setLetters([{ id: Date.now(), author: author.trim(), content: content.trim(), private: isPrivate, date: new Date().toISOString().split('T')[0] }, ...letters]);
        setContent('');
        setIsPrivate(false);
        showToast('편지를 남겼어요');
      }
    } catch (_) {
      showToast('오류가 발생했어요');
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={{ maxWidth: '520px', margin: '0 auto' }}>

      {/* Header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: 'rgba(250,248,245,0.88)',
        backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
        borderBottom: `1px solid ${t.border}`,
      }}>
        <div style={{
          display: 'flex', alignItems: 'center',
          padding: '12px 16px', gap: '12px',
        }}>
          <button className="back-btn" onClick={onBack} style={{
            width: '34px', height: '34px',
            background: t.warm1, border: 'none', borderRadius: '10px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: t.inkSoft,
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>
          <div>
            <div className="serif" style={{ fontSize: '15px', fontWeight: '600', color: t.ink }}>
              한별이에게 쓰는 편지
            </div>
            <div style={{ fontSize: '11px', color: t.inkMuted }}>
              {letters.length}개의 편지
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding: '20px 16px 60px' }}>

        {/* Write form */}
        <div className="fade-up" style={{
          background: t.card,
          borderRadius: '14px',
          boxShadow: t.shadow,
          border: `1px solid ${t.border}`,
          padding: '18px',
          marginBottom: '24px',
        }}>
          <div className="serif" style={{
            fontSize: '15px', fontWeight: '500', color: t.ink,
            marginBottom: '14px',
          }}>
            편지 쓰기
          </div>
          <form onSubmit={handleSubmit}>
            <input
              type="text"
              placeholder="보내는 사람 (예: 엄마, 아빠, 할머니)"
              value={author}
              onChange={e => setAuthor(e.target.value)}
              style={{
                width: '100%', padding: '11px 12px', fontSize: '14px',
                borderRadius: '8px', border: `1.5px solid ${t.border}`,
                background: t.bg, outline: 'none', marginBottom: '10px',
                boxSizing: 'border-box',
                fontFamily: 'inherit',
              }}
            />
            <textarea
              placeholder="한별이에게 하고 싶은 말을 적어보세요..."
              value={content}
              onChange={e => setContent(e.target.value)}
              rows={4}
              style={{
                width: '100%', padding: '11px 12px', fontSize: '14px',
                borderRadius: '8px', border: `1.5px solid ${t.border}`,
                background: t.bg, outline: 'none', marginBottom: '12px',
                boxSizing: 'border-box', resize: 'vertical',
                fontFamily: 'inherit', lineHeight: 1.6,
              }}
            />
            {/* Public / Private toggle */}
            <div style={{
              display: 'flex', gap: '8px', marginBottom: '12px',
            }}>
              <button type="button" onClick={() => setIsPrivate(false)} style={{
                flex: 1, padding: '10px', fontSize: '13px', fontWeight: '500',
                background: !isPrivate ? t.card : t.bg,
                border: `1.5px solid ${!isPrivate ? t.accent : t.border}`,
                color: !isPrivate ? t.accent : t.inkMuted,
                borderRadius: '8px', cursor: 'pointer', fontFamily: 'inherit',
                transition: 'all 0.15s ease',
              }}>
                전체 공개
              </button>
              <button type="button" onClick={() => setIsPrivate(true)} style={{
                flex: 1, padding: '10px', fontSize: '13px', fontWeight: '500',
                background: isPrivate ? t.card : t.bg,
                border: `1.5px solid ${isPrivate ? t.sage : t.border}`,
                color: isPrivate ? t.sage : t.inkMuted,
                borderRadius: '8px', cursor: 'pointer', fontFamily: 'inherit',
                transition: 'all 0.15s ease',
              }}>
                🔒 한별이만 보기
              </button>
            </div>

            <button type="submit" disabled={sending}
              style={{
                width: '100%', padding: '13px',
                fontSize: '14px', fontWeight: '600',
                background: (author.trim() && content.trim() && !sending) ? t.accent : t.border,
                color: (author.trim() && content.trim() && !sending) ? 'white' : t.inkMuted,
                border: 'none', borderRadius: '10px',
                cursor: (author.trim() && content.trim() && !sending) ? 'pointer' : 'default',
                fontFamily: 'inherit',
                transition: 'all 0.15s ease',
              }}
            >
              {sending ? '보내는 중...' : '편지 남기기'}
            </button>
          </form>
        </div>

        {/* Letters list */}
        {letters.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '48px 20px',
          }}>
            <div style={{ fontSize: '28px', marginBottom: '10px', opacity: 0.5 }}>✉️</div>
            <p className="serif" style={{ fontSize: '15px', color: t.inkSoft }}>
              아직 편지가 없어요
            </p>
            <p style={{ fontSize: '12px', color: t.inkMuted, marginTop: '4px' }}>
              첫 번째 편지를 남겨보세요
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {letters.map((letter, idx) => (
              <div key={letter.id || idx} className="fade-up" style={{
                animationDelay: `${Math.min(idx, 5) * 0.02}s`,
                background: t.card,
                borderRadius: '14px',
                boxShadow: t.shadow,
                border: `1px solid ${t.border}`,
                padding: '18px',
              }}>
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  marginBottom: '10px',
                }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                  }}>
                    <div style={{
                      width: '30px', height: '30px',
                      borderRadius: '50%',
                      background: `linear-gradient(135deg, ${t.accentSoft} 0%, ${t.sageSoft} 100%)`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '13px', fontWeight: '700', color: t.accent,
                    }}>
                      {letter.author.charAt(0)}
                    </div>
                    <span style={{ fontSize: '14px', fontWeight: '600', color: t.ink }}>
                      {letter.author}
                    </span>
                    {letter.id && (Date.now() - letter.id < 24 * 60 * 60 * 1000) && (
                      <span style={{ fontSize: '9px', color: '#fff', background: '#E85D4A', padding: '2px 6px', borderRadius: '9999px', fontWeight: '700', letterSpacing: '0.04em' }}>
                        NEW
                      </span>
                    )}
                    {letter.private && (
                      <span style={{ fontSize: '10px', color: t.sage, background: t.sageSoft, padding: '2px 7px', borderRadius: '9999px', fontWeight: '600' }}>
                        🔒 비공개
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize: '11px', color: t.inkMuted }}>
                    {letter.date}
                  </span>
                </div>
                {letter.private ? (
                  <div style={{
                    fontSize: '13px', color: t.inkMuted,
                    fontStyle: 'italic', lineHeight: 1.6,
                    padding: '12px 0 4px',
                  }}>
                    🔒 한별이만 볼 수 있는 편지예요
                  </div>
                ) : (
                  <div className="serif" style={{
                    fontSize: '14px',
                    color: t.ink,
                    lineHeight: 1.8,
                    whiteSpace: 'pre-wrap',
                  }}>
                    {letter.content}
                  </div>
                )}
                <div style={{ marginTop: '10px', textAlign: 'right' }}>
                  <button onClick={() => {
                    alert('관리자만 삭제할 수 있습니다.\n삭제를 원하시면 한별이 엄마에게 문의해주세요.');
                  }} style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: '11px', color: t.inkMuted, padding: '4px 0',
                    fontFamily: 'inherit',
                  }}>
                    삭제
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {toast && (
        <div className="fade-up" style={{
          position: 'fixed', bottom: '32px', left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(28,25,23,0.88)',
          backdropFilter: 'blur(8px)',
          color: 'white', padding: '12px 24px',
          borderRadius: '9999px', fontSize: '13px', fontWeight: '500',
          zIndex: 100, boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
          whiteSpace: 'nowrap',
        }}>
          {toast}
        </div>
      )}

      <ScrollButtons />
    </div>
  );
}
