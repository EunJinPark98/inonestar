import React, { useState } from 'react';

const mockData = {
  folders: [
    { id: 1, name: '신생아', label: '0개월' },
    { id: 2, name: '1개월',   label: '1개월' },
    { id: 3, name: '2개월',   label: '2개월' }
  ],
  videos: {
    1: [
      { id: 101, title: '1월 9일, 탄생', date: '2026.01.09', url: 'https://pub-1b703dcc28274ffc8bea84f2cdabeaf5.r2.dev/_talkv_wy3u265OPu_S0WGwUC7rThjurgJ0N1L8K_talkv_high.mp4' },
      { id: 102, title: '첫 면회', date: '2026.01.10', url: 'https://pub-1b703dcc28274ffc8bea84f2cdabeaf5.r2.dev/IMG_5682.jpeg' },
      { id: 103, title: '조리원 첫 모자동실', date: '2026.01.12', url: 'https://pub-1b703dcc28274ffc8bea84f2cdabeaf5.r2.dev/IMG_5727.jpeg' },
      { id: 104, title: '숙면', date: '2026.01.14', url: 'https://pub-1b703dcc28274ffc8bea84f2cdabeaf5.r2.dev/IMG_5817.jpeg' },
      { id: 105, title: '찡긋', date: '2026.01.16', url: 'https://pub-1b703dcc28274ffc8bea84f2cdabeaf5.r2.dev/IMG_5859.jpeg' },
      { id: 106, title: '아빠품에서', date: '2026.01.16', url: 'https://pub-1b703dcc28274ffc8bea84f2cdabeaf5.r2.dev/IMG_5872.jpeg' },
      { id: 107, title: '동글동글', date: '2026.01.22', url: 'https://pub-1b703dcc28274ffc8bea84f2cdabeaf5.r2.dev/IMG_5960.jpeg' }
    ],
    2: [{ id: 201, title: '', date: '2026.02.14', url: '' }],
    3: []
  }
};

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

    .gj-video-frame video {
      width: 100%;
      display: block;
      border-radius: 2px;
    }

    .gj-video-caption {
      padding: 16px 18px;
    }
  `}</style>
);

export default function App() {
  const [currentFolder, setCurrentFolder] = useState(null);

  return (
    <div className="gj-root">
      <Style />
      <div style={{ maxWidth: '560px', margin: '0 auto', padding: '56px 28px 80px' }}>

        {currentFolder === null ? (
          <>
            <div style={{ marginBottom: '44px' }}>
              <div className="gj-eyebrow" style={{ marginBottom: '10px' }}>GROWTH JOURNAL</div>
              <h1 className="gj-serif" style={{ fontSize: '28px', fontWeight: 700, margin: 0, lineHeight: 1.4 }}>
                한별이 앨범
              </h1>
              <p style={{ fontSize: '13px', color: 'var(--ink-soft)', marginTop: '8px', lineHeight: 1.6 }}>
                태어난 순간부터, 한 달 한 달의 자라는 모습을 담았습니다.
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
                {mockData.folders.find(f => f.id === currentFolder).label}
              </div>
              <h2 className="gj-serif" style={{ fontSize: '24px', fontWeight: 700, margin: 0 }}>
                {mockData.folders.find(f => f.id === currentFolder).name}
              </h2>
            </div>

            {mockData.videos[currentFolder].length === 0 ? (
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
              mockData.videos[currentFolder].map(video => (
                <div key={video.id} className="gj-video-card">
                  <div className="gj-video-caption">
                    <div style={{ fontSize: '11px', color: 'var(--sage)', letterSpacing: '0.05em', marginBottom: '4px' }}>
                      {video.date}
                    </div>
                    <div className="gj-serif" style={{ fontSize: '16px', fontWeight: 500 }}>
                      {video.title}
                    </div>
                  </div>
                  <div className="gj-video-frame">
                    <video src={video.url} controls />
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
