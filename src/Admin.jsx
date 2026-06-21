import React, { useState, useEffect, useRef } from 'react';

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

export default function Admin() {
  const [password, setPassword] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [photos, setPhotos] = useState([]);
  const [view, setView] = useState('register');
  const [editIndex, setEditIndex] = useState(null);
  const [editData, setEditData] = useState(null);

  const [newPhoto, setNewPhoto] = useState({ url: '', title: '', date: '', folderId: '1' });
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetch('/functions/api')
      .then(res => res.json())
      .then(data => setPhotos(data || []))
      .catch(() => {});
  }, []);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  };

  const isImageFile = (url) => /\.(jpe?g|png|gif|webp|heic|heif)$/i.test(url || '');

  const handleLogin = (e) => {
    e.preventDefault();
    if (password === '4547') {
      setIsLoggedIn(true);
    } else {
      showToast('비밀번호가 틀렸어요');
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

      const res = await fetch('/functions/api/upload', { method: 'POST', body: formData });
      const result = await res.json();

      if (result.success) {
        setNewPhoto(prev => ({ ...prev, url: result.url }));
      } else {
        showToast('업로드 실패: ' + result.error);
        setPreviewUrl('');
      }
    } catch (err) {
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

    setPhotos([newPhoto, ...photos]);
    setNewPhoto({ ...newPhoto, url: '', title: '', date: '' });
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl('');
    if (fileInputRef.current) fileInputRef.current.value = '';
    showToast('목록에 추가했어요');
  };

  const handleDelete = (index) => {
    setPhotos(photos.filter((_, i) => i !== index));
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

  const folderLabels = {
    '1': '신생아', '2': '1개월', '3': '2개월',
    '4': '3개월', '5': '4개월', '6': '5개월', '7': '6개월'
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
            {view === 'register' ? '앨범 관리' : '등록 목록'}
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

              {/* Folder */}
              <label style={{ fontSize: '12px', fontWeight: '600', color: theme.inkSoft, display: 'block', marginBottom: '6px', letterSpacing: '0.02em' }}>
                폴더
              </label>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '18px' }}>
                {Object.entries(folderLabels).map(([id, name]) => (
                  <button key={id} type="button" className="btn-press"
                    onClick={() => setNewPhoto(prev => ({ ...prev, folderId: id }))}
                    style={{
                      padding: '7px 14px', fontSize: '13px', fontWeight: '500',
                      border: 'none', borderRadius: theme.radiusFull, cursor: 'pointer',
                      background: newPhoto.folderId === id ? theme.primary : theme.borderLight,
                      color: newPhoto.folderId === id ? 'white' : theme.inkSoft,
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {name}
                  </button>
                ))}
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
          </>
        ) : (
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
                {photos.map((item, index) => (
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
                          } else {
                            setEditIndex(index);
                            setEditData({ ...item });
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
                          <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                            {Object.entries(folderLabels).map(([id, name]) => (
                              <button key={id} type="button" className="btn-press"
                                onClick={() => setEditData({ ...editData, folderId: id })}
                                style={{
                                  padding: '5px 11px', fontSize: '12px', fontWeight: '500',
                                  border: 'none', borderRadius: theme.radiusFull, cursor: 'pointer',
                                  background: editData.folderId === id ? theme.primary : theme.borderLight,
                                  color: editData.folderId === id ? 'white' : theme.inkSoft,
                                }}
                              >{name}</button>
                            ))}
                          </div>
                        </div>
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
              </div>
            )}
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
