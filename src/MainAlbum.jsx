import React, { useState, useEffect, useMemo } from 'react';

const mockData = {
  folders: [
    { id: 1, name: '신생아', label: '0개월' },
    { id: 2, name: '1개월', label: '1개월' },
    { id: 3, name: '2개월', label: '2개월' },
    { id: 4, name: '3개월', label: '3개월' },
    { id: 5, name: '4개월', label: '4개월' },
    { id: 6, name: '5개월', label: '5개월' },
  ],
  videos: {
    1: [
      { id: 101, title: '1월 9일, 탄생', date: '2026.01.09', url: 'https://pub-1b703dcc28274ffc8bea84f2cdabeaf5.r2.dev/_talkv_wy3u265OPu_S0WGwUC7rThjurgJ0N1L8K_talkv_high.mp4' },
      { id: 102, title: '첫 면회', date: '2026.01.10', url: 'https://pub-1b703dcc28274ffc8bea84f2cdabeaf5.r2.dev/IMG_5682.jpeg' },
      { id: 103, title: '조리원 첫 모자동실', date: '2026.01.12', url: 'https://pub-1b703dcc28274ffc8bea84f2cdabeaf5.r2.dev/IMG_5727.jpeg' },
      { id: 104, title: '숙면', date: '2026.01.14', url: 'https://pub-1b703dcc28274ffc8bea84f2cdabeaf5.r2.dev/IMG_5817.jpeg' },
      { id: 105, title: '오~', date: '2026.01.14', url: 'https://pub-1b703dcc28274ffc8bea84f2cdabeaf5.r2.dev/%EC%8B%A0%EC%83%9D%EC%95%84/IMG_5813.jpeg' },
      { id: 106, title: '찡긋', date: '2026.01.16', url: 'https://pub-1b703dcc28274ffc8bea84f2cdabeaf5.r2.dev/IMG_5859.jpeg' },
      { id: 107, title: '아빠품에서', date: '2026.01.16', url: 'https://pub-1b703dcc28274ffc8bea84f2cdabeaf5.r2.dev/IMG_5872.jpeg' },
      { id: 108, title: '너무 예쁜 우리 애기', date: '2026.01.17', url: 'https://pub-1b703dcc28274ffc8bea84f2cdabeaf5.r2.dev/%EC%8B%A0%EC%83%9D%EC%95%84/IMG_5883.jpeg' },
      { id: 109, title: '미소 천사', date: '2026.01.18', url: 'https://pub-1b703dcc28274ffc8bea84f2cdabeaf5.r2.dev/%EC%8B%A0%EC%83%9D%EC%95%84/IMG_5901.jpeg' },
      { id: 110, title: '동글동글', date: '2026.01.22', url: 'https://pub-1b703dcc28274ffc8bea84f2cdabeaf5.r2.dev/IMG_5960.jpeg' },
      { id: 111, title: '초점책 보는 똘망이', date: '2026.01.22', url: 'https://pub-1b703dcc28274ffc8bea84f2cdabeaf5.r2.dev/%EC%8B%A0%EC%83%9D%EC%95%84/IMG_5955.jpeg' },
      { id: 112, title: '부릅', date: '2026.01.24', url: 'https://pub-1b703dcc28274ffc8bea84f2cdabeaf5.r2.dev/%EC%8B%A0%EC%83%9D%EC%95%84/IMG_5987.jpeg' },
      { id: 113, title: '집으로 처음 온 날', date: '2026.01.25', url: 'https://pub-1b703dcc28274ffc8bea84f2cdabeaf5.r2.dev/%EC%8B%A0%EC%83%9D%EC%95%84/IMG_5997.jpeg' },
      { id: 114, title: 'ㄴ', date: '2026.01.27', url: 'https://pub-1b703dcc28274ffc8bea84f2cdabeaf5.r2.dev/%EC%8B%A0%EC%83%9D%EC%95%84/IMG_6008.jpeg' },
      { id: 115, title: 'ss', date: '2026.01.27', url: 'https://pub-1b703dcc28274ffc8bea84f2cdabeaf5.r2.dev/%EC%8B%A0%EC%83%9D%EC%95%84/IMG_6039.jpeg' },
    ],
    2: [], 3: [], 4: [], 5: [], 6: [],
  },
};

const isImage = (url) => /\.(jpe?g|png|gif|webp|heic|heif)$/i.test(url || '');

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
  shadowLg: '0 8px 30px rgba(0,0,0,0.08)',
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

    @keyframes fadeIn {
      from { opacity: 0; }
      to   { opacity: 1; }
    }
    @keyframes fadeUp {
      from { opacity: 0; transform: translateY(16px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes slideIn {
      from { opacity: 0; transform: translateX(20px); }
      to   { opacity: 1; transform: translateX(0); }
    }
    @keyframes heroFloat {
      0%, 100% { transform: translateY(0); }
      50%      { transform: translateY(-6px); }
    }
    @keyframes shimmer {
      0%   { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }

    .fade-in  { animation: fadeIn 0.5s ease both; }
    .fade-up  { animation: fadeUp 0.5s ease both; }
    .slide-in { animation: slideIn 0.4s ease both; }
    .float    { animation: heroFloat 3.5s ease-in-out infinite; }

    .folder-card {
      transition: all 0.2s ease;
      cursor: pointer;
    }
    .folder-card:active {
      transform: scale(0.97);
    }

    .photo-entry {
      animation: fadeUp 0.5s ease both;
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
  `}</style>
);

export default function MainAlbum() {
  const [currentFolder, setCurrentFolder] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [transitioning, setTransitioning] = useState(false);

  useEffect(() => {
    fetch('/functions/api')
      .then(res => res.json())
      .then(data => setPhotos(data || []))
      .catch(() => {});
  }, []);

  const allFolderItems = useMemo(() => {
    const result = {};
    mockData.folders.forEach(f => {
      const staticItems = mockData.videos[f.id] || [];
      const dynamicItems = photos.filter(item => Number(item.folderId) === f.id);
      result[f.id] = [...dynamicItems, ...staticItems];
    });
    return result;
  }, [photos]);

  const currentItems = currentFolder ? (allFolderItems[currentFolder] || []) : [];
  const selectedFolder = mockData.folders.find(f => f.id === currentFolder);

  const getCoverImage = (folderId) => {
    const items = allFolderItems[folderId] || [];
    const img = items.find(item => isImage(item.url));
    return img ? img.url : null;
  };

  const navigateToFolder = (id) => {
    setTransitioning(true);
    setTimeout(() => {
      setCurrentFolder(id);
      setTransitioning(false);
      window.scrollTo({ top: 0 });
    }, 150);
  };

  const navigateBack = () => {
    setTransitioning(true);
    setTimeout(() => {
      setCurrentFolder(null);
      setTransitioning(false);
      window.scrollTo({ top: 0 });
    }, 150);
  };

  return (
    <div className="album-root" style={{ opacity: transitioning ? 0 : 1, transition: 'opacity 0.15s ease' }}>
      <Styles />

      {currentFolder === null ? (
        <FolderListView
          folders={mockData.folders}
          allFolderItems={allFolderItems}
          getCoverImage={getCoverImage}
          onSelect={navigateToFolder}
        />
      ) : (
        <PhotoDetailView
          folder={selectedFolder}
          items={currentItems}
          onBack={navigateBack}
        />
      )}
    </div>
  );
}

/* ═══════════════════════════════════
   Folder List (Home)
   ═══════════════════════════════════ */
function FolderListView({ folders, allFolderItems, getCoverImage, onSelect }) {
  return (
    <div style={{ maxWidth: '520px', margin: '0 auto' }}>

      {/* Hero */}
      <div className="fade-in" style={{
        padding: '56px 28px 40px',
        textAlign: 'center',
        position: 'relative',
      }}>
        <div className="float" style={{
          margin: '0 auto 22px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <StarMark />
        </div>

        <div style={{
          fontSize: '10px', fontWeight: '600',
          letterSpacing: '0.25em',
          color: t.sage,
          textTransform: 'uppercase',
          marginBottom: '12px',
        }}>
          Growth Journal
        </div>

        <h1 className="serif" style={{
          fontSize: '32px',
          fontWeight: '600',
          color: t.ink,
          lineHeight: 1.3,
          margin: '0 0 8px',
        }}>
          한별이 앨범
        </h1>

        <p style={{
          fontSize: '14px',
          color: t.inkMuted,
          lineHeight: 1.6,
        }}>
          사랑하는 우리 딸의 소중한 성장 기록
        </p>
      </div>

      {/* Folder Cards */}
      <div style={{ padding: '0 20px 60px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {folders.map((folder, idx) => {
            const count = (allFolderItems[folder.id] || []).length;
            const cover = getCoverImage(folder.id);
            const hasPhotos = count > 0;

            return (
              <div key={folder.id}
                className="folder-card fade-up"
                style={{
                  animationDelay: `${idx * 0.06}s`,
                  background: t.card,
                  borderRadius: '16px',
                  boxShadow: t.shadow,
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'stretch',
                  minHeight: '88px',
                  border: `1px solid ${t.border}`,
                }}
                onClick={() => onSelect(folder.id)}
              >
                {/* Thumbnail */}
                <div style={{
                  width: '88px',
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
                      fontSize: '24px', opacity: 0.3,
                    }}>📷</div>
                  )}
                </div>

                {/* Info */}
                <div style={{
                  flex: 1,
                  padding: '14px 16px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                }}>
                  <div style={{
                    fontSize: '11px',
                    fontWeight: '600',
                    color: hasPhotos ? t.sage : t.inkMuted,
                    letterSpacing: '0.06em',
                    marginBottom: '4px',
                  }}>
                    {folder.label}
                  </div>
                  <div className="serif" style={{
                    fontSize: '17px',
                    fontWeight: '500',
                    color: t.ink,
                  }}>
                    {folder.name}
                  </div>
                  <div style={{
                    fontSize: '12px',
                    color: t.inkMuted,
                    marginTop: '4px',
                  }}>
                    {hasPhotos ? `${count}개의 기록` : '아직 기록이 없어요'}
                  </div>
                </div>

                {/* Arrow */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  paddingRight: '16px',
                  color: t.inkMuted,
                  fontSize: '18px',
                }}>
                  ›
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════
   Photo Detail View
   ═══════════════════════════════════ */
function PhotoDetailView({ folder, items, onBack }) {
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
            width: '36px', height: '36px',
            background: t.warm1,
            border: 'none',
            borderRadius: '10px',
            fontSize: '18px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: t.inkSoft,
          }}>
            ‹
          </button>
          <div>
            <div className="serif" style={{ fontSize: '16px', fontWeight: '600', color: t.ink }}>
              {folder?.name}
            </div>
            <div style={{ fontSize: '11px', color: t.inkMuted }}>
              {folder?.label} · {items.length}개의 기록
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '20px 16px 60px' }}>
        {items.length === 0 ? (
          <EmptyState />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {items.map((item, index) => (
              <PhotoCard key={item.id || index} item={item} index={index} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════
   Photo Card
   ═══════════════════════════════════ */
function PhotoCard({ item, index }) {
  const [loaded, setLoaded] = useState(false);

  const photo = isImage(item.url);

  return (
    <div
      className="photo-entry"
      style={{ animationDelay: `${index * 0.06}s` }}
    >
      <div style={{
        position: 'relative',
        background: t.card,
        borderRadius: '18px',
        overflow: 'hidden',
        boxShadow: t.shadowMd,
      }}>
        {/* Media */}
        <div style={{
          position: 'relative',
          background: t.warm1,
          minHeight: photo ? '220px' : 'auto',
        }}>
          {!loaded && photo && (
            <div className="img-loading" style={{
              position: 'absolute', inset: 0,
            }} />
          )}

          {photo ? (
            <img
              src={item.url}
              alt={item.title}
              onLoad={() => setLoaded(true)}
              style={{
                width: '100%',
                display: 'block',
                opacity: loaded ? 1 : 0,
                transition: 'opacity 0.5s ease',
              }}
            />
          ) : (
            <video
              src={item.url}
              controls
              preload="metadata"
              playsInline
              style={{
                width: '100%',
                display: 'block',
              }}
            />
          )}

          {/* Overlay caption — only on photos so it doesn't block video controls */}
          {photo && (
            <div style={{
              position: 'absolute',
              left: 0, right: 0, bottom: 0,
              padding: '40px 18px 16px',
              background: 'linear-gradient(to top, rgba(20,16,12,0.78) 0%, rgba(20,16,12,0.35) 55%, transparent 100%)',
              opacity: loaded ? 1 : 0,
              transition: 'opacity 0.5s ease',
            }}>
              <div style={{
                fontSize: '11px',
                fontWeight: '600',
                color: 'rgba(255,255,255,0.82)',
                letterSpacing: '0.08em',
                marginBottom: '4px',
                textShadow: '0 1px 3px rgba(0,0,0,0.3)',
              }}>
                {item.date}
              </div>
              <div className="serif" style={{
                fontSize: '18px',
                fontWeight: '500',
                color: '#fff',
                lineHeight: 1.4,
                textShadow: '0 1px 6px rgba(0,0,0,0.4)',
              }}>
                {item.title}
              </div>
            </div>
          )}
        </div>

        {/* Caption below — videos only */}
        {!photo && (
          <div style={{ padding: '14px 16px 16px' }}>
            <div style={{
              fontSize: '11px',
              fontWeight: '600',
              color: t.sage,
              letterSpacing: '0.06em',
              marginBottom: '5px',
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
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════
   Star Mark — refined line emblem
   ═══════════════════════════════════ */
function StarMark() {
  return (
    <svg width="56" height="56" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="starGrad" x1="14" y1="8" x2="42" y2="48" gradientUnits="userSpaceOnUse">
          <stop stopColor="#C99A6A" />
          <stop offset="1" stopColor="#B8734A" />
        </linearGradient>
      </defs>
      {/* main four-point sparkle */}
      <path
        d="M28 6 C29.5 17.5 33.8 22.5 50 28 C33.8 33.5 29.5 38.5 28 50 C26.5 38.5 22.2 33.5 6 28 C22.2 22.5 26.5 17.5 28 6 Z"
        fill="url(#starGrad)"
      />
      {/* small accent sparkle */}
      <path
        d="M44 10 C44.6 13.4 45.8 14.8 49 16 C45.8 17.2 44.6 18.6 44 22 C43.4 18.6 42.2 17.2 39 16 C42.2 14.8 43.4 13.4 44 10 Z"
        fill="#7C8A6E"
        opacity="0.85"
      />
    </svg>
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
        width: '64px', height: '64px',
        margin: '0 auto 16px',
        background: t.warm1,
        borderRadius: '18px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '28px', opacity: 0.6,
      }}>
        📷
      </div>
      <p className="serif" style={{
        fontSize: '16px',
        color: t.inkSoft,
        fontWeight: '400',
        lineHeight: 1.6,
      }}>
        아직 기록된 순간이 없어요
      </p>
      <p style={{
        fontSize: '13px',
        color: t.inkMuted,
        marginTop: '6px',
      }}>
        관리자 페이지에서 사진을 추가해 보세요
      </p>
    </div>
  );
}
