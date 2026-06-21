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
      { id: 101, title: '탄생', date: '2026.01.09', url: 'https://pub-1b703dcc28274ffc8bea84f2cdabeaf5.r2.dev/_talkv_wy3u265OPu_S0WGwUC7rThjurgJ0N1L8K_talkv_high.mp4' },
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

const parseDate = (d) => new Date((d || '').replace(/\./g, '-'));

const sortByDate = (items) =>
  [...items].sort((a, b) => parseDate(a.date) - parseDate(b.date));

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
    @keyframes shimmer {
      0%   { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }

    .fade-up  { animation: fadeUp 0.5s ease both; }

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
      result[f.id] = sortByDate([...dynamicItems, ...staticItems]);
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

  const navigate = (id) => {
    setTransitioning(true);
    setTimeout(() => {
      setCurrentFolder(id);
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
          onSelect={navigate}
        />
      ) : (
        <PhotoDetailView
          folder={selectedFolder}
          items={currentItems}
          onBack={() => navigate(null)}
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
          사랑하는 우리 딸의 소중한 성장 기록
        </p>
      </div>

      {/* Folder Cards */}
      <div style={{ padding: '0 20px 60px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {folders.map((folder, idx) => {
            const count = (allFolderItems[folder.id] || []).length;
            const cover = getCoverImage(folder.id);
            const hasPhotos = count > 0;

            return (
              <div key={folder.id}
                className="folder-card fade-up"
                style={{
                  animationDelay: `${idx * 0.05}s`,
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
                      color: t.inkMuted, fontSize: '20px', opacity: 0.35,
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
                  <div className="serif" style={{
                    fontSize: '16px',
                    fontWeight: '500',
                    color: t.ink,
                    marginBottom: '3px',
                  }}>
                    {folder.name}
                  </div>
                  <div style={{
                    fontSize: '11px',
                    color: t.inkMuted,
                  }}>
                    {hasPhotos ? `${count}개의 기록` : '아직 기록이 없어요'}
                  </div>
                </div>

                {/* Arrow */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  paddingRight: '14px',
                  color: t.inkMuted,
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m9 18 6-6-6-6" />
                  </svg>
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
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
   Photo Card — caption on top
   ═══════════════════════════════════ */
function PhotoCard({ item, index }) {
  const [loaded, setLoaded] = useState(false);
  const photo = isImage(item.url);

  return (
    <div
      className="photo-entry"
      style={{ animationDelay: `${index * 0.05}s` }}
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
        background: t.warm1,
        borderRadius: '14px',
        overflow: 'hidden',
        boxShadow: t.shadowMd,
        minHeight: photo ? '200px' : 'auto',
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
      </div>
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
        관리자 페이지에서 사진을 추가해 보세요
      </p>
    </div>
  );
}
