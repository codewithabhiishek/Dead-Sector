import { useRef, useState, type PointerEvent as RPointerEvent } from "react";
import { useSnap } from "./HUD";
import type { Engine } from "../game/engine";
import { DIFFS } from "../game/engine";
import type { Difficulty } from "../game/store";

export type ScreenProps = { engine: Engine | null };

/* ------------------------------- inline icons ------------------------------- */

function SkullIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2C7 2 3.5 5.7 3.5 10.4c0 2.7 1.3 4.7 3 6v3.1c0 .8.7 1.5 1.5 1.5h1v-2h1.5v2h3v-2H15v2h1c.8 0 1.5-.7 1.5-1.5v-3.1c1.7-1.3 3-3.3 3-6C20.5 5.7 17 2 12 2zM8.7 13.2a2 2 0 1 1 0-4 2 2 0 0 1 0 4zm6.6 0a2 2 0 1 1 0-4 2 2 0 0 1 0 4zM12 14l1.3 2.6h-2.6L12 14z" />
    </svg>
  );
}

function SoundIcon({ muted, className = "w-5 h-5" }: { muted: boolean; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M11 5 6 9H3v6h3l5 4V5z" fill="currentColor" stroke="none" />
      {muted ? (
        <>
          <line x1="16" y1="9" x2="22" y2="15" />
          <line x1="22" y1="9" x2="16" y2="15" />
        </>
      ) : (
        <>
          <path d="M15.5 8.5a5 5 0 0 1 0 7" />
          <path d="M18.5 6a9 9 0 0 1 0 12" />
        </>
      )}
    </svg>
  );
}

function PlayIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M7 4.5v15l13-7.5-13-7.5z" />
    </svg>
  );
}

function CrosshairIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
      <circle cx="12" cy="12" r="7" />
      <line x1="12" y1="2" x2="12" y2="6" />
      <line x1="12" y1="18" x2="12" y2="22" />
      <line x1="2" y1="12" x2="6" y2="12" />
      <line x1="18" y1="12" x2="22" y2="12" />
    </svg>
  );
}

function TargetIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="3.5" />
      <circle cx="12" cy="12" r="0.8" fill="currentColor" />
    </svg>
  );
}

/* ------------------------------ shared bits ------------------------------ */

function ThreatPips({ level }: { level: number }) {
  return (
    <span className="flex items-end gap-[3px]" aria-label={`threat level ${level} of 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          className="w-[4px] rounded-[1px]"
          style={{
            height: `${5 + i * 2}px`,
            background: i <= level ? (level >= 4 ? "#e5222e" : level === 3 ? "#ffb347" : "#a3f52e") : "rgba(232,224,200,0.14)",
            boxShadow: i <= level && level >= 4 ? "0 0 5px rgba(229,34,46,0.7)" : "none",
          }}
        />
      ))}
    </span>
  );
}

/* ------------------------------- menu screen ------------------------------- */

export function MenuScreen({ engine }: ScreenProps) {
  const s = useSnap();
  if (s.phase !== "menu") return null;

  const controls: { label: string; keys: string[]; desc: string }[] = [
    { label: "Move", keys: ["W", "A", "S", "D"], desc: "Run the sector" },
    { label: "Sprint", keys: ["SHIFT"], desc: "Burns stamina" },
    { label: "Aim · Fire", keys: ["MOUSE", "LMB"], desc: "Hold for full-auto" },
    { label: "Combat Dash", keys: ["SPACE"], desc: "Brief invulnerability" },
    { label: "Reload", keys: ["R"], desc: "Or auto when dry" },
    { label: "Pause", keys: ["P"], desc: "Esc also works" },
  ];

  const threats: { name: string; color: string; blurb: string; score: number; threat: number; icon: React.ReactNode }[] = [
    { name: "WALKER", color: "#8fb05e", blurb: "Slow · relentless · swarms in numbers", score: 10, threat: 1, icon: <SkullIcon className="w-4 h-4" /> },
    { name: "RUNNER", color: "#e8a33d", blurb: "Fast flanker — closes distance quick", score: 15, threat: 2, icon: <SkullIcon className="w-4 h-4" /> },
    { name: "SPITTER", color: "#cdeb45", blurb: "Lobs corrosive acid from range", score: 25, threat: 3, icon: <SkullIcon className="w-4 h-4" /> },
    { name: "BRUTE", color: "#d97b7b", blurb: "Armored — heavy hits, hard to drop", score: 60, threat: 4, icon: <SkullIcon className="w-4 h-4" /> },
    { name: "ABOMINATION", color: "#ff5257", blurb: "Boss · plasma volley · every 5th wave", score: 500, threat: 5, icon: <SkullIcon className="w-5 h-5" /> },
  ];

  return (
    <div className="absolute inset-0 z-20 overflow-y-auto overflow-x-hidden">
      {/* readability scrim behind the header */}
      <div className="title-scrim absolute inset-x-0 top-0 h-[52vh] pointer-events-none" />

      <div className="relative min-h-full flex flex-col items-center px-4 sm:px-8 py-7 sm:py-10">
        {/* quarantine bar */}
        <div className="hazard-stripe h-[3px] w-full max-w-[560px] opacity-70 rise-in" />

        {/* classification strip */}
        <div className="mt-4 flex items-center gap-2.5 rise-in">
          <span className="w-1.5 h-1.5 bg-blood blink-lamp shadow-[0_0_8px_#e5222e]" />
          <span className="stencil text-[9px] sm:text-[10px] text-blood/90">
            Classified · Biohazard Level 4 · Eyes Only
          </span>
          <span className="w-1.5 h-1.5 bg-blood blink-lamp shadow-[0_0_8px_#e5222e]" />
        </div>

        {/* title */}
        <h1 className="title-flicker font-display text-toxic leading-none mt-4 text-center text-[clamp(3.2rem,10.5vw,7rem)] rise-in rise-in-1">
          DEAD SECTOR
        </h1>
        <div className="mt-2.5 flex items-center gap-3 rise-in rise-in-1">
          <span className="h-px w-10 sm:w-16 bg-toxic/40" />
          <span className="stencil text-[10px] sm:text-[11px] text-bone/70">Sector 9 · Quarantine Protocol</span>
          <span className="h-px w-10 sm:w-16 bg-toxic/40" />
        </div>
        <p className="mt-5 max-w-md text-center text-[13px] sm:text-sm text-bone/65 font-medium tracking-wide leading-relaxed rise-in rise-in-2">
          The wire is breached. Run the open sector, use the wrecks for cover, and out-gun the
          horde — <span className="text-acid font-bold">survive all 10 waves.</span>
        </p>

        {/* difficulty selector */}
        <section className="mt-8 w-full max-w-[432px] rise-in rise-in-2" aria-label="Difficulty selection">
          <div className="flex items-center justify-between mb-2 px-0.5">
            <span className="stencil text-[9px] text-bone/45">Select Difficulty</span>
            <span className="stencil text-[9px] text-bone/30">03 Protocols</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {(["recruit", "veteran", "nightmare"] as Difficulty[]).map((k) => {
              const active = s.difficulty === k;
              return (
                <button
                  key={k}
                  onClick={() => engine?.setDifficulty(k)}
                  data-active={active}
                  className={`btn-diff ${k === "nightmare" ? "danger" : ""}`}
                  aria-pressed={active}
                >
                  <span className="flex items-center gap-1.5">
                    <span className="diff-dot" />
                    {DIFFS[k].label}
                  </span>
                  <span className="diff-sub">Score ×{DIFFS[k].score}</span>
                </button>
              );
            })}
          </div>
          <p className="mt-2.5 text-center stencil text-[9px] text-bone/50">{DIFFS[s.difficulty].blurb}</p>
        </section>

        {/* deploy + sound — aligned row */}
        <div className="mt-5 w-full max-w-[432px] grid grid-cols-[1fr_56px] gap-2 rise-in rise-in-3">
          <button onClick={() => engine?.start()} className="btn-deploy h-[56px] text-[15px] sm:text-base">
            Deploy
            <PlayIcon className="w-4 h-4" />
          </button>
          <button
            onClick={() => engine?.toggleMute()}
            className="btn-ghost h-[56px]"
            aria-label={s.muted ? "Unmute" : "Mute"}
            title="Toggle audio (M)"
          >
            <SoundIcon muted={s.muted} />
          </button>
        </div>
        <div className="mt-3 stencil text-[9px] text-bone/35 tabular-nums rise-in rise-in-3">
          Best {s.best.toLocaleString()} pts · Wave {s.bestWave} · {s.muted ? "Audio off" : "Audio on"} (M)
        </div>

        {/* intel panels — identical geometry */}
        <div className="mt-9 w-full max-w-[880px] grid gap-3 md:grid-cols-2 items-stretch rise-in rise-in-4">
          <section className="panel p-4 sm:p-5">
            <header className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <TargetIcon className="w-4 h-4 text-toxic/80" />
                <h2 className="stencil text-[11px] text-bone">Field Manual</h2>
              </div>
              <span className="stencil text-[8px] text-bone/30">Ref 7-A</span>
            </header>
            <ul className="space-y-2.5">
              {controls.map((c) => (
                <li key={c.label} className="flex items-center justify-between gap-3 py-0.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="flex gap-1 shrink-0">
                      {c.keys.map((k) => (
                        <kbd key={k} className="keycap">
                          {k}
                        </kbd>
                      ))}
                    </span>
                    <span className="stencil text-[10px] text-bone/85 whitespace-nowrap">{c.label}</span>
                  </div>
                  <span className="text-[11px] text-bone/40 text-right truncate">{c.desc}</span>
                </li>
              ))}
            </ul>
            <p className="mt-4 pt-3 border-t border-bone/10 text-[10px] text-bone/35 leading-relaxed">
              Tip: chain kills within 2.2s for a ×5 combo · sprinting widens your spread · cover
              blocks bullets but not acid.
            </p>
          </section>

          <section className="panel panel-red p-4 sm:p-5">
            <header className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <SkullIcon className="w-4 h-4 text-blood/90" />
                <h2 className="stencil text-[11px] text-bone">Threat Intel</h2>
              </div>
              <span className="stencil text-[8px] text-bone/30">Intel 09</span>
            </header>
            <ul className="space-y-2">
              {threats.map((t) => (
                <li key={t.name} className="flex items-center gap-3 py-0.5">
                  <span
                    className="w-9 h-9 shrink-0 grid place-items-center border bg-black/30 rounded-[3px]"
                    style={{ borderColor: `${t.color}44`, color: t.color }}
                  >
                    {t.icon}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[12px] font-bold tracking-wider" style={{ color: t.color }}>
                        {t.name}
                      </span>
                      <ThreatPips level={t.threat} />
                    </div>
                    <div className="text-[10px] text-bone/40 truncate">{t.blurb}</div>
                  </div>
                  <span className="stencil text-[9px] text-ember/80 tabular-nums shrink-0">+{t.score}</span>
                </li>
              ))}
            </ul>
            <p className="mt-4 pt-3 border-t border-bone/10 text-[10px] text-bone/35 leading-relaxed">
              Waves 5–7 escalate sharply · Wave 10: the Patriarch. Clear all ten to enter Overtime.
            </p>
          </section>
        </div>

        {/* footer */}
        <footer className="mt-8 mb-1 flex flex-col items-center gap-2 rise-in rise-in-4">
          <div className="hazard-stripe h-[3px] w-full max-w-[560px] opacity-40" />
          <span className="stencil text-[8px] text-bone/25">
            Build 2.7 · Containment net uplink stable · Sector 9
          </span>
        </footer>
      </div>
    </div>
  );
}

/* ------------------------------ pause screen ------------------------------ */

export function PauseScreen({ engine }: ScreenProps) {
  const s = useSnap();
  if (s.phase !== "paused") return null;
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/60 backdrop-blur-[2px] px-4">
      <div className="panel p-6 sm:p-8 w-full max-w-sm text-center">
        <div className="stencil text-[9px] text-ember/80 mb-2">Operation suspended</div>
        <h2 className="font-display text-5xl text-bone leading-none">PAUSED</h2>
        <div className="mt-3 stencil text-[9px] text-bone/40">
          {DIFFS[s.difficulty].label} protocol · Wave {s.wave} · {s.kills} kills
        </div>
        <div className="mt-6 flex flex-col gap-2.5">
          <button onClick={() => engine?.resume()} className="btn-primary py-3.5 text-sm">
            <PlayIcon /> Resume
          </button>
          <button onClick={() => engine?.start()} className="btn-ghost py-3 text-[12px]">
            Restart run
          </button>
          <button onClick={() => engine?.toMenu()} className="btn-danger py-3 text-[12px]">
            Abandon mission
          </button>
        </div>
        <div className="mt-5 stencil text-[9px] text-bone/35">P / Esc to resume · M to mute</div>
      </div>
    </div>
  );
}

/* ---------------------------- game over screen ---------------------------- */

function fmtClock(t: number) {
  const m = Math.floor(t / 60);
  const ss = Math.floor(t % 60);
  return `${m}:${ss.toString().padStart(2, "0")}`;
}

export function GameOverScreen({ engine }: ScreenProps) {
  const s = useSnap();
  if (s.phase !== "gameover") return null;
  const acc = Math.round((s.stats?.accuracy ?? 0) * 100);
  const newBest = s.stats?.newBest ?? false;
  const stats: { label: string; value: string }[] = [
    { label: "Final score", value: s.score.toLocaleString() },
    { label: "Waves held", value: `${s.wave}` },
    { label: "Kills", value: `${s.kills}` },
    { label: "Best combo", value: `×${s.stats?.maxCombo ?? 0}` },
    { label: "Accuracy", value: `${acc}%` },
    { label: "Survived", value: fmtClock(s.time) },
  ];
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center px-4" style={{ background: "rgba(18,4,6,0.72)" }}>
      <div className="relative w-full max-w-md">
        {/* dripping blood header */}
        <svg className="absolute -top-1 left-1/2 -translate-x-1/2 w-[320px] max-w-full text-[#8f1219] drip-anim" viewBox="0 0 320 46" fill="currentColor" aria-hidden>
          <path d="M0 0h320v10c-14 3-20 14-30 14s-12-9-26-9-16 16-30 16-14-12-28-12-12 8-26 8-18-14-32-14-12 10-26 10-16-13-30-13-10 7-24 7-18-11-32-11-10 6-22 6S8 6 0 8V0z" />
        </svg>
        <div className="panel panel-red p-6 sm:p-8 text-center">
          <div className="stencil text-[9px] text-blood/80 mb-2">Containment failed</div>
          <h2 className="font-display text-6xl sm:text-7xl text-blood leading-none" style={{ textShadow: "0 0 36px rgba(229,34,46,0.5), 0 4px 0 #3a060b" }}>
            OVERRUN
          </h2>
          <div className="mt-2 stencil text-[10px] text-bone/50">The horde has taken the sector</div>

          {newBest && (
            <div className="mt-4 inline-block border border-acid/60 bg-acid/10 px-4 py-1.5 stencil text-[10px] text-acid shadow-[0_0_18px_rgba(212,255,77,0.25)]">
              ★ New personal best
            </div>
          )}

          <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 gap-px bg-bone/10 border border-bone/10">
            {stats.map((st) => (
              <div key={st.label} className="bg-[#0d0a0a] px-2 py-3">
                <div className="stencil text-[8px] text-bone/40">{st.label}</div>
                <div className="mt-1 text-lg font-extrabold text-bone tabular-nums leading-none">{st.value}</div>
              </div>
            ))}
          </div>

          <div className="mt-3 stencil text-[9px] text-bone/35 tabular-nums">
            Personal best · {s.best.toLocaleString()} pts · Wave {s.bestWave}
          </div>

          <div className="mt-6 grid grid-cols-[1fr_auto] gap-2">
            <button onClick={() => engine?.start()} className="btn-primary py-3.5 text-sm">
              <CrosshairIcon /> Redeploy
            </button>
            <button onClick={() => engine?.toMenu()} className="btn-ghost px-5 text-[12px]">
              Menu
            </button>
          </div>
          <div className="mt-4 stencil text-[9px] text-bone/30">Press Enter to redeploy</div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------ wave banner ------------------------------ */

export function Banner() {
  const s = useSnap();
  const b = s.banner;
  if (!b) return null;
  const col = b.tone === "blood" ? "text-blood" : b.tone === "bone" ? "text-bone" : "text-toxic";
  const glow =
    b.tone === "blood"
      ? "0 0 40px rgba(229,34,46,0.55), 0 4px 0 #3a060b"
      : b.tone === "bone"
        ? "0 0 30px rgba(232,224,200,0.35), 0 4px 0 #2a2820"
        : "0 0 40px rgba(163,245,46,0.5), 0 4px 0 #123307";
  return (
    <div key={b.key} className="absolute inset-x-0 top-[22%] z-20 flex flex-col items-center pointer-events-none px-4">
      <div className={`banner-anim font-display text-5xl sm:text-6xl md:text-7xl ${col} text-center leading-none`} style={{ textShadow: glow }}>
        {b.text}
      </div>
      <div className="banner-anim mt-2 stencil text-[10px] sm:text-[11px] text-bone/80 bg-black/50 border border-bone/15 px-4 py-1.5 rounded-[3px] text-center">
        {b.sub}
      </div>
    </div>
  );
}

/* ---------------------------- touch controls ---------------------------- */

export function TouchControls({ engine }: ScreenProps) {
  const s = useSnap();
  const [joy, setJoy] = useState<{ ox: number; oy: number; dx: number; dy: number } | null>(null);
  const [sprintOn, setSprintOn] = useState(false);
  const zoneRef = useRef<HTMLDivElement>(null);

  if (s.phase !== "playing" || !engine?.isTouch) return null;

  const R = 52;

  const onDown = (e: RPointerEvent<HTMLDivElement>) => {
    const rect = zoneRef.current?.getBoundingClientRect();
    if (!rect) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setJoy({ ox: e.clientX - rect.left, oy: e.clientY - rect.top, dx: 0, dy: 0 });
  };
  const onMove = (e: RPointerEvent<HTMLDivElement>) => {
    if (!joy) return;
    const rect = zoneRef.current?.getBoundingClientRect();
    if (!rect) return;
    let dx = e.clientX - rect.left - joy.ox;
    let dy = e.clientY - rect.top - joy.oy;
    const l = Math.hypot(dx, dy);
    if (l > R) {
      dx = (dx / l) * R;
      dy = (dy / l) * R;
    }
    setJoy({ ...joy, dx, dy });
    engine.setTouchMove(dx / R, dy / R, true);
  };
  const onUp = () => {
    setJoy(null);
    engine?.setTouchMove(0, 0, false);
  };

  return (
    <div className="absolute inset-0 z-20 pointer-events-none select-none">
      {/* pause — top right (minimap is disabled on touch, so the corner is clear) */}
      <button
        className="absolute top-4 right-4 btn-ghost px-4 py-2 text-[11px] pointer-events-auto rounded-[3px]"
        onPointerDown={() => engine?.pause()}
      >
        ❚❚ Pause
      </button>

      {/* movement joystick */}
      <div
        ref={zoneRef}
        className="absolute left-5 bottom-8 w-40 h-40 pointer-events-auto touch-none"
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
      >
        <div className="absolute left-2 top-2 w-36 h-36 rounded-full border-2 border-toxic/25 bg-black/30" />
        <div
          className="absolute w-16 h-16 rounded-full border-2 border-toxic/60 bg-toxic/20"
          style={{
            left: joy ? joy.ox + joy.dx - 32 : 40,
            top: joy ? joy.oy + joy.dy - 32 : 40,
            transition: joy ? "none" : "all 0.15s ease",
          }}
        />
      </div>

      {/* action cluster */}
      <div className="absolute right-5 bottom-20 flex flex-col items-end gap-3 pointer-events-auto" style={{ touchAction: "none" }}>
        <button className="btn-ghost px-5 py-3 text-[12px] rounded-[3px]" onPointerDown={() => engine?.dashAction()}>
          Dash
        </button>
        <button
          className={`px-5 py-3 text-[12px] rounded-[3px] ${sprintOn ? "btn-primary" : "btn-ghost"}`}
          onPointerDown={() => {
            const next = !sprintOn;
            setSprintOn(next);
            engine?.setTouchSprint(next);
          }}
        >
          {sprintOn ? "Sprint ●" : "Sprint"}
        </button>
        <button
          className="w-20 h-20 rounded-full btn-primary text-[12px] border-2"
          onPointerDown={() => engine?.setTouchFire(true)}
          onPointerUp={() => engine?.setTouchFire(false)}
          onPointerCancel={() => engine?.setTouchFire(false)}
          onPointerLeave={() => engine?.setTouchFire(false)}
        >
          Fire
        </button>
      </div>
    </div>
  );
}
