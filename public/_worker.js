export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // 1. 관리자 페이지에서 데이터를 저장(POST)하거나 가져올(GET) 때의 주소 처리
    if (url.pathname === '/functions/api') {
      
      // [GET 요청]: 메인 화면이나 관리자 화면에서 기존 저장된 데이터를 불러갈 때
      if (request.method === 'GET') {
        // Cloudflare KV에서 'photos'라는 이름으로 저장된 데이터를 꺼내옵니다.
        // 만약 KV 이름이 다르면 env.ALBUM_KV 부분을 대시보드에 적은 이름으로 바꾸시면 됩니다.
        const data = await env.ALBUM_KV.get('photos');
        return new Response(data || '[]', {
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // [POST 요청]: 관리자 페이지에서 [최종 변경사항 서버에 저장하기] 버튼을 눌렀을 때
      if (request.method === 'POST') {
        try {
          const body = await request.json();
          
          // 🔐 Admin.jsx에 설정한 비밀번호와 일치하는지 확인합니다.
          // (만약 Admin.jsx에서 비밀번호를 바꾸셨다면 여기 'YOUR_SECRET_PASSWORD'도 똑같이 맞춰주세요!)
          if (body.password !== 'YOUR_SECRET_PASSWORD') {
            return new Response(JSON.stringify({ success: false, error: '비밀번호가 올바르지 않습니다.' }), {
              status: 401,
              headers: { 'Content-Type': 'application/json' },
            });
          }

          // KV 데이터베이스에 대형 데이터(JSON 문자열)를 통째로 저장합니다.
          await env.ALBUM_KV.put('photos', JSON.stringify(body.data));
          
          return new Response(JSON.stringify({ success: true }), {
            headers: { 'Content-Type': 'application/json' },
          });
        } catch (err) {
          return new Response(JSON.stringify({ success: false, error: err.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          });
        }
      }
    }

    // 2. /functions/api 주소가 아닐 때는 원래 만들었던 한별이 앨범 웹사이트 화면을 그대로 보여줍니다.
    return env.ASSETS.fetch(request);
  },
};