import { useRef, useState, type PointerEvent as RPointerEvent } from "react";
import { DIFFS, type Engine } from "../game/engine";
import type { Difficulty } from "../game/store";
import { useSnap } from "./HUD";
import { sfx } from "../game/audio";

/* --------------------------------- helpers --------------------------------- */

function SpeakerIcon({ muted, className = "w-4 h-4" }: { muted: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M4 9v6h4l6 5V4L8 9H4Z" />
      {muted ? (
        <path d="m16.5 8.5 5 7m0-7-5 7" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
      ) : (
        <path d="M16 8a5 5 0 0 1 0 8M18.5 5.5a9 9 0 0 1 0 13" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
      )}
    </svg>
  );
}

function Drips() {
  return (
    <svg
      className="absolute left-0 right-0 -bottom-5 h-8 w-full pointer-events-none"
      viewBox="0 0 400 32"
      preserveAspectRatio="none"
      aria-hidden
    >
      {[
        [22, 26, 0],
        [70, 14, 0.8],
        [118, 30, 1.6],
        [168, 12, 0.4],
        [215, 22, 2.2],
        [262, 16, 1.1],
        [308, 28, 0.2],
        [355, 13, 1.9],
      ].map(([x, h, d], i) => (
        <path
          key={i}
          className="drip-anim"
          style={{ animationDelay: `${d}s` }}
          d={`M${x - 4} 0 Q${x} ${h} ${x + 4} 0 Z`}
          fill="#a51420"
        />
      ))}
    </svg>
  );
}

function ThreatRow({ color, name, desc, threat, score }: { color: string; name: string; desc: string; threat: number; score: string }) {
  return (
    <div className="flex items-center gap-3 py-2 border-b border-toxic/10 last:border-0">
      <span className="relative w-3 h-3 shrink-0">
        <span className="absolute inset-0 rounded-full" style={{ background: color, boxShadow: `0 0 10px ${color}` }} />
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="font-bold text-[13px] text-bone tracking-wide">{name}</span>
          <span className="text-[10px] font-bold text-bone/40 tabular-nums">+{score}</span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] text-bone/50 truncate">{desc}</span>
          <span className="flex gap-0.5 shrink-0">
            {Array.from({ length: 5 }).map((_, i) => (
              <span key={i} className={`w-1 h-2.5 skew-x-[-12deg] ${i < threat ? "bg-blood" : "bg-bone/15"}`} />
            ))}
          </span>
        </div>
      </div>
    </div>
  );
}

function ControlsRow({ keys, label }: { keys: string[]; label: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <span className="flex gap-1 flex-wrap">
        {keys.map((k) => (
          <kbd key={k} className="keycap chamfer-sm">
            {k}
          </kbd>
        ))}
      </span>
      <span className="text-[12px] text-bone/60 font-semibold">{label}</span>
    </div>
  );
}

/* ---------------------------------- banner ---------------------------------- */

export function Banner() {
  const s = useSnap();
  if (!s.banner || (s.phase !== "playing" && s.phase !== "paused")) return null;
  const tone =
    s.banner.tone === "blood"
      ? "text-blood"
      : s.banner.tone === "bone"
        ? "text-bone"
        : "text-acid";
  const glow =
    s.banner.tone === "blood"
      ? "0 0 40px rgba(229,34,46,0.6)"
      : s.banner.tone === "bone"
        ? "0 0 40px rgba(232,224,200,0.4)"
        : "0 0 40px rgba(163,245,46,0.55)";
  return (
    <div className="absolute top-[22%] inset-x-0 z-30 flex flex-col items-center pointer-events-none">
      <div key={s.banner.key} className="banner-anim text-center">
        <div className={`font-display text-6xl md:text-7xl ${tone}`} style={{ textShadow: glow }}>
          {s.banner.text}
        </div>
        <div className="stencil text-sm text-bone/70 mt-2">{s.banner.sub}</div>
      </div>
    </div>
  );
}

/* ---------------------------------- screens ---------------------------------- */

interface ScreenProps {
  engine: Engine | null;
}

export function MenuScreen({ engine }: ScreenProps) {
  const s = useSnap();
  if (s.phase !== "menu") return null;
  return (
    <div className="absolute inset-0 z-40 font-ui overflow-y-auto" style={{ background: "radial-gradient(ellipse at 50% 38%, rgba(6,10,7,0.55) 0%, rgba(4,7,5,0.93) 78%)" }}>
      <div className="min-h-full flex flex-col items-center justify-center px-4 py-8">
        <div className="rise-in text-center">
          <div className="stencil text-[11px] text-blood tracking-[0.4em] mb-3">
            ⚠ Sector 9 // Quarantine Protocol 7-Δ
          </div>
          <h1 className="relative inline-block font-display text-7xl md:text-8xl text-toxic title-flicker leading-none">
            DEAD SECTOR
            <Drips />
          </h1>
          <p className="mt-7 text-[13px] md:text-sm text-bone/60 max-w-md mx-auto font-medium tracking-wide">
            The wire is breached. Run the open sector, use the wrecks for cover,
            and out-gun the horde — <span className="text-acid font-bold">every wave is worse than the last.</span>
          </p>
        </div>

        <div className="rise-in rise-in-1 mt-8 flex flex-col items-center">
          <div className="stencil text-[9px] text-bone/40 mb-2">Select difficulty</div>
          <div className="flex gap-2">
            {(["recruit", "veteran", "nightmare"] as Difficulty[]).map((k) => {
              const active = s.difficulty === k;
              const cls = !active
                ? "btn-ghost opacity-70"
                : k === "nightmare"
                  ? "btn-danger"
                  : k === "recruit"
                    ? "btn-ghost"
                    : "btn-primary";
              return (
                <button
                  key={k}
                  onClick={() => engine?.setDifficulty(k)}
                  className={`chamfer-sm px-5 py-2.5 text-[12px] transition-all duration-150 ${cls}`}
                  style={
                    active && k === "recruit"
                      ? { color: "#e8e0c8", borderColor: "rgba(232,224,200,0.8)", boxShadow: "0 0 18px rgba(232,224,200,0.25)" }
                      : undefined
                  }
                >
                  {DIFFS[k].label}
                </button>
              );
            })}
          </div>
          <div className="stencil text-[9px] text-bone/45 mt-2">{DIFFS[s.difficulty].blurb}</div>
        </div>

        <div className="rise-in rise-in-2 mt-5 flex items-center gap-3">
          <button
            onClick={() => engine?.start()}
            className="btn-primary chamfer px-10 py-4 text-lg"
          >
            ▸ Deploy
          </button>
          <button
            onClick={() => engine?.toggleMute()}
            className="btn-ghost chamfer-sm p-4"
            title="Toggle sound (M)"
          >
            <SpeakerIcon muted={s.muted} />
          </button>
        </div>
        <div className="rise-in rise-in-1 stencil text-[9px] text-bone/35 mt-2">Enter — deploy · M — sound</div>

        <div className="rise-in rise-in-2 mt-8 grid md:grid-cols-2 gap-3 w-full max-w-2xl">
          <div className="hud-panel chamfer p-5">
            <div className="stencil text-[10px] text-toxic/80 mb-2 flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-toxic inline-block" /> Field Manual
            </div>
            <ControlsRow keys={["W", "A", "S", "D"]} label="Move through the sector" />
            <ControlsRow keys={["SHIFT"]} label="Sprint (drains stamina)" />
            <ControlsRow keys={["MOUSE"]} label="Aim · hold LMB to fire" />
            <ControlsRow keys={["SPACE"]} label="Combat dash (i-frames)" />
            <ControlsRow keys={["R"]} label="Reload" />
            <ControlsRow keys={["P"]} label="Pause" />
            <p className="text-[11px] text-bone/45 mt-3 leading-relaxed">
              Weapons upgrade automatically at <span className="text-acid font-bold">12 / 35 / 75 / 140</span> kills.
              Chain kills within 2.2s to build a <span className="text-ember font-bold">×5 score combo</span>.
            </p>
          </div>
          <div className="hud-panel chamfer p-5">
            <div className="stencil text-[10px] text-toxic/80 mb-2 flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-blood inline-block" /> Threat Intel
            </div>
            <ThreatRow color="#5d8f3a" name="WALKER" desc="Slow. Relentless. Bites in packs." threat={1} score="10" />
            <ThreatRow color="#b3502e" name="RUNNER" desc="Fast twitch muscle — flanks you." threat={2} score="15" />
            <ThreatRow color="#8fb32e" name="SPITTER" desc="Keeps range, lobs acid." threat={3} score="25" />
            <ThreatRow color="#6e3b4a" name="BRUTE" desc="Armored slab. Hits like a truck." threat={4} score="60" />
            <ThreatRow color="#7a1f2b" name="ABOMINATION" desc="Appears every 5th wave. Pray." threat={5} score="500" />
          </div>
        </div>

        <div className="rise-in rise-in-3 mt-4 flex items-center gap-6 hud-panel chamfer-sm px-6 py-3">
          <div className="text-center">
            <div className="stencil text-[9px] text-bone/40">Best Score</div>
            <div className="font-extrabold text-xl text-acid tabular-nums">{s.best.toLocaleString()}</div>
          </div>
          <div className="w-px h-8 bg-toxic/15" />
          <div className="text-center">
            <div className="stencil text-[9px] text-bone/40">Best Wave</div>
            <div className="font-extrabold text-xl text-bone tabular-nums">{s.bestWave}</div>
          </div>
          <div className="w-px h-8 bg-toxic/15" />
          <div className="text-center max-w-[190px]">
            <div className="stencil text-[9px] text-bone/40">Supply Drops</div>
            <div className="text-[11px] text-bone/60 font-semibold">Medkits · Frenzy · Hollow-points · Shields · Nukes</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function PauseScreen({ engine }: ScreenProps) {
  const s = useSnap();
  if (s.phase !== "paused") return null;
  return (
    <div className="absolute inset-0 z-40 font-ui flex items-center justify-center" style={{ background: "rgba(3,6,4,0.82)" }}>
      <div className="hud-panel chamfer p-8 w-[min(420px,92vw)] rise-in">
        <div className="stencil text-[10px] text-toxic/70 mb-1">Operation suspended</div>
        <h2 className="font-display text-5xl text-bone leading-none mb-6">PAUSED</h2>
        <div className="flex flex-col gap-2.5">
          <button onClick={() => engine?.resume()} className="btn-primary chamfer-sm px-6 py-3">
            ▸ Resume
          </button>
          <button onClick={() => engine?.start()} className="btn-ghost chamfer-sm px-6 py-3">
            Restart Run
          </button>
          <div className="grid grid-cols-2 gap-2.5">
            <button onClick={() => engine?.toMenu()} className="btn-ghost chamfer-sm px-4 py-3 text-[12px]">
              Abandon
            </button>
            <button onClick={() => engine?.toggleMute()} className="btn-ghost chamfer-sm px-4 py-3 text-[12px] flex items-center justify-center gap-2">
              <SpeakerIcon muted={s.muted} /> {s.muted ? "Unmute" : "Mute"}
            </button>
          </div>
        </div>
        <div className="mt-5 pt-4 border-t border-toxic/10 text-[11px] text-bone/45 leading-relaxed">
          <kbd className="keycap chamfer-sm mr-1.5">P</kbd>/<kbd className="keycap chamfer-sm mx-1.5">ESC</kbd> resume ·{" "}
          <kbd className="keycap chamfer-sm mx-1.5">SPACE</kbd> dash · <kbd className="keycap chamfer-sm ml-1.5">R</kbd> reload
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="bg-black/30 chamfer-sm px-4 py-3 border border-toxic/10">
      <div className="stencil text-[9px] text-bone/40">{label}</div>
      <div className={`font-extrabold text-xl tabular-nums ${accent ? "text-acid" : "text-bone"}`}>{value}</div>
    </div>
  );
}

export function GameOverScreen({ engine }: ScreenProps) {
  const s = useSnap();
  if (s.phase !== "gameover" || !s.stats) return null;
  const st = s.stats;
  const mm = Math.floor(st.time / 60);
  const ss = Math.floor(st.time % 60).toString().padStart(2, "0");
  return (
    <div className="absolute inset-0 z-40 font-ui flex items-center justify-center" style={{ background: "radial-gradient(ellipse at center, rgba(60,5,9,0.55) 0%, rgba(5,3,3,0.94) 75%)" }}>
      <div className="w-[min(480px,94vw)] text-center">
        <div className="rise-in stencil text-[10px] text-blood tracking-[0.4em] mb-2">Vitals flatlined</div>
        <h2 className="rise-in font-display text-8xl text-blood leading-none" style={{ textShadow: "0 0 50px rgba(229,34,46,0.55), 0 5px 0 #2a0508" }}>
          OVERRUN
        </h2>
        {st.newBest && (
          <div className="rise-in rise-in-1 inline-block mt-4 stencil text-[11px] text-black bg-acid px-4 py-1.5 chamfer-sm" style={{ boxShadow: "0 0 24px rgba(212,255,77,0.5)" }}>
            ★ New record — {st.best.toLocaleString()}
          </div>
        )}
        <div className="rise-in rise-in-1 hud-panel chamfer p-5 mt-5">
          <div className="flex items-baseline justify-center gap-2 mb-4">
            <span className="font-extrabold text-5xl text-acid tabular-nums">{st.score.toLocaleString()}</span>
            <span className="stencil text-[10px] text-bone/40">pts</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Stat label="Wave Reached" value={String(st.wave)} />
            <Stat label="Kills" value={st.kills.toLocaleString()} />
            <Stat label="Best Combo" value={`×${(1 + Math.min(st.maxCombo, 40) * 0.1).toFixed(1)} (${st.maxCombo})`} />
            <Stat label="Accuracy" value={`${Math.round(st.accuracy * 100)}%`} />
            <Stat label="Time Survived" value={`${mm}:${ss}`} />
            <Stat label="Best Score" value={st.best.toLocaleString()} accent />
          </div>
        </div>
        <div className="rise-in rise-in-2 mt-5 flex items-center justify-center gap-3">
          <button onClick={() => engine?.start()} className="btn-danger chamfer px-8 py-3.5">
            ▸ Re-deploy
          </button>
          <button onClick={() => engine?.toMenu()} className="btn-ghost chamfer-sm px-6 py-3.5">
            Menu
          </button>
        </div>
        <div className="rise-in rise-in-3 stencil text-[9px] text-bone/35 mt-3">Enter — instant retry</div>
      </div>
    </div>
  );
}

/* -------------------------------- touch UI -------------------------------- */

export function TouchControls({ engine }: ScreenProps) {
  const s = useSnap();
  const [joy, setJoy] = useState<{ ox: number; oy: number; dx: number; dy: number } | null>(null);
  const [sprintOn, setSprintOn] = useState(false);
  const zoneRef = useRef<HTMLDivElement>(null);
  if (!engine?.isTouch || (s.phase !== "playing" && s.phase !== "paused")) return null;

  const MAX = 48;

  const onDown = (e: RPointerEvent<HTMLDivElement>) => {
    sfx.unlock();
    zoneRef.current?.setPointerCapture(e.pointerId);
    setJoy({ ox: e.clientX, oy: e.clientY, dx: 0, dy: 0 });
    engine.setTouchMove(0, 0, true);
  };
  const onMove = (e: RPointerEvent<HTMLDivElement>) => {
    if (!joy) return;
    let dx = e.clientX - joy.ox;
    let dy = e.clientY - joy.oy;
    const l = Math.hypot(dx, dy);
    if (l > MAX) {
      dx = (dx / l) * MAX;
      dy = (dy / l) * MAX;
    }
    setJoy({ ...joy, dx, dy });
    engine.setTouchMove(dx / MAX, dy / MAX, true);
  };
  const onUp = () => {
    setJoy(null);
    engine.setTouchMove(0, 0, false);
  };

  return (
    <div className="absolute inset-0 z-30 pointer-events-none">
      <div
        ref={zoneRef}
        className="absolute left-0 bottom-0 w-1/2 h-[62%] pointer-events-auto"
        style={{ touchAction: "none" }}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
      >
        {joy ? (
          <div className="absolute" style={{ left: joy.ox - 56, top: joy.oy - 56, width: 112, height: 112 }}>
            <div className="absolute inset-0 rounded-full border-2 border-toxic/40 bg-toxic/5" />
            <div
              className="absolute rounded-full bg-toxic/60"
              style={{ left: 56 - 20 + joy.dx, top: 56 - 20 + joy.dy, width: 40, height: 40 }}
            />
          </div>
        ) : (
          <div className="absolute left-8 bottom-24 w-24 h-24 rounded-full border-2 border-toxic/25 flex items-center justify-center">
            <span className="stencil text-[9px] text-toxic/50">Move</span>
          </div>
        )}
      </div>
      <button
        className="absolute top-24 left-1/2 -translate-x-1/2 btn-ghost chamfer-sm px-4 py-2 text-[11px] pointer-events-auto"
        onPointerDown={() => engine.pause()}
      >
        ❚❚ Pause
      </button>
      <div className="absolute right-6 bottom-20 flex flex-col items-end gap-4 pointer-events-auto" style={{ touchAction: "none" }}>
        <button
          className="btn-ghost chamfer-sm px-5 py-3 text-[12px]"
          onPointerDown={() => engine.dashAction()}
        >
          Dash
        </button>
        <button
          className={`chamfer-sm px-5 py-3 text-[12px] ${sprintOn ? "btn-primary" : "btn-ghost"}`}
          onPointerDown={() => {
            const next = !sprintOn;
            setSprintOn(next);
            engine.setTouchSprint(next);
          }}
        >
          {sprintOn ? "Sprint ●" : "Sprint"}
        </button>
        <button
          className="btn-primary chamfer w-24 h-24 rounded-full! text-sm"
          onPointerDown={() => {
            sfx.unlock();
            engine.setTouchFire(true);
          }}
          onPointerUp={() => engine.setTouchFire(false)}
          onPointerCancel={() => engine.setTouchFire(false)}
          onPointerLeave={() => engine.setTouchFire(false)}
        >
          Fire
        </button>
      </div>
    </div>
  );
}
