import { useEffect, useRef, useState } from "react";
import { Engine } from "./game/engine";
import { store } from "./game/store";
import { useSnap } from "./components/HUD";
import HUD from "./components/HUD";
import { MenuScreen, PauseScreen, GameOverScreen, Banner, TouchControls } from "./components/Screens";

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [engine, setEngine] = useState<Engine | null>(null);
  const s = useSnap();

  useEffect(() => {
    if (!canvasRef.current) return;
    const e = new Engine(canvasRef.current);
    setEngine(e);

    const onKeyDown = (evt: KeyboardEvent) => {
      if (evt.code === "KeyF" || evt.key === "f" || evt.key === "F") {
        const target = evt.target as HTMLElement | null;
        if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
        evt.preventDefault();
        e.toggleFullscreen();
      }
    };

    const onFsChange = () => {
      store.set({ fullscreen: !!document.fullscreenElement });
    };

    window.addEventListener("keydown", onKeyDown);
    document.addEventListener("fullscreenchange", onFsChange);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("fullscreenchange", onFsChange);
      e.destroy();
    };
  }, []);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-swamp select-none">
      <canvas ref={canvasRef} className="game-canvas absolute inset-0" />

      {/* menu atmosphere: tactical grid + ruined-sector silhouettes */}
      {s.phase === "menu" && (
        <div className="absolute inset-0 z-[5] pointer-events-none" aria-hidden>
          <div className="tac-grid absolute inset-0" />
          <div className="silhouette-fade absolute inset-x-0 bottom-0 h-[36vh] min-h-[210px]">
            <svg className="w-full h-full" viewBox="0 0 1440 300" preserveAspectRatio="xMidYMax slice">
              <g fill="#0d150e" opacity="0.55">
                <rect x="0" y="150" width="70" height="150" />
                <rect x="80" y="110" width="54" height="190" />
                <rect x="150" y="170" width="90" height="130" />
                <rect x="262" y="92" width="46" height="208" />
                <rect x="330" y="140" width="72" height="160" />
                <rect x="430" y="60" width="40" height="240" />
                <rect x="492" y="150" width="100" height="150" />
                <rect x="620" y="110" width="58" height="190" />
                <rect x="700" y="170" width="80" height="130" />
                <rect x="806" y="86" width="50" height="214" />
                <rect x="880" y="150" width="94" height="150" />
                <rect x="1000" y="120" width="60" height="180" />
                <rect x="1080" y="70" width="44" height="230" />
                <rect x="1150" y="160" width="86" height="140" />
                <rect x="1260" y="104" width="56" height="196" />
                <rect x="1340" y="150" width="100" height="150" />
              </g>
              <g stroke="#0d150e" strokeWidth="4" opacity="0.55">
                <line x1="450" y1="60" x2="450" y2="14" />
                <line x1="1102" y1="70" x2="1102" y2="26" />
                <line x1="830" y1="86" x2="852" y2="34" />
              </g>
              <circle cx="450" cy="12" r="3.5" fill="#e5222e" className="blink-lamp" />
              <path
                fill="#060b07"
                opacity="0.9"
                d="M0 300V236l58-14 40 18 64-30 52 12 30-22 70 26 46-12 60 20 52-26 66 18 44-10 58 24 70-20 48 14 62-24 54 16 66-12 46 20 60-16 56 12 62-22 50 18 44-8 56 16 34-12v104z"
              />
              <g stroke="#060b07" strokeWidth="7" opacity="0.9">
                <line x1="1180" y1="238" x2="1230" y2="120" />
                <line x1="1230" y1="120" x2="1330" y2="150" />
                <line x1="1230" y1="120" x2="1160" y2="140" />
              </g>
            </svg>
          </div>
        </div>
      )}

      {/* atmosphere + feedback overlays */}
      <div className="vignette absolute inset-0 z-10" />
      <div className="grain absolute inset-0 z-10" />
      <div className="scanlines absolute inset-0 z-10" />
      <div className="hurt-flash absolute inset-0 z-10" style={{ opacity: s.hurt * 0.9 }} />
      {s.lowHp && s.phase === "playing" && <div className="lowhp-vignette absolute inset-0 z-10" />}

      <HUD />
      <Banner />
      <TouchControls engine={engine} />

      <MenuScreen engine={engine} />
      <PauseScreen engine={engine} />
      <GameOverScreen engine={engine} />
    </div>
  );
}
