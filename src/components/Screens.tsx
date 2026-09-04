import { useEffect, useRef, useState, type PointerEvent as RPointerEvent } from "react";
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

function LockIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2a5 5 0 0 0-5 5v3H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-1V7a5 5 0 0 0-5-5zm-3 8V7a3 3 0 1 1 6 0v3H9zm3 4a1.5 1.5 0 0 1 .75 2.8V19h-1.5v-2.2A1.5 1.5 0 0 1 12 14z" />
    </svg>
  );
}

function CheckIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 12.5 9.5 18 20 6.5" />
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

function MaximizeIcon({ isFs, className = "w-5 h-5" }: { isFs: boolean; className?: string }) {
  if (isFs) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
      </svg>
    );
  }
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
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
  const [sel, setSel] = useState(() => Math.min(s.unlocked, 10));
  const prevUnlocked = useRef(s.unlocked);
  // when progress advances (returning from a run), snap selection to the newest wave
  useEffect(() => {
    if (s.unlocked > prevUnlocked.current) {
      prevUnlocked.current = s.unlocked;
      setSel(Math.min(s.unlocked, 10));
    }
  }, [s.unlocked]);
  if (s.phase !== "menu") return null;

  const controls: { label: string; keys: string[]; desc: string }[] = [
    { label: "Move", keys: ["W", "A", "S", "D"], desc: "Run the sector" },
    { label: "Sprint", keys: ["SHIFT"], desc: "Burns stamina" },
    { label: "Aim · Fire", keys: ["MOUSE", "LMB"], desc: "Hold for full-auto" },
    { label: "Combat Dash", keys: ["SPACE"], desc: "Brief invulnerability" },
    { label: "Reload", keys: ["R"], desc: "Or auto when dry" },
    { label: "Maximize", keys: ["F"], desc: "Toggle fullscreen" },
    { label: "Audio", keys: ["M"], desc: "Mute / unmute" },
    { label: "Pause", keys: ["P"], desc: "Esc also works" },
  ];

  const threats: { name: string; color: string; blurb: string; score: number; threat: number; icon: React.ReactNode }[] = [
    { name: "WALKER", color: "#8fb05e", blurb: "Slow · relentless · swarms in numbers", score: 10, threat: 1, icon: <SkullIcon className="w-4 h-4" /> },
    { name: "RUNNER", color: "#e8a33d", blurb: "Fast flanker — closes distance quick", score: 15, threat: 2, icon: <SkullIcon className="w-4 h-4" /> },
    { name: "SPITTER", color: "#cdeb45", blurb: "Lobs corrosive acid from range", score: 25, threat: 3, icon: <SkullIcon className="w-4 h-4" /> },
    { name: "ABOMINATION", color: "#ff5257", blurb: "Boss · plasma volley · every 5th wave", score: 500, threat: 5, icon: <SkullIcon className="w-5 h-5" /> },
  ];

  return (
    <div className="absolute inset-0 z-20 flex flex-col justify-between items-center w-full h-[100dvh] max-h-[100dvh] px-3 py-2 sm:px-6 sm:py-2.5 md:px-8 md:py-2 overflow-y-auto md:overflow-hidden select-none box-border">
      {/* readability scrim behind the header */}
      <div className="title-scrim absolute inset-x-0 top-0 h-[45vh] pointer-events-none" />

      {/* primary viewport container */}
      <div className="relative z-10 w-full max-w-[940px] flex-1 flex flex-col justify-between items-center min-h-0 py-0.5">
        {/* 1. header & branding block */}
        <div className="w-full flex flex-col items-center shrink-0 rise-in">
          <div className="hazard-stripe h-[2px] w-full max-w-[440px] opacity-70" />
          <div className="mt-1 flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-blood blink-lamp shadow-[0_0_8px_#e5222e]" />
            <span className="stencil text-[8px] sm:text-[9px] text-blood/90 tracking-[0.2em]">
              Classified · Biohazard Level 4 · Sector 9
            </span>
            <span className="w-1.5 h-1.5 bg-blood blink-lamp shadow-[0_0_8px_#e5222e]" />
          </div>

          <h1 className="title-flicker font-display text-toxic leading-none mt-0.5 text-center text-[clamp(2.1rem,4.4vh,4rem)] rise-in-1">
            DEAD SECTOR
          </h1>

          <div className="flex items-center gap-2 mt-0.5 rise-in-1">
            <span className="h-px w-6 sm:w-10 bg-toxic/40" />
            <span className="stencil text-[8px] sm:text-[9px] text-bone/70">Quarantine Protocol</span>
            <span className="h-px w-6 sm:w-10 bg-toxic/40" />
          </div>
          <p className="mt-0.5 max-w-md text-center text-[10px] sm:text-[11.5px] text-bone/65 font-medium tracking-wide leading-tight rise-in-2">
            The wire is breached. Run the sector, use wreckage for cover, and out-gun the horde — <span className="text-acid font-bold">survive all 10 waves.</span>
          </p>
        </div>

        {/* 2. mission select (single row on desktop) */}
        <section className="w-full max-w-[620px] shrink-0 rise-in rise-in-2 my-0.5 sm:my-1" aria-label="Mission select">
          <div className="flex items-center justify-between mb-1 px-1">
            <span className="stencil text-[8px] sm:text-[8.5px] text-bone/45">Mission Select</span>
            <span className="stencil text-[8px] sm:text-[8.5px] text-bone/30 tabular-nums">
              Progress · Wave {Math.min(s.unlocked, 10)}/10 unlocked
            </span>
          </div>
          <div className="grid grid-cols-5 md:grid-cols-10 gap-1 sm:gap-1.5">
            {Array.from({ length: 10 }, (_, i) => i + 1).map((w) => {
              const locked = w > s.unlocked;
              const boss = w % 5 === 0;
              const cleared = w < s.unlocked;
              const active = sel === w;
              return (
                <button
                  key={w}
                  disabled={locked}
                  onClick={() => setSel(w)}
                  aria-pressed={active}
                  className={`wave-cell ${active ? "is-active" : ""} ${boss ? "is-boss" : ""}`}
                  title={locked ? `Locked — clear wave ${w - 1} first` : `Deploy into wave ${w}`}
                >
                  <span className="stencil text-[6.5px] opacity-70 leading-none">W</span>
                  <span className="text-sm sm:text-base font-extrabold leading-none tabular-nums">
                    {String(w).padStart(2, "0")}
                  </span>
                  <span className="h-3 grid place-items-center">
                    {locked ? (
                      <LockIcon className="w-2.5 h-2.5" />
                    ) : boss ? (
                      <SkullIcon className="w-3 h-3 text-blood" />
                    ) : cleared ? (
                      <CheckIcon className="w-2.5 h-2.5" />
                    ) : (
                      <span className="w-1 h-1 bg-current rounded-full opacity-60" />
                    )}
                  </span>
                </button>
              );
            })}
          </div>
          <p className="mt-1 text-center stencil text-[7.5px] sm:text-[8px] text-bone/45">
            {sel % 5 === 0
              ? `Warning — boss signature detected on wave ${sel}`
              : `Insertion point · wave ${sel} — armament scales with wave`}
          </p>
        </section>

        {/* 3. difficulty + deploy controls */}
        <div className="w-full max-w-[430px] shrink-0 flex flex-col items-center rise-in rise-in-3 my-0.5 sm:my-1">
          <div className="w-full">
            <div className="flex items-center justify-between mb-1 px-1">
              <span className="stencil text-[8px] sm:text-[8.5px] text-bone/45">Select Difficulty</span>
              <span className="stencil text-[8px] sm:text-[8.5px] text-bone/30">03 Protocols</span>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
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
                    <span className="flex items-center gap-1 leading-none text-[9px] sm:text-[10px]">
                      <span className="diff-dot" />
                      {DIFFS[k].label}
                    </span>
                    <span className="diff-sub text-[7px] sm:text-[7.5px] mt-0.5">Score ×{DIFFS[k].score}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="w-full grid grid-cols-[1fr_42px_42px] sm:grid-cols-[1fr_46px_46px] gap-2 mt-1.5">
            <button
              onClick={() => engine?.start(sel)}
              className="btn-deploy h-[42px] sm:h-[46px] text-[13px] sm:text-[14px]"
            >
              {sel === 1 ? "Deploy" : sel === Math.min(s.unlocked, 10) && s.unlocked > 1 ? `Continue · Wave ${sel}` : `Deploy · Wave ${sel}`}
              <PlayIcon className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => engine?.toggleFullscreen()}
              className="btn-ghost h-[42px] sm:h-[46px]"
              aria-label={s.fullscreen ? "Exit Fullscreen (F)" : "Maximize Screen (F)"}
              title={s.fullscreen ? "Restore window (F)" : "Maximize screen (F)"}
            >
              <MaximizeIcon isFs={s.fullscreen} className="w-4 h-4" />
            </button>
            <button
              onClick={() => engine?.toggleMute()}
              className="btn-ghost h-[42px] sm:h-[46px]"
              aria-label={s.muted ? "Unmute" : "Mute"}
              title="Toggle audio (M)"
            >
              <SoundIcon muted={s.muted} className="w-4 h-4" />
            </button>
          </div>
          <div className="mt-1 stencil text-[8px] sm:text-[8.5px] text-bone/35 tabular-nums text-center">
            Best {s.best.toLocaleString()} pts · Wave {s.bestWave} · Fullscreen (F) · {s.muted ? "Audio off" : "Audio on"} (M)
          </div>
        </div>

        {/* 4. intel panels — matching heights, side-by-side on desktop */}
        <div className="w-full max-w-[880px] min-h-0 grid grid-cols-1 md:grid-cols-2 gap-2.5 sm:gap-3.5 items-stretch my-0.5 sm:my-1 rise-in rise-in-4">
          <section className="panel p-2.5 sm:p-3 flex flex-col justify-between">
            <header className="flex items-center justify-between mb-1 pb-1 border-b border-bone/10">
              <div className="flex items-center gap-1.5">
                <TargetIcon className="w-3.5 h-3.5 text-toxic/80" />
                <h2 className="stencil text-[10px] text-bone">Field Manual</h2>
              </div>
              <span className="stencil text-[7.5px] text-bone/30">Ref 7-A</span>
            </header>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1 my-auto">
              {controls.map((c) => (
                <div key={c.label} className="flex items-center justify-between gap-1 py-0.5">
                  <div className="flex items-center gap-1 min-w-0">
                    <span className="flex gap-0.5 shrink-0">
                      {c.keys.map((k) => (
                        <kbd key={k} className="keycap text-[8px] sm:text-[8.5px] min-w-[18px] h-[18px] px-1 py-0 leading-none">
                          {k}
                        </kbd>
                      ))}
                    </span>
                    <span className="stencil text-[8.5px] text-bone/85 whitespace-nowrap">{c.label}</span>
                  </div>
                  <span className="text-[9px] text-bone/40 text-right truncate">{c.desc}</span>
                </div>
              ))}
            </div>
            <p className="mt-1 pt-1 border-t border-bone/10 text-[8px] sm:text-[8.5px] text-bone/35 leading-tight">
              Tip: chain kills within 2.2s for ×5 combo · cover blocks bullets but not acid.
            </p>
          </section>

          <section className="panel panel-red p-2.5 sm:p-3 flex flex-col justify-between">
            <header className="flex items-center justify-between mb-1 pb-1 border-b border-bone/10">
              <div className="flex items-center gap-1.5">
                <SkullIcon className="w-3.5 h-3.5 text-blood/90" />
                <h2 className="stencil text-[10px] text-bone">Threat Intel</h2>
              </div>
              <span className="stencil text-[7.5px] text-bone/30">Intel 09</span>
            </header>
            <div className="flex flex-col gap-1 my-auto">
              {threats.map((t) => (
                <div key={t.name} className="flex items-center gap-2 py-0.5">
                  <span
                    className="w-5 h-5 shrink-0 grid place-items-center border bg-black/40 rounded-[2px]"
                    style={{ borderColor: `${t.color}44`, color: t.color }}
                  >
                    {t.icon}
                  </span>
                  <div className="min-w-0 flex-1 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-[10px] font-bold tracking-wider leading-none" style={{ color: t.color }}>
                        {t.name}
                      </span>
                      <ThreatPips level={t.threat} />
                    </div>
                    <span className="text-[9px] text-bone/45 truncate hidden sm:inline">{t.blurb}</span>
                  </div>
                  <span className="stencil text-[8px] text-ember/80 tabular-nums shrink-0">+{t.score}</span>
                </div>
              ))}
            </div>
            <p className="mt-1 pt-1 border-t border-bone/10 text-[8px] sm:text-[8.5px] text-bone/35 leading-tight">
              Waves 5–7 escalate sharply · Wave 10: Patriarch boss. Clear all 10 to survive.
            </p>
          </section>
        </div>

        {/* 5. subtle footer bar positioned strictly within the viewport */}
        <footer className="w-full flex items-center justify-between px-2 pt-1 pb-0.5 shrink-0 border-t border-bone/10 text-bone/40 rise-in rise-in-4">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-toxic/70 blink-lamp shadow-[0_0_6px_#a3f52e]" />
            <span className="stencil text-[8px] text-bone/35 tracking-wider hidden sm:inline">
              SECTOR 9 UPLINK ACTIVE
            </span>
          </div>

          <a
            href="https://abhiishek.is-a.dev/"
            target="_blank"
            rel="noopener noreferrer"
            title="Visit Abhishek's Portfolio (abhiishek.is-a.dev)"
            className="group inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full border border-toxic/30 bg-black/40 hover:bg-toxic/15 hover:border-toxic/70 transition-all duration-200 cursor-pointer shadow-[0_0_8px_rgba(163,245,46,0.1)] hover:shadow-[0_0_14px_rgba(163,245,46,0.3)]"
          >
            <span className="stencil text-[8.5px] font-extrabold tracking-[0.18em] text-toxic/90 group-hover:text-toxic transition-colors">
              BUILT BY ABHISHEK
            </span>
            <span className="text-[9.5px] text-toxic/70 group-hover:text-toxic group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-200">
              ↗
            </span>
          </a>

          <span className="stencil text-[8px] text-bone/30 tabular-nums">
            V1.0 · PC PROTOCOL
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
          <div className="grid grid-cols-2 gap-2 mt-1">
            <button
              onClick={() => engine?.toggleFullscreen()}
              className="btn-ghost py-2.5 text-[11px] flex items-center justify-center gap-1.5"
              title="Maximize screen (F)"
            >
              <MaximizeIcon isFs={s.fullscreen} className="w-3.5 h-3.5" />
              {s.fullscreen ? "Windowed (F)" : "Maximize (F)"}
            </button>
            <button
              onClick={() => engine?.toggleMute()}
              className="btn-ghost py-2.5 text-[11px] flex items-center justify-center gap-1.5"
              title="Toggle audio (M)"
            >
              <SoundIcon muted={s.muted} className="w-3.5 h-3.5" />
              {s.muted ? "Unmute (M)" : "Mute (M)"}
            </button>
          </div>
        </div>
        <div className="mt-4 stencil text-[9px] text-bone/35">P / Esc to resume · F to maximize · M to mute</div>
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
            <button onClick={() => engine?.start(s.wave)} className="btn-primary py-3.5 text-sm">
              <CrosshairIcon /> Retry Wave {s.wave}
            </button>
            <button onClick={() => engine?.toMenu()} className="btn-ghost px-5 text-[12px]">
              Menu
            </button>
          </div>
          <div className="mt-4 stencil text-[9px] text-bone/30">
            Press Enter to retry wave {s.wave} · progress is saved to mission select
          </div>
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
