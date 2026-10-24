import { useEffect } from "react";
import { useSearchParams } from "react-router";
import { Button } from "../../components/ui/button";
import { AuthOverlay } from "../auth/AuthOverlay";

export function HomePage() {
  const [params, setParams] = useSearchParams();
  const auth = params.get("auth");
  const mode = auth === "signup" ? "signup" : auth === "signin" ? "signin" : undefined;

  useEffect(() => {
    const onMove = (event: MouseEvent) => { const coin = document.querySelector<HTMLElement>(".coin"); if (!coin || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return; const x = (event.clientX / window.innerWidth - .5) * 20; const y = (event.clientY / window.innerHeight - .5) * -20; coin.style.setProperty("--ry", `${x}deg`); coin.style.setProperty("--rx", `${y}deg`); };
    window.addEventListener("mousemove", onMove); return () => window.removeEventListener("mousemove", onMove);
  }, []);

  const open = (next: "signin" | "signup") => setParams({ auth: next });
  const close = () => setParams({});

  return <main className="home">
    <nav className="topbar" aria-label="Account actions">
      <Button className="sw-button sw-button--quiet" onClick={() => open("signin")} variant="ghost">Sign in</Button>
      <Button className="sw-button sw-button--primary" onClick={() => open("signup")}>Sign up</Button>
    </nav>
    <section className="hero" aria-labelledby="home-title">
      <div className="hero-content"><div className="eyebrow">01 / Stock and customer credit</div><h1 className="wordmark" id="home-title"><span>STOCK</span> <span>WISE</span></h1><p className="tagline">A clearer ledger for the shop you keep moving.</p></div>
      <div className="coin" aria-hidden="true">₦</div>
    </section>
    {mode && <AuthOverlay mode={mode} onClose={close} onModeChange={open} />}
  </main>;
}
