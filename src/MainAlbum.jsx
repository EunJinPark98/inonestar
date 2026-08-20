import React, { useState, useEffect, useMemo, useRef } from 'react';

const mockData = {
  folders: [
    { id: 1, name: '신생아', label: '0개월' },
    { id: 2, name: '1개월', label: '1개월' },
    { id: 3, name: '2개월', label: '2개월' },
    { id: 4, name: '3개월', label: '3개월' },
    { id: 5, name: '4개월', label: '4개월' },
    { id: 6, name: '5개월', label: '5개월' },
    { id: 7, name: '6개월', label: '6개월' },
  ],
  videos: {
    1: [], 2: [], 3: [], 4: [], 5: [], 6: [], 7: [],
  },
};

const isImage = (url) => /\.(jpe?g|png|gif|webp|heic|heif)$/i.test(url || '');

const parseDate = (d) => new Date((d || '').replace(/\./g, '-'));

const sortByDate = (items) =>
  [...items].sort((a, b) => parseDate(a.date) - parseDate(b.date));

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ═══════════════════════════════════
   밤하늘 배경 — 별 + 별똥별
   ═══════════════════════════════════ */
function StarSky() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !canvas.getContext) return;

    const ctx = canvas.getContext('2d');
    const reduceMotion = prefersReducedMotion();

    let stars = [];
    let shooting = null;
    let nextShootAt = 0;
    let w = 0;
    let h = 0;
    let raf = 0;
    let resizeTimer = 0;

    const seed = () => {
      // 화면이 넓을수록 별을 더. 모바일에서 과하지 않게 상한을 둔다.
      const count = Math.min(220, Math.round((w * h) / 7000));
      stars = [];
      for (let i = 0; i < count; i++) {
        stars.push({
          x: Math.random() * w,
          y: Math.random() * h,
          r: Math.random() * 1.25 + 0.35,
          base: Math.random() * 0.5 + 0.25,
          speed: Math.random() * 0.0016 + 0.0004,
          phase: Math.random() * Math.PI * 2,
          gold: Math.random() < 0.28,
        });
      }
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seed();
    };

    const drawStars = (time) => {
      for (let i = 0; i < stars.length; i++) {
        const s = stars[i];
        const twinkle = reduceMotion
          ? s.base
          : s.base + Math.sin(time * s.speed + s.phase) * 0.28;
        const a = Math.max(0.05, Math.min(1, twinkle));
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = s.gold
          ? 'rgba(245, 197, 66, ' + a + ')'
          : 'rgba(255, 255, 255, ' + a * 0.85 + ')';
        ctx.fill();
      }
    };

    const spawnShootingStar = () => {
      const fromLeft = Math.random() < 0.5;
      shooting = {
        x: fromLeft ? -60 : w + 60,
        y: Math.random() * h * 0.45,
        vx: (fromLeft ? 1 : -1) * (Math.random() * 3 + 5),
        vy: Math.random() * 1.6 + 1.4,
        life: 0,
        max: Math.random() * 40 + 70,
      };
    };

    const drawShootingStar = () => {
      if (!shooting) return;
      const s = shooting;
      const fade = 1 - s.life / s.max;
      const tailX = s.x - s.vx * 9;
      const tailY = s.y - s.vy * 9;

      const grad = ctx.createLinearGradient(s.x, s.y, tailX, tailY);
      grad.addColorStop(0, 'rgba(255, 233, 168, ' + 0.85 * fade + ')');
      grad.addColorStop(1, 'rgba(255, 233, 168, 0)');

      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(tailX, tailY);
      ctx.strokeStyle = grad;
      ctx.lineWidth = 1.6;
      ctx.lineCap = 'round';
      ctx.stroke();

      s.x += s.vx;
      s.y += s.vy;
      s.life += 1;
      if (s.life >= s.max) shooting = null;
    };

    const frame = (time) => {
      ctx.clearRect(0, 0, w, h);
      drawStars(time);

      if (!reduceMotion) {
        if (!shooting && time > nextShootAt) {
          spawnShootingStar();
          nextShootAt = time + 4500 + Math.random() * 6000;
        }
        drawShootingStar();
      }

      raf = requestAnimationFrame(frame);
    };

    const onResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(resize, 180);
    };

    window.addEventListener('resize', onResize);
    resize();
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(resizeTimer);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  return <canvas className="sky" ref={canvasRef} aria-hidden="true" />;
}

/* ═══════════════════════════════════
   스크롤 등장
   ═══════════════════════════════════ */
function Reveal({ as: Tag = 'section', className = '', children, ...rest }) {
  const ref = useRef(null);
  // IntersectionObserver를 못 쓰거나 모션을 줄이는 설정이면 처음부터 보이게 둔다.
  const [shown, setShown] = useState(
    () => !('IntersectionObserver' in window) || prefersReducedMotion()
  );

  useEffect(() => {
    const el = ref.current;
    if (!el || shown) return;

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          setShown(true);
          io.disconnect();
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [shown]);

  return (
    <Tag ref={ref} className={`reveal ${shown ? 'is-in' : ''} ${className}`.trim()} {...rest}>
      {children}
    </Tag>
  );
}

/* ═══════════════════════════════════
   아이콘
   ═══════════════════════════════════ */
const IconArrow = (props) => (
  <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" {...props}>
    <path d="M5 12h13M12 5l7 7-7 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const IconBack = (props) => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
    <path d="m15 18-6-6 6-6" />
  </svg>
);

const IconImage = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <path d="m21 15-5-5L5 21" />
  </svg>
);

const IconMail = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
  </svg>
);

/* ═══════════════════════════════════
   스타일 — 밤하늘 · 금빛 무드
   ═══════════════════════════════════ */
const Styles = () => (
  <style>{`
    .album-root {
      --bg: #05060c;
      --bg-soft: #0a0c16;
      --line: rgba(245, 197, 66, 0.16);

      --gold-1: #ffe9a8;
      --gold-2: #f5c542;
      --gold-3: #d9a215;

      --text: #f6f6f8;
      --muted: #9aa1b0;
      --muted-dim: #6e7484;

      --maxw: 980px;
      --radius: 20px;

      position: relative;
      min-height: 100vh;
      color: var(--text);
      font-family: "Pretendard Variable", Pretendard, -apple-system, BlinkMacSystemFont,
        "Apple SD Gothic Neo", "Malgun Gothic", system-ui, sans-serif;
      line-height: 1.65;
      -webkit-font-smoothing: antialiased;
      -webkit-tap-highlight-color: transparent;
      overflow-x: hidden;
      word-break: keep-all;
    }

    .album-root *, .album-root *::before, .album-root *::after { box-sizing: border-box; }
    .album-root button { font-family: inherit; line-height: inherit; }
    .album-root a { color: inherit; text-decoration: none; }
    .album-root :focus-visible {
      outline: 2px solid var(--gold-2);
      outline-offset: 3px;
      border-radius: 6px;
    }

    /* ── 배경 ─────────────────────────────── */

    .album-root .sky {
      position: fixed;
      inset: 0;
      width: 100%;
      height: 100%;
      z-index: -2;
      pointer-events: none;
    }

    .album-root .glow {
      position: fixed;
      top: -10vh;
      left: 50%;
      transform: translateX(-50%);
      width: min(140vw, 1200px);
      height: min(120vh, 1000px);
      z-index: -1;
      pointer-events: none;
      background: radial-gradient(closest-side,
        rgba(245, 197, 66, 0.13), rgba(245, 197, 66, 0.04) 55%, transparent 72%);
    }

    /* ── 애니메이션 ───────────────────────── */

    @keyframes float {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-10px); }
    }
    @keyframes wheel {
      0% { opacity: 0; transform: translateY(0); }
      35% { opacity: 1; }
      100% { opacity: 0; transform: translateY(14px); }
    }
    @keyframes fadeUp {
      from { opacity: 0; transform: translateY(16px); }
      to { opacity: 1; transform: none; }
    }
    @keyframes shimmer {
      0% { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }

    .album-root .fade-up { animation: fadeUp 0.6s ease both; }

    .album-root .reveal {
      opacity: 0;
      transform: translateY(26px);
      transition: opacity 0.8s ease, transform 0.8s ease;
    }
    .album-root .reveal.is-in { opacity: 1; transform: none; }

    /* ── 상단 바 ──────────────────────────── */

    .album-root .nav {
      position: sticky;
      top: 0;
      z-index: 20;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      max-width: var(--maxw);
      margin: 0 auto;
      padding: 14px 22px;
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      background: linear-gradient(to bottom, rgba(5, 6, 12, 0.72), rgba(5, 6, 12, 0));
    }

    .album-root .nav__brand {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      padding: 0;
      border: 0;
      background: none;
      color: inherit;
      font-weight: 700;
      font-size: 1rem;
      letter-spacing: -0.01em;
      cursor: pointer;
    }
    .album-root .nav__brand .star {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 30px;
      height: 30px;
      border-radius: 50%;
      background: linear-gradient(145deg, rgba(245, 197, 66, 0.22), rgba(245, 197, 66, 0.05));
      box-shadow: 0 0 0 1px rgba(245, 197, 66, 0.24);
      color: var(--gold-2);
      font-size: 0.85rem;
    }

    .album-root .nav__menu {
      display: flex;
      gap: 18px;
      font-size: 0.94rem;
      color: var(--muted);
    }
    .album-root .nav__menu button {
      padding: 0;
      border: 0;
      background: none;
      color: inherit;
      font-size: inherit;
      cursor: pointer;
      transition: color 0.2s ease;
    }
    .album-root .nav__menu button:hover,
    .album-root .nav__menu button[aria-current="page"] { color: var(--gold-1); }

    /* ── 히어로 ───────────────────────────── */

    .album-root .hero {
      position: relative;
      max-width: 760px;
      margin: 0 auto;
      padding: clamp(32px, 7vh, 72px) 22px clamp(56px, 11vh, 110px);
      text-align: center;
    }

    .album-root .hero__logo {
      width: clamp(124px, 30vw, 176px);
      height: clamp(124px, 30vw, 176px);
      margin: 0 auto;
      border-radius: 50%;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(150deg, rgba(245, 197, 66, 0.16), rgba(10, 12, 22, 0.9));
      color: rgba(245, 197, 66, 0.6);
      font-size: 2.4rem;
      box-shadow:
        0 0 0 1px rgba(245, 197, 66, 0.22),
        0 0 60px rgba(245, 197, 66, 0.22);
      animation: float 7s ease-in-out infinite;
    }
    .album-root .hero__logo img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }

    .album-root .hero__brand {
      margin: 28px 0 0;
      font-size: clamp(1.4rem, 5vw, 1.9rem);
      font-weight: 800;
      letter-spacing: 0.06em;
      background: linear-gradient(180deg, var(--gold-1), var(--gold-3));
      -webkit-background-clip: text;
      background-clip: text;
      color: transparent;
      text-shadow: 0 0 34px rgba(245, 197, 66, 0.25);
    }

    .album-root .rule {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      margin: 18px auto 24px;
      max-width: 220px;
    }
    .album-root .rule__line {
      flex: 1;
      height: 1px;
      background: linear-gradient(90deg, transparent, rgba(245, 197, 66, 0.55), transparent);
    }
    .album-root .rule__star { color: var(--gold-2); font-size: 0.72rem; }

    .album-root .hero__title {
      margin: 0;
      font-size: clamp(1.75rem, 6.6vw, 2.8rem);
      font-weight: 800;
      line-height: 1.32;
      letter-spacing: -0.02em;
    }

    .album-root .hero__handle {
      margin: 26px 0 0;
      font-size: clamp(1.05rem, 4.2vw, 1.45rem);
      font-weight: 700;
      color: var(--gold-2);
    }

    .album-root .hero__sub {
      margin: 16px 0 0;
      color: var(--muted);
      font-size: clamp(0.95rem, 3.4vw, 1.05rem);
    }

    .album-root .hero__cta {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 12px;
      margin-top: 32px;
    }

    .album-root .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      min-height: 52px;
      padding: 0 30px;
      border: 0;
      border-radius: 999px;
      font-weight: 700;
      font-size: 1rem;
      cursor: pointer;
      transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
    }

    .album-root .btn--gold {
      background: linear-gradient(135deg, var(--gold-1), var(--gold-2) 55%, var(--gold-3));
      color: #14100a;
      box-shadow: 0 10px 30px rgba(245, 197, 66, 0.24);
    }
    .album-root .btn--gold:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 14px 38px rgba(245, 197, 66, 0.34);
    }
    .album-root .btn--gold:disabled {
      background: rgba(255, 255, 255, 0.07);
      color: var(--muted-dim);
      box-shadow: none;
      cursor: default;
    }

    .album-root .btn--ghost {
      border: 1px solid var(--line);
      color: var(--gold-1);
      background: rgba(255, 255, 255, 0.02);
    }
    .album-root .btn--ghost:hover {
      transform: translateY(-2px);
      background: rgba(245, 197, 66, 0.08);
    }

    .album-root .btn:active { transform: scale(0.98); }

    .album-root .scroll-hint {
      display: block;
      width: 24px;
      height: 40px;
      margin: 48px auto 0;
      padding: 0;
      border: 1px solid rgba(245, 197, 66, 0.35);
      border-radius: 999px;
      background: none;
      position: relative;
      cursor: pointer;
    }
    .album-root .scroll-hint span {
      position: absolute;
      left: 50%;
      top: 9px;
      width: 4px;
      height: 8px;
      margin-left: -2px;
      border-radius: 2px;
      background: var(--gold-2);
      animation: wheel 1.8s ease-in-out infinite;
    }

    /* ── 공통 섹션 ────────────────────────── */

    .album-root .section {
      max-width: var(--maxw);
      margin: 0 auto;
      padding: clamp(52px, 10vh, 96px) 22px;
      text-align: center;
    }

    .album-root .section__eyebrow {
      margin: 0 0 10px;
      font-size: 0.78rem;
      letter-spacing: 0.26em;
      font-weight: 700;
      color: var(--gold-3);
    }

    .album-root .section__title {
      margin: 0;
      font-size: clamp(1.5rem, 5.6vw, 2.1rem);
      font-weight: 800;
      letter-spacing: -0.02em;
    }

    .album-root .section__desc {
      margin: 14px auto 0;
      max-width: 560px;
      color: var(--muted);
      font-size: clamp(0.95rem, 3.4vw, 1.03rem);
    }

    /* ── 앨범 카드 ────────────────────────── */

    .album-root .cards {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
      margin-top: 40px;
      text-align: left;
    }

    .album-root .card {
      position: relative;
      display: flex;
      flex-direction: column;
      padding: 0;
      border: 1px solid var(--line);
      border-radius: var(--radius);
      background:
        linear-gradient(160deg, rgba(245, 197, 66, 0.07), rgba(255, 255, 255, 0.015) 45%),
        rgba(10, 12, 22, 0.72);
      color: inherit;
      overflow: hidden;
      cursor: pointer;
      text-align: left;
      animation: fadeUp 0.6s ease both;
      transition: transform 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease;
    }
    .album-root .card--live:hover {
      transform: translateY(-5px);
      border-color: rgba(245, 197, 66, 0.45);
      box-shadow: 0 20px 44px rgba(0, 0, 0, 0.5), 0 0 44px rgba(245, 197, 66, 0.12);
    }
    .album-root .card--live:active { transform: scale(0.985); }
    .album-root .card--soon { opacity: 0.62; }

    .album-root .card__cover {
      position: relative;
      display: block;
      aspect-ratio: 1 / 1;
      background: linear-gradient(150deg, rgba(245, 197, 66, 0.1), rgba(10, 12, 22, 0.9));
      overflow: hidden;
    }
    .album-root .card__cover img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
      transition: transform 0.5s ease;
    }
    .album-root .card--live:hover .card__cover img { transform: scale(1.05); }
    .album-root .card__cover::after {
      content: "";
      position: absolute;
      inset: 0;
      background: linear-gradient(180deg, rgba(5, 6, 12, 0) 45%, rgba(5, 6, 12, 0.75));
    }
    .album-root .card__cover-empty {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      color: rgba(245, 197, 66, 0.35);
      font-size: 1.6rem;
    }

    .album-root .card__badge {
      position: absolute;
      z-index: 1;
      top: 14px;
      left: 14px;
      padding: 5px 12px;
      border-radius: 999px;
      font-size: 0.74rem;
      font-weight: 700;
      background: linear-gradient(135deg, var(--gold-1), var(--gold-2));
      color: #14100a;
    }
    .album-root .card__badge--soon {
      background: rgba(5, 6, 12, 0.6);
      border: 1px solid rgba(154, 161, 176, 0.4);
      color: var(--muted);
    }

    .album-root .card__body {
      flex: 1;
      display: flex;
      flex-direction: column;
      padding: 14px 16px 16px;
    }
    .album-root .card__eyebrow {
      font-size: 0.74rem;
      font-weight: 700;
      letter-spacing: 0.16em;
      color: var(--gold-3);
    }
    .album-root .card__name {
      margin: 5px 0 0;
      font-size: 1.1rem;
      font-weight: 800;
      letter-spacing: -0.01em;
    }
    .album-root .card__meta {
      margin: 3px 0 0;
      color: var(--muted);
      font-size: 0.82rem;
    }
    .album-root .card__go {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      margin-top: auto;
      padding-top: 12px;
      font-weight: 700;
      font-size: 0.86rem;
      color: var(--gold-2);
    }
    .album-root .card__go svg { transition: transform 0.2s ease; }
    .album-root .card--live:hover .card__go svg { transform: translateX(4px); }
    .album-root .card__go--muted { color: var(--muted-dim); }

    /* ── 값 카드 (기록 요약) ──────────────── */

    .album-root .values {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 18px;
      margin-top: 40px;
      text-align: left;
    }
    .album-root .value {
      padding: 24px 22px;
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: var(--radius);
      background: rgba(255, 255, 255, 0.02);
    }
    .album-root .value__icon { color: var(--gold-2); font-size: 1.2rem; }
    .album-root .value strong {
      display: block;
      margin: 8px 0 2px;
      font-size: 1.6rem;
      font-weight: 800;
      letter-spacing: -0.02em;
    }
    .album-root .value p { margin: 0; color: var(--muted); font-size: 0.92rem; }

    /* ── 하위 화면 헤더 ───────────────────── */

    .album-root .subhead {
      position: sticky;
      top: 0;
      z-index: 20;
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      background: linear-gradient(to bottom, rgba(5, 6, 12, 0.86), rgba(5, 6, 12, 0.55));
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    }
    .album-root .subhead__inner {
      display: flex;
      align-items: center;
      gap: 12px;
      max-width: 760px;
      margin: 0 auto;
      padding: 12px 20px;
    }
    .album-root .subhead__title {
      font-size: 1rem;
      font-weight: 700;
      letter-spacing: -0.01em;
    }
    .album-root .subhead__meta {
      font-size: 0.78rem;
      color: var(--muted);
    }

    .album-root .back-btn {
      flex-shrink: 0;
      width: 36px;
      height: 36px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border: 1px solid var(--line);
      border-radius: 12px;
      background: rgba(255, 255, 255, 0.03);
      color: var(--gold-1);
      cursor: pointer;
      transition: background 0.2s ease, transform 0.2s ease;
    }
    .album-root .back-btn:hover { background: rgba(245, 197, 66, 0.1); }
    .album-root .back-btn:active { transform: scale(0.94); }

    /* ── 사진 · 영상 ──────────────────────── */

    .album-root .stage {
      max-width: 760px;
      margin: 0 auto;
      padding: 26px 20px 72px;
    }

    .album-root .photo-list {
      display: flex;
      flex-direction: column;
      gap: 30px;
    }

    .album-root .photo-entry { animation: fadeUp 0.6s ease both; }

    .album-root .photo__date {
      font-size: 0.76rem;
      font-weight: 700;
      letter-spacing: 0.16em;
      color: var(--gold-3);
    }
    .album-root .photo__title {
      margin: 4px 0 10px;
      font-size: 1.1rem;
      font-weight: 700;
      letter-spacing: -0.01em;
    }

    .album-root .photo__media {
      position: relative;
      border: 1px solid var(--line);
      border-radius: var(--radius);
      overflow: hidden;
      background: rgba(10, 12, 22, 0.72);
      min-height: 200px;
      box-shadow: 0 18px 40px rgba(0, 0, 0, 0.45);
    }
    .album-root .photo__media img,
    .album-root .photo__media video {
      width: 100%;
      display: block;
    }
    .album-root .photo__media video {
      min-height: 200px;
      object-fit: cover;
    }

    .album-root .img-loading {
      position: absolute;
      inset: 0;
      background: linear-gradient(90deg,
        rgba(255, 255, 255, 0.02) 25%,
        rgba(245, 197, 66, 0.08) 50%,
        rgba(255, 255, 255, 0.02) 75%);
      background-size: 200% 100%;
      animation: shimmer 1.8s ease-in-out infinite;
    }

    .album-root .play-overlay {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 0;
      background: rgba(5, 6, 12, 0.35);
      cursor: pointer;
    }
    .album-root .play-overlay span {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: linear-gradient(135deg, var(--gold-1), var(--gold-2) 55%, var(--gold-3));
      color: #14100a;
      box-shadow: 0 10px 30px rgba(245, 197, 66, 0.3);
      transition: transform 0.2s ease;
    }
    .album-root .play-overlay:hover span { transform: scale(1.06); }

    /* ── 비어 있는 상태 ───────────────────── */

    .album-root .empty {
      text-align: center;
      padding: 64px 20px;
    }
    .album-root .empty__icon {
      width: 62px;
      height: 62px;
      margin: 0 auto 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 1px solid var(--line);
      border-radius: 18px;
      background: rgba(255, 255, 255, 0.02);
      color: rgba(245, 197, 66, 0.55);
    }
    .album-root .empty p { margin: 0; color: var(--muted); }
    .album-root .empty p + p { margin-top: 6px; font-size: 0.86rem; color: var(--muted-dim); }

    /* ── 편지 ─────────────────────────────── */

    .album-root .panel {
      padding: 22px 20px;
      border: 1px solid var(--line);
      border-radius: var(--radius);
      background:
        linear-gradient(160deg, rgba(245, 197, 66, 0.07), rgba(255, 255, 255, 0.015) 45%),
        rgba(10, 12, 22, 0.72);
    }
    .album-root .panel__title {
      margin: 0 0 14px;
      font-size: 1.05rem;
      font-weight: 800;
      letter-spacing: -0.01em;
    }

    .album-root .field {
      width: 100%;
      padding: 13px 14px;
      margin-bottom: 10px;
      border: 1px solid rgba(255, 255, 255, 0.09);
      border-radius: 12px;
      background: rgba(5, 6, 12, 0.55);
      color: var(--text);
      font-family: inherit;
      font-size: 0.96rem;
      line-height: 1.6;
      outline: none;
      transition: border-color 0.2s ease, box-shadow 0.2s ease;
    }
    .album-root .field::placeholder { color: var(--muted-dim); }
    .album-root .field:focus {
      border-color: rgba(245, 197, 66, 0.5);
      box-shadow: 0 0 0 3px rgba(245, 197, 66, 0.1);
    }
    .album-root textarea.field { resize: vertical; min-height: 116px; }

    .album-root .toggle {
      display: flex;
      gap: 8px;
      margin: 4px 0 14px;
    }
    .album-root .toggle button {
      flex: 1;
      padding: 11px 8px;
      border: 1px solid rgba(255, 255, 255, 0.09);
      border-radius: 12px;
      background: rgba(5, 6, 12, 0.4);
      color: var(--muted);
      font-size: 0.88rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .album-root .toggle button[aria-pressed="true"] {
      border-color: rgba(245, 197, 66, 0.5);
      background: rgba(245, 197, 66, 0.1);
      color: var(--gold-1);
    }

    .album-root .letters {
      display: flex;
      flex-direction: column;
      gap: 14px;
      margin-top: 26px;
    }

    .album-root .letter {
      padding: 20px;
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: var(--radius);
      background: rgba(255, 255, 255, 0.02);
      animation: fadeUp 0.6s ease both;
    }
    .album-root .letter__top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      margin-bottom: 12px;
    }
    .album-root .letter__who {
      display: flex;
      align-items: center;
      gap: 10px;
      min-width: 0;
    }
    .album-root .letter__avatar {
      flex-shrink: 0;
      width: 34px;
      height: 34px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      background: linear-gradient(135deg, var(--gold-1), var(--gold-3));
      color: #14100a;
      font-size: 0.9rem;
      font-weight: 800;
    }
    .album-root .letter__name { font-weight: 700; }
    .album-root .letter__date { font-size: 0.78rem; color: var(--muted-dim); white-space: nowrap; }
    .album-root .letter__body {
      color: var(--text);
      font-size: 0.96rem;
      line-height: 1.85;
      white-space: pre-wrap;
    }
    .album-root .letter__locked {
      color: var(--muted);
      font-size: 0.9rem;
      font-style: italic;
    }
    .album-root .tag-lock {
      padding: 3px 9px;
      border: 1px solid var(--line);
      border-radius: 999px;
      background: rgba(245, 197, 66, 0.06);
      color: var(--gold-1);
      font-size: 0.72rem;
      font-weight: 700;
      white-space: nowrap;
    }
    .album-root .letter__del {
      margin-top: 12px;
      padding: 0;
      border: 0;
      background: none;
      color: var(--muted-dim);
      font-size: 0.78rem;
      cursor: pointer;
      transition: color 0.2s ease;
    }
    .album-root .letter__del:hover { color: var(--muted); }

    /* ── 토스트 ───────────────────────────── */

    .album-root .toast {
      position: fixed;
      left: 50%;
      bottom: 32px;
      transform: translateX(-50%);
      z-index: 100;
      padding: 12px 24px;
      border: 1px solid var(--line);
      border-radius: 999px;
      background: rgba(10, 12, 22, 0.92);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      color: var(--gold-1);
      font-size: 0.88rem;
      font-weight: 600;
      white-space: nowrap;
      box-shadow: 0 14px 34px rgba(0, 0, 0, 0.5);
      animation: fadeUp 0.4s ease both;
    }

    /* ── 스크롤 버튼 ──────────────────────── */

    .album-root .scroll-btns {
      position: fixed;
      right: 16px;
      bottom: 24px;
      z-index: 30;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .album-root .scroll-btn {
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 1px solid var(--line);
      border-radius: 50%;
      background: rgba(10, 12, 22, 0.8);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      color: var(--gold-2);
      cursor: pointer;
      transition: background 0.2s ease, transform 0.2s ease;
    }
    .album-root .scroll-btn:hover { background: rgba(245, 197, 66, 0.12); }
    .album-root .scroll-btn:active { transform: scale(0.9); }

    /* ── 푸터 ─────────────────────────────── */

    .album-root .footer {
      padding: 48px 22px 60px;
      text-align: center;
      border-top: 1px solid rgba(255, 255, 255, 0.06);
    }
    .album-root .footer__star { color: var(--gold-2); font-size: 1.1rem; }
    .album-root .footer__brand {
      margin: 8px 0 4px;
      font-weight: 700;
      letter-spacing: 0.06em;
      color: var(--gold-1);
    }
    .album-root .footer__copy { margin: 0; color: var(--muted-dim); font-size: 0.82rem; }

    /* ── 반응형 ───────────────────────────── */

    .album-root .br-d { display: none; }

    @media (max-width: 560px) {
      .album-root .nav__menu { gap: 14px; font-size: 0.88rem; }
      .album-root .hero__cta .btn { flex: 1 1 100%; }
      .album-root .card__badge { top: 10px; left: 10px; padding: 4px 9px; font-size: 0.68rem; }
    }

    @media (min-width: 561px) {
      .album-root .br-m { display: none; }
      .album-root .br-d { display: block; }
      .album-root .cards {
        grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
        gap: 18px;
      }
      .album-root .card__cover { aspect-ratio: 4 / 3; }
      .album-root .card__body { padding: 18px 20px 20px; }
      .album-root .card__name { font-size: 1.25rem; }
      .album-root .card__meta { font-size: 0.9rem; }
      .album-root .card__go { padding-top: 16px; font-size: 0.92rem; }
    }

    @media (prefers-reduced-motion: reduce) {
      .album-root *, .album-root *::before, .album-root *::after {
        animation-duration: 0.001ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.001ms !important;
      }
      .album-root .reveal { opacity: 1; transform: none; }
    }
  `}</style>
);

/* ═══════════════════════════════════
   메인
   ═══════════════════════════════════ */
export default function MainAlbum() {
  const [currentFolder, setCurrentFolder] = useState(null);
  const [page, setPage] = useState('album');
  const [photos, setPhotos] = useState([]);
  const [covers, setCovers] = useState({});
  const [letters, setLetters] = useState([]);
  const [transitioning, setTransitioning] = useState(false);

  useEffect(() => {
    fetch('/functions/api')
      .then(res => res.json())
      .then(data => setPhotos(data || []))
      .catch(() => {});
    fetch('/functions/api/covers')
      .then(res => res.json())
      .then(data => setCovers(data || {}))
      .catch(() => {});
    fetch('/functions/api/letters')
      .then(res => res.json())
      .then(data => setLetters(data || []))
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
    if (covers[String(folderId)]) return covers[String(folderId)];
    const items = allFolderItems[folderId] || [];
    const img = items.find(item => isImage(item.url));
    return img ? img.url : null;
  };

  const heroImage = useMemo(() => {
    for (const f of mockData.folders) {
      const cover = covers[String(f.id)];
      if (cover) return cover;
    }
    for (const f of mockData.folders) {
      const img = (allFolderItems[f.id] || []).find(item => isImage(item.url));
      if (img) return img.url;
    }
    return null;
  }, [covers, allFolderItems]);

  const navigate = (id) => {
    setTransitioning(true);
    setTimeout(() => {
      setCurrentFolder(id);
      setTransitioning(false);
      window.scrollTo({ top: 0 });
    }, 150);
  };

  const goToPage = (p) => {
    setTransitioning(true);
    setTimeout(() => {
      setPage(p);
      setCurrentFolder(null);
      setTransitioning(false);
      window.scrollTo({ top: 0 });
    }, 150);
  };

  const goHome = () => {
    if (page === 'album' && currentFolder === null) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    goToPage('album');
  };

  const totalRecords = useMemo(
    () => Object.values(allFolderItems).reduce((sum, items) => sum + items.length, 0),
    [allFolderItems]
  );
  const filledFolders = useMemo(
    () => mockData.folders.filter(f => (allFolderItems[f.id] || []).length > 0).length,
    [allFolderItems]
  );

  return (
    <div className="album-root">
      <Styles />
      <StarSky />
      <div className="glow" aria-hidden="true" />

      <Nav page={page} onHome={goHome} onLetters={() => goToPage('letters')} />

      <div style={{ opacity: transitioning ? 0 : 1, transition: 'opacity 0.15s ease' }}>
        {page === 'letters' ? (
          <LettersView letters={letters} setLetters={setLetters} onBack={() => goToPage('album')} />
        ) : currentFolder === null ? (
          <FolderListView
            folders={mockData.folders}
            allFolderItems={allFolderItems}
            getCoverImage={getCoverImage}
            heroImage={heroImage}
            totalRecords={totalRecords}
            filledFolders={filledFolders}
            letterCount={letters.length}
            onSelect={navigate}
            onLetters={() => goToPage('letters')}
          />
        ) : (
          <PhotoDetailView
            folder={selectedFolder}
            items={currentItems}
            onBack={() => navigate(null)}
          />
        )}
      </div>

      <Footer />
    </div>
  );
}

/* ═══════════════════════════════════
   상단 바 · 푸터
   ═══════════════════════════════════ */
function Nav({ page, onHome, onLetters }) {
  return (
    <header className="nav">
      <button className="nav__brand" onClick={onHome}>
        <span className="star" aria-hidden="true">✦</span>
        <span>한별이 앨범</span>
      </button>
      <nav className="nav__menu" aria-label="주요 메뉴">
        <button onClick={onHome} aria-current={page === 'album' ? 'page' : undefined}>앨범</button>
        <button onClick={onLetters} aria-current={page === 'letters' ? 'page' : undefined}>편지함</button>
      </nav>
    </header>
  );
}

function Footer() {
  return (
    <footer className="footer">
      <div className="footer__star" aria-hidden="true">✦</div>
      <p className="footer__brand">한별이 앨범</p>
      <p className="footer__copy">© {new Date().getFullYear()} inonestar. 우리 딸의 모든 순간.</p>
    </footer>
  );
}

/* ═══════════════════════════════════
   홈 — 히어로 · 월별 앨범 · 편지함
   ═══════════════════════════════════ */
function FolderListView({
  folders, allFolderItems, getCoverImage, heroImage,
  totalRecords, filledFolders, letterCount, onSelect, onLetters,
}) {
  const scrollToAlbum = () => {
    const el = document.getElementById('album');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <main>
      {/* 히어로 */}
      <section className="hero fade-up">
        <div className="hero__logo">
          {heroImage
            ? <img src={heroImage} alt="한별이" />
            : <span aria-hidden="true">✦</span>}
        </div>

        <p className="hero__brand">한별이 앨범</p>

        <div className="rule" aria-hidden="true">
          <span className="rule__line" />
          <span className="rule__star">✦</span>
          <span className="rule__line" />
        </div>

        <h1 className="hero__title">
          우리 딸 한별이의<br />
          모든 순간을 담습니다
        </h1>

        <p className="hero__handle">@한별이</p>

        <p className="hero__sub">
          하루하루 자라나는 작은 별,{' '}<br className="br-m" />
          그 반짝임을 달마다 차곡차곡 모았어요.
        </p>

        <div className="hero__cta">
          <button className="btn btn--gold" onClick={scrollToAlbum}>앨범 보러가기</button>
          <button className="btn btn--ghost" onClick={onLetters}>편지 남기기</button>
        </div>

        <button className="scroll-hint" onClick={scrollToAlbum} aria-label="아래로 스크롤">
          <span />
        </button>
      </section>

      {/* 월별 앨범 */}
      <Reveal id="album" className="section">
        <p className="section__eyebrow">ALBUM</p>
        <h2 className="section__title">월별 앨범</h2>
        <p className="section__desc">
          개월 수별로 담아 둔 한별이의 사진과 영상이에요.{' '}<br className="br-m" />
          보고 싶은 달을 눌러 보세요.
        </p>

        <div className="cards">
          {folders.map((folder, idx) => {
            const count = (allFolderItems[folder.id] || []).length;
            const cover = getCoverImage(folder.id);
            const hasPhotos = count > 0;

            return (
              <button
                key={folder.id}
                type="button"
                className={`card ${hasPhotos ? 'card--live' : 'card--soon'}`}
                style={{ animationDelay: `${Math.min(idx, 8) * 0.06}s` }}
                onClick={() => onSelect(folder.id)}
              >
                <span className="card__cover">
                  <span className={`card__badge ${hasPhotos ? '' : 'card__badge--soon'}`.trim()}>
                    {hasPhotos ? `${count}개의 기록` : '준비 중'}
                  </span>
                  {cover
                    ? <img src={cover} alt="" loading="lazy" />
                    : <span className="card__cover-empty" aria-hidden="true">✧</span>}
                </span>

                <span className="card__body">
                  <span className="card__eyebrow">{folder.label}</span>
                  <span className="card__name">{folder.name}</span>
                  <span className="card__meta">
                    {hasPhotos ? '사진과 영상이 담겨 있어요' : '아직 기록이 없어요'}
                  </span>
                  <span className={`card__go ${hasPhotos ? '' : 'card__go--muted'}`.trim()}>
                    {hasPhotos ? '앨범 열기' : '비어 있는 앨범'}
                    <IconArrow />
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </Reveal>

      {/* 기록 요약 */}
      <Reveal id="about" className="section">
        <p className="section__eyebrow">MEMORIES</p>
        <h2 className="section__title">지금까지 모인 순간들</h2>
        <p className="section__desc">
          작은 순간도 놓치지 않고,{' '}<br className="br-m" />
          오래도록 볼 수 있게 남겨 두고 있어요.
        </p>

        <div className="values">
          <div className="value">
            <span className="value__icon" aria-hidden="true">✦</span>
            <strong>{totalRecords}</strong>
            <p>담아 둔 사진과 영상</p>
          </div>
          <div className="value">
            <span className="value__icon" aria-hidden="true">✧</span>
            <strong>{filledFolders} / {mockData.folders.length}</strong>
            <p>기록이 채워진 월별 앨범</p>
          </div>
          <div className="value">
            <span className="value__icon" aria-hidden="true">★</span>
            <strong>{letterCount}</strong>
            <p>가족과 지인이 남긴 편지</p>
          </div>
        </div>
      </Reveal>

      {/* 편지함 */}
      <Reveal id="letters" className="section">
        <p className="section__eyebrow">LETTER</p>
        <h2 className="section__title">한별이 편지함</h2>
        <p className="section__desc">
          한별이가 자라서 읽어 볼 수 있도록,{' '}<br className="br-m" />
          따뜻한 마음을 한 통 남겨 주세요.
        </p>
        <button className="btn btn--gold" onClick={onLetters} style={{ marginTop: '28px' }}>
          <IconMail width="18" height="18" />
          편지 남기기
        </button>
      </Reveal>
    </main>
  );
}

/* ═══════════════════════════════════
   사진 상세
   ═══════════════════════════════════ */
function PhotoDetailView({ folder, items, onBack }) {
  return (
    <main>
      <div className="subhead">
        <div className="subhead__inner">
          <button className="back-btn" onClick={onBack} aria-label="목록으로 돌아가기">
            <IconBack />
          </button>
          <div>
            <div className="subhead__title">{folder?.name}</div>
            <div className="subhead__meta">{folder?.label} · {items.length}개의 기록</div>
          </div>
        </div>
      </div>

      <div className="stage">
        {items.length === 0 ? (
          <EmptyState
            title="아직 기록된 순간이 없어요"
            desc="곧 이 달의 이야기가 채워질 거예요."
          />
        ) : (
          <div className="photo-list">
            {items.map((item, index) => (
              <PhotoCard key={item.id || index} item={item} index={index} />
            ))}
          </div>
        )}

        {items.length > 0 && (
          <button
            className="btn btn--ghost"
            onClick={onBack}
            style={{ width: '100%', marginTop: '32px' }}
          >
            <IconBack />
            목록으로 돌아가기
          </button>
        )}
      </div>

      <ScrollButtons />
    </main>
  );
}

/* ═══════════════════════════════════
   사진 · 영상 카드
   ═══════════════════════════════════ */
function PhotoCard({ item, index }) {
  const [loaded, setLoaded] = useState(false);
  const [playing, setPlaying] = useState(false);
  const videoRef = useRef(null);
  const photo = isImage(item.url);

  return (
    <article className="photo-entry" style={{ animationDelay: `${Math.min(index, 8) * 0.06}s` }}>
      <div className="photo__date">{item.date}</div>
      <h3 className="photo__title">{item.title}</h3>

      <div className="photo__media">
        {!loaded && photo && <div className="img-loading" />}

        {photo ? (
          <img
            src={item.url}
            alt={item.title}
            loading="lazy"
            onLoad={() => setLoaded(true)}
            style={{ opacity: loaded ? 1 : 0, transition: 'opacity 0.5s ease' }}
          />
        ) : (
          <>
            <video
              ref={videoRef}
              src={item.url + '#t=0.5'}
              preload="metadata"
              playsInline
              controls={playing}
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
              onEnded={() => setPlaying(false)}
            />
            {!playing && (
              <button
                type="button"
                className="play-overlay"
                aria-label="영상 재생"
                onClick={() => {
                  const v = videoRef.current;
                  if (v) { v.currentTime = 0; v.play(); }
                }}
              >
                <span>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </span>
              </button>
            )}
          </>
        )}
      </div>
    </article>
  );
}

/* ═══════════════════════════════════
   위 · 아래 스크롤 버튼
   ═══════════════════════════════════ */
function ScrollButtons() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 300);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (!show) return null;

  return (
    <div className="scroll-btns">
      <button
        className="scroll-btn"
        aria-label="맨 위로"
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="m18 15-6-6-6 6" />
        </svg>
      </button>
      <button
        className="scroll-btn"
        aria-label="맨 아래로"
        onClick={() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
    </div>
  );
}

/* ═══════════════════════════════════
   비어 있는 상태
   ═══════════════════════════════════ */
function EmptyState({ title, desc, icon = 'image' }) {
  return (
    <div className="empty fade-up">
      <div className="empty__icon">
        {icon === 'mail'
          ? <IconMail width="26" height="26" />
          : <IconImage width="26" height="26" />}
      </div>
      <p>{title}</p>
      {desc && <p>{desc}</p>}
    </div>
  );
}

/* ═══════════════════════════════════
   편지함
   ═══════════════════════════════════ */
function LettersView({ letters, setLetters, onBack }) {
  const [author, setAuthor] = useState('');
  const [content, setContent] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState('');

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  };

  const canSend = Boolean(author.trim() && content.trim() && !sending);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!author.trim() || !content.trim()) {
      showToast('이름과 내용을 모두 입력해 주세요');
      return;
    }

    setSending(true);
    try {
      const res = await fetch('/functions/api/letters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ author: author.trim(), content: content.trim(), private: isPrivate })
      });
      const result = await res.json();
      if (result.success) {
        setLetters([
          {
            id: Date.now(),
            author: author.trim(),
            content: content.trim(),
            private: isPrivate,
            date: new Date().toISOString().split('T')[0],
          },
          ...letters,
        ]);
        setContent('');
        setIsPrivate(false);
        showToast('편지를 남겼어요');
      }
    } catch (_) {
      showToast('오류가 발생했어요');
    } finally {
      setSending(false);
    }
  };

  return (
    <main>
      <div className="subhead">
        <div className="subhead__inner">
          <button className="back-btn" onClick={onBack} aria-label="앨범으로 돌아가기">
            <IconBack />
          </button>
          <div>
            <div className="subhead__title">한별이에게 쓰는 편지</div>
            <div className="subhead__meta">{letters.length}개의 편지</div>
          </div>
        </div>
      </div>

      <div className="stage">
        {/* 편지 쓰기 */}
        <div className="panel fade-up">
          <h2 className="panel__title">편지 쓰기</h2>
          <form onSubmit={handleSubmit}>
            <input
              type="text"
              className="field"
              placeholder="보내는 사람 (예: 엄마, 아빠, 할머니)"
              value={author}
              onChange={e => setAuthor(e.target.value)}
            />
            <textarea
              className="field"
              placeholder="한별이에게 하고 싶은 말을 적어보세요..."
              value={content}
              onChange={e => setContent(e.target.value)}
              rows={4}
            />

            <div className="toggle">
              <button type="button" aria-pressed={!isPrivate} onClick={() => setIsPrivate(false)}>
                전체 공개
              </button>
              <button type="button" aria-pressed={isPrivate} onClick={() => setIsPrivate(true)}>
                🔒 한별이만 보기
              </button>
            </div>

            <button
              type="submit"
              className="btn btn--gold"
              disabled={!canSend}
              style={{ width: '100%' }}
            >
              {sending ? '보내는 중...' : '편지 남기기'}
            </button>
          </form>
        </div>

        {/* 편지 목록 */}
        {letters.length === 0 ? (
          <EmptyState
            icon="mail"
            title="아직 편지가 없어요"
            desc="첫 번째 편지를 남겨보세요"
          />
        ) : (
          <div className="letters">
            {letters.map((letter, idx) => (
              <article
                key={letter.id || idx}
                className="letter"
                style={{ animationDelay: `${Math.min(idx, 8) * 0.05}s` }}
              >
                <div className="letter__top">
                  <div className="letter__who">
                    <span className="letter__avatar">{(letter.author || '?').charAt(0)}</span>
                    <span className="letter__name">{letter.author}</span>
                    {letter.private && <span className="tag-lock">🔒 비공개</span>}
                  </div>
                  <span className="letter__date">{letter.date}</span>
                </div>

                {letter.private ? (
                  <div className="letter__locked">🔒 한별이만 볼 수 있는 편지예요</div>
                ) : (
                  <div className="letter__body">{letter.content}</div>
                )}

                <div style={{ textAlign: 'right' }}>
                  <button
                    className="letter__del"
                    onClick={() => {
                      alert('관리자만 삭제할 수 있습니다.\n삭제를 원하시면 한별이 엄마에게 문의해주세요.');
                    }}
                  >
                    삭제
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      {toast && <div className="toast">{toast}</div>}

      <ScrollButtons />
    </main>
  );
}
