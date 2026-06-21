import React from 'react';
import MainAlbum from './MainAlbum'; // 원래 보던 아기 앨범 메인 화면
import Admin from './Admin';

export default function App() {
  // 주소창 뒤에 /admin이 붙어 있으면 관리자 페이지를 보여줍니다.
  if (window.location.pathname === '/pej') {
    return <Admin />;
  }

  // 기본 주소일 때는 원래 만들던 앨범 화면을 띄웁니다.
  return <MainAlbum />; 
}