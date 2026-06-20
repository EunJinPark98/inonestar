import React, { useState } from 'react';

const mockData = {
  folders: [
    { id: 1, name: '👶 신생아' },
    { id: 2, name: '🍼 1개월' },
    { id: 3, name: '🧸 2개월' }
  ],
  videos: {
    1: [{ id: 101, title: '1월 9일 한별이 탄생', url: 'https://pub-1b703dcc28274ffc8bea84f2cdabeaf5.r2.dev/_talkv_wy3u265OPu_S0WGwUC7rThjurgJ0N1L8K_talkv_high.mp4' }],
    2: [{ id: 201, title: '우렁찬 옹알이 📣', url: 'https://www.w3schools.com/html/movie.mp4' }],
    3: []
  }
};

export default function App() {
  const [currentFolder, setCurrentFolder] = useState(null);

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif', maxWidth: '600px', margin: '0 auto' }}>
      <h1 style={{ textAlign: 'center', color: '#ff8a8a', marginBottom: '30px' }}>❤️ 우리 한별이 성장 일기 ❤️</h1>
      
      {currentFolder === null ? (
        // [메인 화면] 폴더 목록 보여주기
        <div>
          <h3 style={{ color: '#eee' }}>성장 앨범 폴더</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            {mockData.folders.map(folder => (
              <div 
                key={folder.id} 
                onClick={() => setCurrentFolder(folder.id)}
                style={{ 
                  padding: '30px 20px', 
                  border: '2px solid #ffe3e3', 
                  borderRadius: '15px', 
                  textAlign: 'center', 
                  cursor: 'pointer', 
                  backgroundColor: '#fff9f9', 
                  fontSize: '18px',
                  fontWeight: 'bold',
                  boxShadow: '0 4px 6px rgba(0,0,0,0.02)'
                }}
              >
                <span style={{ fontSize: '30px' }}>📁</span> <br/>
                <div style={{ marginTop: '10px', color: '#444' }}>{folder.name}</div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        // [상세 화면] 폴더 안의 영상 목록 보여주기
        <div>
          <button 
            onClick={() => setCurrentFolder(null)} 
            style={{ 
              marginBottom: '20px', 
              padding: '8px 16px', 
              backgroundColor: '#eee', 
              border: 'none', 
              borderRadius: '8px', 
              cursor: 'pointer',
              fontWeight: 'bold',
              color: '#111'
            }}
          >
            🔙 뒤로가기
          </button>
          
          <h3 style={{ color: '#333', marginBottom: '20px' }}>
            {mockData.folders.find(f => f.id === currentFolder).name} 영상 목록
          </h3>
          
          {mockData.videos[currentFolder].length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
              <span style={{ fontSize: '40px' }}>😭</span>
              <p>아직 등록된 영상이 없습니다.</p>
            </div>
          ) : (
            mockData.videos[currentFolder].map(video => (
              <div key={video.id} style={{ marginBottom: '25px', border: '1px solid #ffe3e3', padding: '15px', borderRadius: '12px', backgroundColor: '#fff' }}>
                <h4 style={{ margin: '0 0 10px 0', color: '#555' }}>{video.title}</h4>
                <video src={video.url} controls style={{ width: '100%', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }} />
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}