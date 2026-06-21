import React, { useState, useEffect, useMemo } from 'react';

export default function Admin() {
  const [password, setPassword] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [photos, setPhotos] = useState([]);

  // R2에 올라가 있는 전체 파일 목록 (선택용)
  const [availablePhotos, setAvailablePhotos] = useState([]);
  const [loadingList, setLoadingList] = useState(false);
  const [listError, setListError] = useState('');
  const [search, setSearch] = useState('');

  // 새 사진 입력용 state (url은 그리드에서 클릭해서 채워짐)
  const [newPhoto, setNewPhoto] = useState({ url: '', title: '', date: '', folderId: '1' });

  // 1. 페이지가 열릴 때 Cloudflare KV에 저장되어 있던 기존 데이터 로드
  useEffect(() => {
    fetch('/functions/api')
      .then(res => res.json())
      .then(data => setPhotos(data || []))
      .catch(err => console.error("데이터 로드 실패:", err));
  }, []);

  // 1-1. 로그인 후에만 R2 파일 목록을 불러옴
  useEffect(() => {
    if (!isLoggedIn) return;
    setLoadingList(true);
    setListError('');
    fetch('/functions/api/list-photos')
      .then(res => res.json())
      .then(data => {
        if (data.error) throw new Error(data.error);
        setAvailablePhotos(data || []);
      })
      .catch(err => {
        console.error('R2 목록 로드 실패:', err);
        setListError('사진 목록을 불러오지 못했어요: ' + err.message);
      })
      .finally(() => setLoadingList(false));
  }, [isLoggedIn]);

  // 이미 등록(임시 추가)된 url 모음 -> 그리드에서 "등록됨" 표시용
  const usedUrls = useMemo(() => new Set(photos.map(p => p.url)), [photos]);

  // 검색어로 파일명 필터링
  const filteredAvailable = useMemo(() => {
    if (!search.trim()) return availablePhotos;
    const q = search.trim().toLowerCase();
    return availablePhotos.filter(f => f.key.toLowerCase().includes(q));
  }, [availablePhotos, search]);

  const isImageFile = (url) => /\.(jpe?g|png|gif|webp|heic|heif)$/i.test(url || '');

  // 2. 관리자 로그인 처리
  const handleLogin = (e) => {
    e.preventDefault();
    if (password === '4547') {
      setIsLoggedIn(true);
    } else {
      alert('비밀번호가 틀렸습니다.');
    }
  };

  // 그리드에서 사진을 탭하면 url만 채워줌 (제목/날짜는 아래에서 입력)
  const handlePickPhoto = (file) => {
    setNewPhoto(prev => ({ ...prev, url: file.url }));
  };

  // 3. 리스트에 사진 임시 추가
  const handleAddPhoto = (e) => {
    e.preventDefault();
    if (!newPhoto.url || !newPhoto.title || !newPhoto.date) {
      alert('사진을 고르고, 제목/날짜를 모두 입력해 주세요.');
      return;
    }

    // 가장 최근에 등록한 사진이 위로 오도록 배열 맨 앞에 추가
    setPhotos([newPhoto, ...photos]);

    // 입력창 초기화 (폴더는 쓰던 폴더 유지, url/title/date만 비우기)
    setNewPhoto({ ...newPhoto, url: '', title: '', date: '' });
  };

  // 4. 리스트에서 사진 삭제
  const handleDelete = (index) => {
    if (window.confirm('이 사진을 리스트에서 삭제하시겠습니까?\n(최종 저장하기를 누르셔야 서버에 반영됩니다)')) {
      setPhotos(photos.filter((_, i) => i !== index));
    }
  };

  // 5. 변경된 전체 리스트를 Cloudflare KV에 최종 저장
  const handleSave = async () => {
    try {
      const response = await fetch('/functions/api', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, data: photos })
      });
      const result = await response.json();
      if (result.success) {
        alert('성공적으로 저장되었습니다! 한별이 앨범 홈 화면에서 확인해 보세요. ✨');
      } else {
        alert('저장 실패: ' + result.error);
      }
    } catch (err) {
      alert('오류가 발생했습니다: ' + err.message);
    }
  };

  // 폴더 ID를 텍스트 이름으로 바꿔주는 헬퍼 매핑 (목록 표시용)
  const getFolderName = (id) => {
    const folderNames = {
      '1': '0개월 (신생아)',
      '2': '1개월',
      '3': '2개월',
      '4': '3개월',
      '5': '4개월',
      '6': '5개월'
    };
    return folderNames[id] || `${id}개월`;
  };

  // ------------------------------------------
  // [화면 1] 로그인 전 화면
  // ------------------------------------------
  if (!isLoggedIn) {
    return (
      <div style={{ padding: '80px 20px', textAlign: 'center', fontFamily: 'sans-serif', background: '#FAF6F0', minHeight: '100vh', boxSizing: 'border-box' }}>
        <h2 style={{ color: '#2B2622', marginBottom: '8px' }}>🔒 한별이 앨범 관리자</h2>
        <p style={{ color: '#756B5F', fontSize: '14px', marginBottom: '24px' }}>휴대폰으로 사진과 글을 관리합니다.</p>
        <form onSubmit={handleLogin}>
          <input
            type="password"
            placeholder="비밀번호 입력"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ padding: '14px', fontSize: '16px', width: '85%', maxWidth: '300px', borderRadius: '8px', border: '1px solid #E4DCCC', boxSizing: 'border-box', outline: 'none' }}
          />
          <br /><br />
          <button type="submit" style={{ padding: '14px', fontSize: '16px', width: '85%', maxWidth: '300px', backgroundColor: '#B8633F', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
            로그인
          </button>
        </form>
      </div>
    );
  }


  // ------------------------------------------
  // [화면 2] 로그인 후 관리자 제어판
  // ------------------------------------------
  return (
    <div style={{ padding: '20px', maxWidth: '500px', margin: '0 auto', fontFamily: 'sans-serif', background: '#FAF6F0', minHeight: '100vh', boxSizing: 'border-box', color: '#2B2622' }}>
      <h2 style={{ fontSize: '22px', textAlign: 'center', margin: '10px 0 20px', color: '#2B2622' }}>📱 앨범 관리 페이지</h2>

      {/* 💾 최상단 고정 저장 버튼 */}
      <button onClick={handleSave} style={{ width: '100%', padding: '16px', backgroundColor: '#7C8A6E', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: 'bold', marginBottom: '24px', cursor: 'pointer', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
        💾 최종 변경사항 서버에 저장하기
      </button>

      {/* ✨ 새 사진 등록 폼 */}
      <div style={{ background: '#FFFFFF', padding: '20px', borderRadius: '8px', marginBottom: '24px', border: '1px solid #E4DCCC' }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '17px', color: '#B8633F' }}>✨ 새로운 순간 기록하기</h3>

        <label style={{ display: 'block', margin: '12px 0 6px', fontSize: '14px', fontWeight: '600' }}>1. 앨범 폴더 선택</label>
        <select
          value={newPhoto.folderId}
          onChange={e => setNewPhoto({ ...newPhoto, folderId: e.target.value })}
          style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #E4DCCC', fontSize: '15px', background: '#fff', color: '#2B2622' }}
        >
          <option value="1">0개월 (신생아)</option>
          <option value="2">1개월</option>
          <option value="3">2개월</option>
          <option value="4">3개월</option>
          <option value="5">4개월</option>
          <option value="6">5개월</option>
        </select>

        <label style={{ display: 'block', margin: '16px 0 6px', fontSize: '14px', fontWeight: '600' }}>2. 사진/영상 고르기</label>

        <input
          type="text"
          placeholder="파일명으로 검색 (예: 5682)"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: '100%', padding: '10px', marginBottom: '10px', borderRadius: '4px', border: '1px solid #E4DCCC', boxSizing: 'border-box', fontSize: '14px' }}
        />

        {loadingList && (
          <div style={{ padding: '16px', textAlign: 'center', color: '#756B5F', fontSize: '13px' }}>불러오는 중...</div>
        )}
        {listError && (
          <div style={{ padding: '12px', color: '#B8633F', fontSize: '13px' }}>{listError}</div>
        )}

        {!loadingList && !listError && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '6px',
            maxHeight: '280px',
            overflowY: 'auto',
            padding: '8px',
            background: '#FAF6F0',
            borderRadius: '6px',
            border: '1px solid #E4DCCC'
          }}>
            {filteredAvailable.length === 0 ? (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: '#756B5F', fontSize: '13px', padding: '20px 0' }}>
                일치하는 파일이 없어요.
              </div>
            ) : (
              filteredAvailable.map(file => {
                const isSelected = newPhoto.url === file.url;
                const isUsed = usedUrls.has(file.url);
                return (
                  <div
                    key={file.key}
                    onClick={() => handlePickPhoto(file)}
                    style={{
                      position: 'relative',
                      aspectRatio: '1 / 1',
                      borderRadius: '4px',
                      overflow: 'hidden',
                      cursor: 'pointer',
                      border: isSelected ? '3px solid #B8633F' : '1px solid #E4DCCC',
                      background: '#f1ece3'
                    }}
                  >
                    {isImageFile(file.url) ? (
                      <img src={file.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', color: '#756B5F' }}>
                        ▶ 영상
                      </div>
                    )}
                    {isUsed && (
                      <div style={{ position: 'absolute', top: 2, right: 2, background: 'rgba(124,138,110,0.9)', color: 'white', fontSize: '9px', padding: '1px 4px', borderRadius: '3px' }}>
                        등록됨
                      </div>
                    )}
                    {isSelected && (
                      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(184,99,63,0.85)', color: 'white', fontSize: '10px', textAlign: 'center', padding: '2px 0' }}>
                        선택됨
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        <form onSubmit={handleAddPhoto}>
          <label style={{ display: 'block', margin: '16px 0 6px', fontSize: '14px', fontWeight: '600' }}>3. 제목 (Title)</label>
          <input
            type="text"
            placeholder="예: 조리원 첫 모자동실"
            value={newPhoto.title}
            onChange={e => setNewPhoto({ ...newPhoto, title: e.target.value })}
            style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #E4DCCC', boxSizing: 'border-box', fontSize: '14px' }}
          />

          <label style={{ display: 'block', margin: '12px 0 6px', fontSize: '14px', fontWeight: '600' }}>4. 날짜 (Date)</label>
          <input
            type="date"
            value={newPhoto.date}
            onChange={e => setNewPhoto({ ...newPhoto, date: e.target.value })}
            style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #E4DCCC', boxSizing: 'border-box', fontSize: '14px' }}
          />

          <button type="submit" disabled={!newPhoto.url} style={{ width: '100%', marginTop: '20px', padding: '12px', backgroundColor: newPhoto.url ? '#B8633F' : '#D9CFC2', color: 'white', border: 'none', borderRadius: '6px', fontSize: '15px', fontWeight: 'bold', cursor: newPhoto.url ? 'pointer' : 'not-allowed' }}>
            ➕ 아래 목록에 임시 추가
          </button>
        </form>
      </div>

      {/* 🖼️ 현재 저장 예정인 리스트 관리 */}
      <h3 style={{ fontSize: '16px', margin: '0 0 12px 4px', color: '#756B5F' }}>
        🖼️ 등록 예정 목록 ({photos.length}개)
      </h3>
      <div style={{ background: '#FFFFFF', borderRadius: '8px', border: '1px solid #E4DCCC', overflow: 'hidden' }}>
        {photos.length === 0 ? (
          <div style={{ padding: '30px', textAlign: 'center', color: '#756B5F', fontSize: '14px' }}>
            아직 등록한 내역이 없습니다.<br />(기존 0개월 하드코딩 데이터는 홈에 항상 기본 표시됩니다)
          </div>
        ) : (
          photos.map((item, index) => (
            <div key={index} style={{ display: 'flex', alignItems: 'center', padding: '12px', borderBottom: index === photos.length - 1 ? 'none' : '1px solid #E4DCCC', justifyContent: 'space-between' }}>
              <div style={{ width: '50px', height: '50px', background: '#f1ece3', borderRadius: '4px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {isImageFile(item.url) ? (
                  <img src={item.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span style={{ fontSize: '10px', color: '#756B5F' }}>영상</span>
                )}
              </div>

              <div style={{ flex: 1, marginLeft: '12px', minWidth: 0 }}>
                <div style={{ fontWeight: 'bold', fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</div>
                <div style={{ fontSize: '12px', color: '#756B5F', marginTop: '2px' }}>{item.date} • <span style={{ color: '#A54F30', fontWeight: '600' }}>{getFolderName(item.folderId)}</span></div>
              </div>

              <button onClick={() => handleDelete(index)} style={{ backgroundColor: '#FAF6F0', color: '#B8633F', border: '1px solid #E4DCCC', padding: '6px 12px', borderRadius: '4px', fontSize: '13px', cursor: 'pointer', marginLeft: '8px' }}>
                삭제
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
