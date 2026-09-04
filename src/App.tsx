import { useEffect, useRef, useState } from "react";
import { Engine } from "./game/engine";
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
    return () => e.destroy();
  }, []);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-swamp select-none">
      <canvas ref={canvasRef} className="game-canvas absolute inset-0" />

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
