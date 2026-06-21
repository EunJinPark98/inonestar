import React, { useState, useEffect, useRef } from 'react';

export default function Admin() {
  const [password, setPassword] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [photos, setPhotos] = useState([]);

  const [newPhoto, setNewPhoto] = useState({ url: '', title: '', date: '', folderId: '1' });
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetch('/functions/api')
      .then(res => res.json())
      .then(data => setPhotos(data || []))
      .catch(err => console.error("데이터 로드 실패:", err));
  }, []);

  const isImageFile = (url) => /\.(jpe?g|png|gif|webp|heic|heif)$/i.test(url || '');

  const handleLogin = (e) => {
    e.preventDefault();
    if (password === '4547') {
      setIsLoggedIn(true);
    } else {
      alert('비밀번호가 틀렸습니다.');
    }
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setPreviewUrl(URL.createObjectURL(file));
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('password', password);

      const res = await fetch('/functions/api/upload', {
        method: 'POST',
        body: formData
      });
      const result = await res.json();

      if (result.success) {
        setNewPhoto(prev => ({ ...prev, url: result.url }));
      } else {
        alert('업로드 실패: ' + result.error);
        setPreviewUrl('');
      }
    } catch (err) {
      alert('업로드 오류: ' + err.message);
      setPreviewUrl('');
    } finally {
      setUploading(false);
    }
  };

  const handleAddPhoto = (e) => {
    e.preventDefault();
    if (!newPhoto.url || !newPhoto.title || !newPhoto.date) {
      alert('사진을 올리고, 제목/날짜를 모두 입력해 주세요.');
      return;
    }

    setPhotos([newPhoto, ...photos]);
    setNewPhoto({ ...newPhoto, url: '', title: '', date: '' });
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDelete = (index) => {
    if (window.confirm('이 사진을 리스트에서 삭제하시겠습니까?')) {
      setPhotos(photos.filter((_, i) => i !== index));
    }
  };

  const handleSave = async () => {
    try {
      const response = await fetch('/functions/api', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, data: photos })
      });
      const result = await response.json();
      if (result.success) {
        alert('저장되었습니다! ✨');
      } else {
        alert('저장 실패: ' + result.error);
      }
    } catch (err) {
      alert('오류: ' + err.message);
    }
  };

  const getFolderName = (id) => {
    const folderNames = {
      '1': '0개월 (신생아)', '2': '1개월', '3': '2개월',
      '4': '3개월', '5': '4개월', '6': '5개월'
    };
    return folderNames[id] || `${id}개월`;
  };

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

  return (
    <div style={{ padding: '20px', maxWidth: '500px', margin: '0 auto', fontFamily: 'sans-serif', background: '#FAF6F0', minHeight: '100vh', boxSizing: 'border-box', color: '#2B2622' }}>
      <h2 style={{ fontSize: '22px', textAlign: 'center', margin: '10px 0 20px', color: '#2B2622' }}>📱 앨범 관리 페이지</h2>

      <button onClick={handleSave} style={{ width: '100%', padding: '16px', backgroundColor: '#7C8A6E', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: 'bold', marginBottom: '24px', cursor: 'pointer', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
        💾 최종 변경사항 서버에 저장하기
      </button>

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

        <label style={{ display: 'block', margin: '16px 0 6px', fontSize: '14px', fontWeight: '600' }}>2. 사진/영상 올리기</label>

        {previewUrl ? (
          <div style={{ marginBottom: '12px' }}>
            <div style={{ position: 'relative', borderRadius: '8px', overflow: 'hidden', border: '1px solid #E4DCCC', background: '#f1ece3' }}>
              {isImageFile(newPhoto.url || previewUrl) || previewUrl.startsWith('blob:') ? (
                <img src={previewUrl} alt="미리보기" style={{ width: '100%', maxHeight: '300px', objectFit: 'contain', display: 'block' }} />
              ) : (
                <video src={previewUrl} controls style={{ width: '100%', maxHeight: '300px', display: 'block' }} />
              )}
              {uploading && (
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '15px', fontWeight: 'bold' }}>
                  업로드 중...
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => {
                URL.revokeObjectURL(previewUrl);
                setPreviewUrl('');
                setNewPhoto(prev => ({ ...prev, url: '' }));
                if (fileInputRef.current) fileInputRef.current.value = '';
              }}
              style={{ marginTop: '8px', padding: '8px 16px', fontSize: '13px', background: '#FAF6F0', color: '#B8633F', border: '1px solid #E4DCCC', borderRadius: '4px', cursor: 'pointer' }}
            >
              다른 사진 선택
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            style={{ width: '100%', padding: '28px 16px', background: '#FAF6F0', border: '2px dashed #D9CFC2', borderRadius: '8px', cursor: 'pointer', fontSize: '15px', color: '#756B5F', fontWeight: '500' }}
          >
            📷 사진 또는 영상 선택하기
          </button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />

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

          <button type="submit" disabled={!newPhoto.url || uploading} style={{ width: '100%', marginTop: '20px', padding: '12px', backgroundColor: (newPhoto.url && !uploading) ? '#B8633F' : '#D9CFC2', color: 'white', border: 'none', borderRadius: '6px', fontSize: '15px', fontWeight: 'bold', cursor: (newPhoto.url && !uploading) ? 'pointer' : 'not-allowed' }}>
            ➕ 아래 목록에 임시 추가
          </button>
        </form>
      </div>

      <h3 style={{ fontSize: '16px', margin: '0 0 12px 4px', color: '#756B5F' }}>
        🖼️ 등록 예정 목록 ({photos.length}개)
      </h3>
      <div style={{ background: '#FFFFFF', borderRadius: '8px', border: '1px solid #E4DCCC', overflow: 'hidden' }}>
        {photos.length === 0 ? (
          <div style={{ padding: '30px', textAlign: 'center', color: '#756B5F', fontSize: '14px' }}>
            아직 등록한 내역이 없습니다.
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
