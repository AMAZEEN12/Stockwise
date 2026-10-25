import { useRef } from 'react';
import { Link, Outlet } from 'react-router';
import { nairaCoin } from '../../assets/images';

export function HomePage() {
  const coin = useRef<HTMLDivElement>(null);
  return (
    <div className="home-shell" onPointerMove={(event) => {
      if (event.pointerType !== 'mouse' || !coin.current) return;
      const x = (event.clientX / window.innerWidth - 0.5) * 24;
      const y = (event.clientY / window.innerHeight - 0.5) * -24;
      coin.current.style.setProperty('--tilt-x', `${y}deg`);
      coin.current.style.setProperty('--tilt-y', `${x}deg`);
    }} onPointerLeave={() => {
      coin.current?.style.setProperty('--tilt-x', '0deg');
      coin.current?.style.setProperty('--tilt-y', '0deg');
    }}>
      <header className="home-header">
        <nav aria-label="Account" className="flex items-center gap-3">
          <Link to="/sign-in" className="account-link account-secondary">Sign in</Link>
          <Link to="/sign-up" className="account-link account-primary">Sign up</Link>
        </nav>
      </header>
      <main className="home-main">
        <h1 className="wordmark" aria-label="Stockwise">
          <svg viewBox="0 0 1344 368" aria-hidden="true" focusable="false">
            <text x="0" y="172" textLength="1177" lengthAdjust="spacingAndGlyphs">STOCK</text>
            <text className="wordmark-outline" x="0" y="356" textLength="892" lengthAdjust="spacingAndGlyphs">WISE</text>
          </svg>
        </h1>
        <div ref={coin} className="coin-position" aria-hidden="true"><div className="coin-sway"><img src={nairaCoin} alt="" width="340" height="340" draggable="false" /></div></div>
        <div className="home-copy">
          <h2>Know your stock<br />Trust your <em>credit</em></h2>
        </div>
      </main>
      <Outlet />
    </div>
  );
}
