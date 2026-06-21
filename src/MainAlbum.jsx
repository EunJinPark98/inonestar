import React, { useState, useEffect } from 'react';

// 기존 mockData를 서버 데이터가 없을 때나 초기 뼈대로 활용합니다.
const mockData = {
  folders: [
    { id: 1, name: '신생아', label: '0개월' },
    { id: 2, name: '1개월(준비중)',   label: '1개월' },
    { id: 3, name: '2개월(준비중)',   label: '2개월' },
    { id: 4, name: '3개월(준비중)', label: '3개월' },
    { id: 5, name: '4개월(준비중)',   label: '4개월' },
    { id: 6, name: '5개월(준비중)',   label: '5개월' }
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
      { id: 999, title: '초점책 보는 똘망이', date: '2026.01.22', url: 'https://pub-1b703dcc28274ffc8bea84f2cdabeaf5.r2.dev/%EC%8B%A0%EC%83%9D%EC%95%84/IMG_5955.jpeg' },
      { id: 999, title: '부릅', date: '2026.01.24', url: 'https://pub-1b703dcc28274ffc8bea84f2cdabeaf5.r2.dev/%EC%8B%A0%EC%83%9D%EC%95%84/IMG_5987.jpeg' },
      { id: 999, title: '집으로 처음 온 날', date: '2026.01.25', url: 'https://pub-1b703dcc28274ffc8bea84f2cdabeaf5.r2.dev/%EC%8B%A0%EC%83%9D%EC%95%84/IMG_5997.jpeg' },
      { id: 999, title: 'ㄴ', date: '2026.01.27', url: 'https://pub-1b703dcc28274ffc8bea84f2cdabeaf5.r2.dev/%EC%8B%A0%EC%83%9D%EC%95%84/IMG_6008.jpeg' },
      { id: 999, title: 'ss', date: '2026.01.27', url: 'https://pub-1b703dcc28274ffc8bea84f2cdabeaf5.r2.dev/%EC%8B%A0%EC%83%9D%EC%95%84/IMG_6039.jpeg' }
    ],
    2: [],
    3: [],
    4: [],
    5: [],
    6: []
  }
};

// url 확장자로 사진/영상 구분
const isImage = (url) => /\.(jpe?g|png|gif|webp|heic|heif)$/i.test(url || '');

const Style = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@400;500;700&family=Pretendard:wght@300;400;500;600&display=swap');

    .gj-root {
      --bg: #FAF6F0;
      --ink: #2B2622;
      --ink-soft: #756B5F;
      --clay: #B8633F;
      --clay-soft: #E8C9B8;
      --sage: #7C8A6E;
      --line: #E4DCCC;
      --card: #FFFFFF;
      font-family: 'Pretendard', -apple-system, sans-serif;
      background: var(--bg);
      color: var(--ink);
      min-height: 100vh;
    }

    .gj-serif { font-family: 'Noto Serif KR', serif; }

    .gj-eyebrow {
      font-size: 11px;
      letter-spacing: 0.18em;
      color: var(--sage);
      font-weight: 600;
      text-transform: uppercase;
    }

    .gj-back {
      background: none;
      border: none;
      cursor: pointer;
      color: var(--ink-soft);
      font-size: 13px;
      font-weight: 500;
      padding: 0;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      transition: color 0.15s ease;
    }
    .gj-back:hover { color: var(--clay); }

    .gj-row {
      position: relative;
      display: flex;
      align-items: center;
      gap: 20px;
      padding: 22px 4px;
      border-bottom: 1px solid var(--line);
      cursor: pointer;
      transition: padding-left 0.2s ease;
    }
    .gj-row:last-child { border-bottom: none; }
    .gj-row:hover { padding-left: 10px; }
    .gj-row:hover .gj-arrow { transform: translateX(4px); opacity: 1; }
    .gj-row:hover .gj-row-title { color: var(--clay); }

    .gj-dot {
      width: 9px;
      height: 9px;
      border-radius: 50%;
      background: var(--card);
      border: 2px solid var(--clay);
      flex-shrink: 0;
      z-index: 1;
    }

    .gj-row-title { transition: color 0.15s ease; }

    .gj-arrow {
      margin-left: auto;
      opacity: 0.35;
      transition: all 0.2s ease;
      color: var(--ink-soft);
    }

    .gj-video-card {
      border: 1px solid var(--line);
      border-radius: 4px;
      overflow: hidden;
      background: var(--card);
      margin-bottom: 28px;
    }

    .gj-video-frame {
      padding: 10px;
      background: #f1ece3;
    }

    .gj-video-frame video,
    .gj-video-frame img {
      width: 100%;
      display: block;
      border-radius: 2px;
    }

    .gj-video-caption {
      padding: 16px 18px;
    }
  `}</style>
);

export default function MainAlbum() {
  const [currentFolder, setCurrentFolder] = useState(null);
  const [photos, setPhotos] = useState([]);

  useEffect(() => {
    // Cloudflare KV에 저장된 데이터를 가져옵니다.
    fetch('/functions/api')
      .then(res => res.json())
      .then(data => {
        // 만약 서버에 저장된 데이터가 있다면 state에 채워줍니다.
        setPhotos(data || []);
      })
      .catch(err => console.error("앨범 로드 실패:", err));
  }, []);

  // 💡 [핵심 변경 로직] 기존 mockData와 서버에서 받아온 실시간 데이터를 합쳐서 현재 폴더에 뿌려줍니다.
  const getCurrentFolderItems = () => {
    if (!currentFolder) return [];

    // 1. 기존 소스코드에 하드코딩되어 있던 사진 데이터 가져오기
    const staticItems = mockData.videos[currentFolder] || [];

    // 2. 관리자 페이지를 통해 새로 올린 실시간 데이터 중, 현재 폴더 ID와 일치하는 것 필터링하기
    // (관리자단에서 folderId를 1, 2, 3 숫자 형태로 저장한다고 가정합니다)
    const dynamicItems = photos.filter(item => Number(item.folderId) === Number(currentFolder));

    // 최신 등록한 사진이 상단에 먼저 보이도록 서버 데이터를 앞에 배치해서 합칩니다.
    return [...dynamicItems, ...staticItems];
  };

  const currentItems = getCurrentFolderItems();
  const selectedFolderInfo = mockData.folders.find(f => f.id === currentFolder);

  return (
    <div className="gj-root">
      <Style />
      <div style={{ maxWidth: '560px', margin: '0 auto', padding: '56px 28px 80px' }}>

        {currentFolder === null ? (
          <>
            <div style={{ marginBottom: '44px' }}>
              <div className="gj-eyebrow" style={{ marginBottom: '10px' }}>GROWTH JOURNAL</div>
              <h1 className="gj-serif" style={{ fontSize: '28px', color: 'var(--ink-soft)', fontWeight: 700, margin: 0, lineHeight: 1.4 }}>
                한별이 앨범
              </h1>
              <p style={{ fontSize: '13px', color: 'var(--ink-soft)', marginTop: '8px', lineHeight: 1.6 }}>
                사랑하는 우리 딸 한별이의 소중한 기록
              </p>
            </div>

            <div style={{ position: 'relative' }}>
              <div style={{
                position: 'absolute', left: '4px', top: '14px', bottom: '14px',
                width: '1px', background: 'var(--line)'
              }} />
              {mockData.folders.map(folder => (
                <div key={folder.id} className="gj-row" onClick={() => setCurrentFolder(folder.id)}>
                  <div style={{ marginLeft: '0px' }}><div className="gj-dot" /></div>
                  <div>
                    <div className="gj-eyebrow" style={{ marginBottom: '4px' }}>{folder.label}</div>
                    <div className="gj-serif gj-row-title" style={{ fontSize: '19px', fontWeight: 500 }}>
                      {folder.name}
                    </div>
                  </div>
                  <span className="gj-arrow">→</span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            <button className="gj-back" onClick={() => setCurrentFolder(null)}>
              ← 목록으로
            </button>

            <div style={{ marginTop: '24px', marginBottom: '36px' }}>
              <div className="gj-eyebrow" style={{ marginBottom: '10px' }}>
                {selectedFolderInfo?.label}
              </div>
              <h2 className="gj-serif" style={{ fontSize: '24px', fontWeight: 700, margin: 0 }}>
                {selectedFolderInfo?.name}
              </h2>
            </div>

            {currentItems.length === 0 ? (
              <div style={{
                padding: '60px 20px',
                textAlign: 'center',
                border: '1px dashed var(--line)',
                borderRadius: '4px'
              }}>
                <p className="gj-serif" style={{ fontSize: '15px', color: 'var(--ink-soft)', fontStyle: 'italic', margin: 0 }}>
                  아직 기록된 순간이 없어요.
                </p>
              </div>
            ) : (
              currentItems.map((video, index) => (
                <div key={video.id || index} className="gj-video-card">
                  <div className="gj-video-caption">
                    <div style={{ fontSize: '11px', color: 'var(--sage)', letterSpacing: '0.05em', marginBottom: '4px' }}>
                      {video.date}
                    </div>
                    <div className="gj-serif" style={{ fontSize: '16px', fontWeight: 500 }}>
                      {video.title}
                    </div>
                  </div>
                  <div className="gj-video-frame">
                    {isImage(video.url)
                      ? <img src={video.url} alt={video.title} />
                      : <video src={video.url} controls />}
                  </div>
                </div>
              ))
            )}
          </>
        )}
      </div>
    </div>
  );
}