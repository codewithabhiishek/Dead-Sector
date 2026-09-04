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
    <span className="flex items-end gap-[2px] sm:gap-[3px]" aria-label={`threat level ${level} of 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          className="w-[3px] sm:w-[4px] rounded-[1px]"
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
  const [mobileTab, setMobileTab] = useState<"manual" | "intel">("manual");
  const prevUnlocked = useRef(s.unlocked);

  useEffect(() => {
    if (s.unlocked > prevUnlocked.current) {
      prevUnlocked.current = s.unlocked;
      setSel(Math.min(s.unlocked, 10));
    }
  }, [s.unlocked]);

  if (s.phase !== "menu") return null;

  const controls: { label: string; keys: string[]; desc: string }[] = [
    { label: "Move / Evade", keys: ["W", "A", "S", "D"], desc: "Omnidirectional combat maneuvering" },
    { label: "Aim & Fire", keys: ["Mouse", "LMB"], desc: "Aim crosshair · hold trigger to spray" },
    { label: "Combat Dash", keys: ["Space"], desc: "Invulnerable burst dodge through hostiles" },
    { label: "Tactical Sprint", keys: ["Shift"], desc: "High-speed tactical burst (stamina)" },
    { label: "Manual Reload", keys: ["R"], desc: "Chamber fresh magazine (auto on empty)" },
  ];

  const threats: { name: string; color: string; blurb: string; score: number; threat: number; icon: React.ReactNode }[] = [
    { name: "WALKER", color: "#8fb05e", blurb: "Relentless swarm horde · strikes in numbers", score: 10, threat: 1, icon: <SkullIcon className="w-3.5 h-3.5" /> },
    { name: "RUNNER", color: "#e8a33d", blurb: "Rapid flanking predator · closes distance fast", score: 15, threat: 2, icon: <SkullIcon className="w-3.5 h-3.5" /> },
    { name: "SPITTER", color: "#cdeb45", blurb: "Bio-artillery · lobs corrosive acid pools", score: 25, threat: 3, icon: <SkullIcon className="w-3.5 h-3.5" /> },
    { name: "BRUTE", color: "#ff7844", blurb: "Heavily armored mutant · absorbs heavy munitions", score: 60, threat: 4, icon: <SkullIcon className="w-3.5 h-3.5" /> },
    { name: "PATRIARCH", color: "#ff5257", blurb: "Apex boss signature · launches plasma volleys", score: 500, threat: 5, icon: <SkullIcon className="w-4 h-4" /> },
  ];

  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-between w-full h-[100dvh] max-h-[100dvh] px-3 py-2 sm:px-5 sm:py-2.5 md:px-8 md:py-3 pt-[max(0.5rem,env(safe-area-inset-top))] pb-[max(0.5rem,env(safe-area-inset-bottom))] pl-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))] overflow-y-auto lg:overflow-hidden select-none box-border custom-scroll">
      {/* readability scrim behind the header */}
      <div className="title-scrim absolute inset-x-0 top-0 h-[38vh] pointer-events-none" />

      {/* primary viewport container with cohesive vertical rhythm */}
      <div className="relative z-10 w-full max-w-[960px] flex-1 flex flex-col justify-between items-center min-h-0 py-1 sm:py-1.5 gap-y-2">
        {/* 1. Header & Branding */}
        <div className="w-full flex flex-col items-center shrink-0 rise-in">
          <div className="hazard-stripe h-[2px] w-full max-w-[420px] opacity-70" />
          <div className="mt-1 flex items-center gap-1.5 sm:gap-2">
            <span className="w-1.5 h-1.5 bg-blood blink-lamp shadow-[0_0_8px_#e5222e]" />
            <span className="font-mono text-[8px] sm:text-[9px] text-blood/90 tracking-[0.18em] sm:tracking-[0.22em] uppercase font-bold text-center">
              Classified · Biohazard Level 4 · Sector 9
            </span>
            <span className="w-1.5 h-1.5 bg-blood blink-lamp shadow-[0_0_8px_#e5222e]" />
          </div>

          <h1 className="title-flicker font-display text-toxic leading-none mt-0.5 text-center text-[clamp(2.2rem,4.4vh,3.8rem)] rise-in-1">
            DEAD SECTOR
          </h1>

          <div className="flex items-center gap-2 mt-0.5 rise-in-1">
            <span className="h-px w-5 sm:w-10 bg-toxic/40" />
            <span className="font-ui text-[8.5px] sm:text-[9.5px] text-bone/75 tracking-[0.16em] uppercase font-bold">
              Quarantine Protocol
            </span>
            <span className="h-px w-5 sm:w-10 bg-toxic/40" />
          </div>
          <p className="mt-0.5 max-w-lg text-center font-mono text-[10px] sm:text-[11px] text-bone/65 tracking-normal leading-tight px-2 rise-in-2">
            The perimeter is breached. Scavenge drops, hold cover, and out-gun the horde — <span className="text-acid font-bold">survive all 10 waves.</span>
          </p>
        </div>

        {/* 2. Operations & Deployment Console (Mission Select + Difficulty + Launch) */}
        <div className="w-full flex flex-col items-center gap-1.5 sm:gap-2 shrink-0 rise-in rise-in-2 max-w-[640px]">
          {/* Mission Select */}
          <section className="w-full" aria-label="Mission select">
            <div className="flex items-center justify-between mb-1 px-1">
              <span className="font-ui text-[8.5px] sm:text-[9px] text-bone/50 tracking-wider font-bold uppercase">
                Mission Insertion Point
              </span>
              <span className="font-mono text-[8px] sm:text-[8.5px] text-toxic/75 tabular-nums">
                Progress: Wave {Math.min(s.unlocked, 10)}/10 unlocked
              </span>
            </div>
            {/* 5 cols on mobile (2 rows), 10 cols on tablet/desktop */}
            <div className="grid grid-cols-5 sm:grid-cols-10 gap-1 sm:gap-1.5">
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
                    <span className="font-mono text-[6.5px] opacity-70 leading-none">W</span>
                    <span className="font-mono text-sm sm:text-base font-extrabold leading-none tabular-nums">
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
            <p className="mt-0.5 text-center font-mono text-[7.5px] sm:text-[8px] text-bone/45 truncate px-1">
              {sel % 5 === 0
                ? `[WARNING] Apex boss signature detected on wave ${sel} — heavy ordnance advised`
                : `Insertion point: wave ${sel} · initial weapon and supplies scaled to sector`}
            </p>
          </section>

          {/* Difficulty & Deploy Controls */}
          <div className="w-full max-w-[460px] flex flex-col items-center">
            <div className="w-full">
              <div className="flex items-center justify-between mb-1 px-1">
                <span className="font-ui text-[8.5px] sm:text-[9px] text-bone/50 tracking-wider font-bold uppercase">
                  Select Difficulty
                </span>
                <span className="font-mono text-[8px] sm:text-[8.5px] text-bone/35 font-bold">03 PROTOCOLS</span>
              </div>
              <div className="grid grid-cols-3 gap-1 sm:gap-1.5">
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
                      <span className="flex items-center gap-1 leading-none font-ui font-bold text-[9px] sm:text-[10px]">
                        <span className="diff-dot" />
                        {DIFFS[k].label}
                      </span>
                      <span className="diff-sub font-mono text-[7px] sm:text-[7.5px] mt-0.5">Score ×{DIFFS[k].score}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="w-full grid grid-cols-[1fr_42px_42px] sm:grid-cols-[1fr_46px_46px] gap-1.5 sm:gap-2 mt-1.5">
              <button
                onClick={() => engine?.start(sel)}
                className="btn-deploy h-[42px] sm:h-[46px] font-ui font-extrabold text-[13px] sm:text-[14.5px] min-w-0 px-2"
              >
                <span className="truncate">
                  {sel === 1 ? "DEPLOY TO SECTOR" : sel === Math.min(s.unlocked, 10) && s.unlocked > 1 ? `CONTINUE · W${sel}` : `DEPLOY · W${sel}`}
                </span>
                <PlayIcon className="w-3.5 h-3.5 shrink-0" />
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
            <div className="mt-0.5 font-mono text-[7.5px] sm:text-[8.5px] text-bone/40 tabular-nums text-center">
              RECORD: {s.best.toLocaleString()} PTS · WAVE {s.bestWave} · FULLSCREEN [F] · AUDIO [M]
            </div>
          </div>
        </div>

        {/* 3. Mobile / Tablet Tactical Panel Tab Switcher (shown on screens < 1024px) */}
        <div className="w-full max-w-[940px] flex lg:hidden items-center justify-center gap-2 px-1">
          <button
            onClick={() => setMobileTab("manual")}
            className={`font-ui text-[9.5px] font-bold tracking-wider uppercase px-3 py-1 rounded-[2px] border transition-all ${
              mobileTab === "manual"
                ? "border-toxic/80 text-toxic bg-toxic/15 shadow-[0_0_10px_rgba(163,245,46,0.2)]"
                : "border-bone/20 text-bone/50 hover:text-bone/80 bg-black/40"
            }`}
          >
            ◉ Field Manual
          </button>
          <button
            onClick={() => setMobileTab("intel")}
            className={`font-ui text-[9.5px] font-bold tracking-wider uppercase px-3 py-1 rounded-[2px] border transition-all ${
              mobileTab === "intel"
                ? "border-blood/80 text-blood bg-blood/15 shadow-[0_0_10px_rgba(229,34,46,0.2)]"
                : "border-bone/20 text-bone/50 hover:text-bone/80 bg-black/40"
            }`}
          >
            ☠ Threat Intel
          </button>
        </div>

        {/* 4. Bottom Intel & Manual Panels (Equal visual height, aligned edges, collision-free grid) */}
        <div className="w-full max-w-[940px] min-h-0 grid grid-cols-1 lg:grid-cols-2 gap-2.5 sm:gap-3.5 items-stretch shrink-0 rise-in rise-in-4">
          {/* Field Manual */}
          <section className={`panel p-2.5 sm:p-3.5 flex-col justify-between ${mobileTab === "intel" ? "hidden lg:flex" : "flex"}`}>
            <header className="flex items-center justify-between mb-1 sm:mb-1.5 pb-1 sm:pb-1.5 border-b border-bone/10">
              <div className="flex items-center gap-1.5">
                <TargetIcon className="w-3.5 h-3.5 text-toxic/80 shrink-0" />
                <h2 className="font-ui font-bold text-[10px] sm:text-[10.5px] text-bone tracking-wider uppercase">Field Manual</h2>
              </div>
              <span className="font-mono text-[8px] text-bone/35 font-bold">[REF 7-A]</span>
            </header>
            <div className="flex flex-col gap-0.5 sm:gap-1 my-auto">
              {controls.map((c) => (
                <div
                  key={c.label}
                  className="grid grid-cols-[minmax(64px,auto)_minmax(84px,auto)_1fr] items-center gap-1.5 sm:gap-2.5 py-0.5 sm:py-1 border-b border-bone/5 last:border-0"
                >
                  <div className="flex items-center flex-wrap gap-0.5 shrink-0">
                    {c.keys.map((k) => (
                      <kbd key={k} className="keycap text-[7.5px] sm:text-[8.5px] px-1 py-0 leading-none">
                        {k}
                      </kbd>
                    ))}
                  </div>
                  <span className="font-ui font-bold text-[9px] sm:text-[10px] text-bone/90 tracking-wide uppercase truncate">
                    {c.label}
                  </span>
                  <span className="font-mono text-[8.5px] sm:text-[9.5px] text-bone/50 leading-tight">
                    {c.desc}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-1 sm:mt-1.5 pt-1 sm:pt-1.5 border-t border-bone/10 flex items-center justify-between font-mono text-[7.5px] sm:text-[8.5px] text-bone/40 leading-tight">
              <span>SYSTEM: [F] FULLSCREEN · [M] AUDIO · [P/ESC] PAUSE</span>
              <span className="text-toxic/75 hidden sm:inline">CHAIN KILLS: ×5 COMBO</span>
            </div>
          </section>

          {/* Threat Intel */}
          <section className={`panel panel-red p-2.5 sm:p-3.5 flex-col justify-between ${mobileTab === "manual" ? "hidden lg:flex" : "flex"}`}>
            <header className="flex items-center justify-between mb-1 sm:mb-1.5 pb-1 sm:pb-1.5 border-b border-bone/10">
              <div className="flex items-center gap-1.5">
                <SkullIcon className="w-3.5 h-3.5 text-blood/90 shrink-0" />
                <h2 className="font-ui font-bold text-[10px] sm:text-[10.5px] text-bone tracking-wider uppercase">Threat Intel</h2>
              </div>
              <span className="font-mono text-[8px] text-bone/35 font-bold">[INTEL 09]</span>
            </header>
            <div className="flex flex-col gap-0.5 sm:gap-1 my-auto">
              {threats.map((t) => (
                <div
                  key={t.name}
                  className="grid grid-cols-[18px_minmax(84px,auto)_1fr_auto] sm:grid-cols-[22px_108px_1fr_auto] items-center gap-1.5 sm:gap-2.5 py-0.5 sm:py-1 border-b border-bone/5 last:border-0"
                >
                  <span
                    className="w-4 h-4 sm:w-5 sm:h-5 shrink-0 grid place-items-center border bg-black/50 rounded-[2px]"
                    style={{ borderColor: `${t.color}44`, color: t.color }}
                  >
                    {t.icon}
                  </span>
                  <div className="flex items-center gap-1 sm:gap-1.5 min-w-0">
                    <span className="font-ui text-[9px] sm:text-[10px] font-extrabold tracking-wider leading-none" style={{ color: t.color }}>
                      {t.name}
                    </span>
                    <ThreatPips level={t.threat} />
                  </div>
                  <span className="font-mono text-[8.5px] sm:text-[9.5px] text-bone/50 leading-tight">
                    {t.blurb}
                  </span>
                  <span className="font-mono text-[8px] sm:text-[9px] text-ember/85 tabular-nums shrink-0 font-bold">
                    +{t.score}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-1 sm:mt-1.5 pt-1 sm:pt-1.5 border-t border-bone/10 flex items-center justify-between font-mono text-[7.5px] sm:text-[8.5px] text-bone/40 leading-tight">
              <span>ESCALATION: BOSS SIGNATURE WAVES 5 & 10</span>
              <span className="text-acid/75 hidden sm:inline">10 WAVES TO PURGE</span>
            </div>
          </section>
        </div>
      </div>

      {/* 5. Subtle, clickable footer bar strictly within the viewport */}
      <footer className="relative z-10 w-full max-w-[960px] flex items-center justify-between px-2 pt-1 pb-0.5 shrink-0 border-t border-bone/10 text-bone/40 rise-in rise-in-4 gap-2 flex-wrap sm:flex-nowrap">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-toxic/70 blink-lamp shadow-[0_0_6px_#a3f52e]" />
          <span className="font-mono text-[7.5px] sm:text-[8.5px] text-bone/45 tracking-wider">
            SECTOR 9 UPLINK ACTIVE
          </span>
        </div>

        <a
          href="https://abhiishek.is-a.dev/"
          target="_blank"
          rel="noopener noreferrer"
          title="Visit Abhishek's Portfolio (abhiishek.is-a.dev)"
          className="group inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-0.5 rounded-full border border-toxic/30 bg-black/50 hover:bg-toxic/15 hover:border-toxic/70 transition-all duration-200 cursor-pointer shadow-[0_0_8px_rgba(163,245,46,0.1)] hover:shadow-[0_0_14px_rgba(163,245,46,0.3)] mx-auto sm:mx-0"
        >
          <span className="font-ui text-[8px] sm:text-[9px] font-extrabold tracking-[0.16em] text-toxic/90 group-hover:text-toxic transition-colors">
            BUILT BY ABHISHEK
          </span>
          <span className="text-[9px] text-toxic/70 group-hover:text-toxic group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-200">
            ↗
          </span>
        </a>

        <span className="font-mono text-[7.5px] sm:text-[8.5px] text-bone/35 tabular-nums">
          V1.0.4 · CLASSIFIED
        </span>
      </footer>
    </div>
  );
}

/* ------------------------------ pause screen ------------------------------ */

export function PauseScreen({ engine }: ScreenProps) {
  const s = useSnap();
  if (s.phase !== "paused") return null;
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/65 backdrop-blur-[2px] px-3 py-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))]">
      <div className="panel p-5 sm:p-7 w-full max-w-sm max-h-[92dvh] overflow-y-auto custom-scroll text-center">
        <div className="stencil text-[8.5px] sm:text-[9px] text-ember/80 mb-1.5">Operation suspended</div>
        <h2 className="font-display text-4xl sm:text-5xl text-bone leading-none">PAUSED</h2>
        <div className="mt-2.5 stencil text-[8.5px] sm:text-[9px] text-bone/40">
          {DIFFS[s.difficulty].label} protocol · Wave {s.wave} · {s.kills} kills
        </div>
        <div className="mt-5 flex flex-col gap-2">
          <button onClick={() => engine?.resume()} className="btn-primary py-3 text-sm min-h-[44px]">
            <PlayIcon /> Resume
          </button>
          <button onClick={() => engine?.start()} className="btn-ghost py-2.5 text-[12px] min-h-[40px]">
            Restart run
          </button>
          <button onClick={() => engine?.toMenu()} className="btn-danger py-2.5 text-[12px] min-h-[40px]">
            Abandon mission
          </button>
          <div className="grid grid-cols-2 gap-2 mt-1">
            <button
              onClick={() => engine?.toggleFullscreen()}
              className="btn-ghost py-2 text-[11px] flex items-center justify-center gap-1.5 min-h-[40px]"
              title="Maximize screen (F)"
            >
              <MaximizeIcon isFs={s.fullscreen} className="w-3.5 h-3.5" />
              {s.fullscreen ? "Windowed" : "Maximize"}
            </button>
            <button
              onClick={() => engine?.toggleMute()}
              className="btn-ghost py-2 text-[11px] flex items-center justify-center gap-1.5 min-h-[40px]"
              title="Toggle audio (M)"
            >
              <SoundIcon muted={s.muted} className="w-3.5 h-3.5" />
              {s.muted ? "Unmute" : "Mute"}
            </button>
          </div>
        </div>
        <div className="mt-3.5 stencil text-[8px] sm:text-[9px] text-bone/35">
          P / Esc to resume · F to maximize · M to mute
        </div>
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
    <div className="absolute inset-0 z-30 flex items-center justify-center px-3 py-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))]" style={{ background: "rgba(18,4,6,0.76)" }}>
      <div className="relative w-full max-w-md max-h-[94dvh] overflow-y-auto custom-scroll">
        {/* dripping blood header */}
        <svg className="absolute -top-1 left-1/2 -translate-x-1/2 w-[300px] max-w-full text-[#8f1219] drip-anim pointer-events-none" viewBox="0 0 320 46" fill="currentColor" aria-hidden>
          <path d="M0 0h320v10c-14 3-20 14-30 14s-12-9-26-9-16 16-30 16-14-12-28-12-12 8-26 8-18-14-32-14-12 10-26 10-16-13-30-13-10 7-24 7-18-11-32-11-10 6-22 6S8 6 0 8V0z" />
        </svg>
        <div className="panel panel-red p-5 sm:p-7 text-center">
          <div className="stencil text-[8.5px] sm:text-[9px] text-blood/80 mb-1.5">Containment failed</div>
          <h2 className="font-display text-5xl sm:text-6xl text-blood leading-none" style={{ textShadow: "0 0 36px rgba(229,34,46,0.5), 0 4px 0 #3a060b" }}>
            OVERRUN
          </h2>
          <div className="mt-1.5 stencil text-[9.5px] sm:text-[10px] text-bone/50">The horde has taken the sector</div>

          {newBest && (
            <div className="mt-3.5 inline-block border border-acid/60 bg-acid/10 px-3.5 py-1 stencil text-[9px] sm:text-[10px] text-acid shadow-[0_0_18px_rgba(212,255,77,0.25)]">
              ★ New personal best
            </div>
          )}

          <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-px bg-bone/10 border border-bone/10">
            {stats.map((st) => (
              <div key={st.label} className="bg-[#0d0a0a] px-2 py-2 sm:py-2.5">
                <div className="stencil text-[7.5px] sm:text-[8px] text-bone/40">{st.label}</div>
                <div className="mt-0.5 text-base sm:text-lg font-extrabold text-bone tabular-nums leading-none">{st.value}</div>
              </div>
            ))}
          </div>

          <div className="mt-2.5 stencil text-[8.5px] sm:text-[9px] text-bone/35 tabular-nums">
            Personal best · {s.best.toLocaleString()} pts · Wave {s.bestWave}
          </div>

          <div className="mt-5 grid grid-cols-[1fr_auto] gap-2">
            <button onClick={() => engine?.start(s.wave)} className="btn-primary py-3 text-sm min-h-[44px]">
              <CrosshairIcon /> Retry Wave {s.wave}
            </button>
            <button onClick={() => engine?.toMenu()} className="btn-ghost px-4 sm:px-5 text-[12px] min-h-[44px]">
              Menu
            </button>
          </div>
          <div className="mt-3 stencil text-[8px] sm:text-[8.5px] text-bone/30">
            Progress is saved to mission select
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
    <div key={b.key} className="absolute inset-x-0 top-[18%] sm:top-[22%] z-20 flex flex-col items-center pointer-events-none px-4">
      <div className={`banner-anim font-display text-4xl sm:text-6xl md:text-7xl ${col} text-center leading-none`} style={{ textShadow: glow }}>
        {b.text}
      </div>
      <div className="banner-anim mt-2 stencil text-[9px] sm:text-[11px] text-bone/80 bg-black/60 border border-bone/15 px-3 sm:px-4 py-1 sm:py-1.5 rounded-[3px] text-center max-w-[90vw]">
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

  const R = 50;

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
      {/* pause button at top right */}
      <button
        className="absolute top-[max(0.6rem,env(safe-area-inset-top))] right-[max(0.6rem,env(safe-area-inset-right))] btn-ghost px-3 py-1.5 text-[10.5px] pointer-events-auto rounded-[3px] shadow-[0_0_12px_rgba(0,0,0,0.7)]"
        onPointerDown={() => engine?.pause()}
        aria-label="Pause game"
      >
        ❚❚ Pause
      </button>

      {/* movement joystick at bottom left */}
      <div
        ref={zoneRef}
        className="absolute left-[max(1rem,env(safe-area-inset-left))] bottom-[max(1.5rem,env(safe-area-inset-bottom))] w-36 h-36 sm:w-40 sm:h-40 pointer-events-auto touch-none"
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
      >
        <div className="absolute left-1 top-1 w-34 h-34 sm:w-38 sm:h-38 rounded-full border-2 border-toxic/25 bg-black/40 backdrop-blur-[1px]" />
        <div
          className="absolute w-14 h-14 sm:w-16 sm:h-16 rounded-full border-2 border-toxic/60 bg-toxic/25 shadow-[0_0_12px_rgba(163,245,46,0.3)]"
          style={{
            left: joy ? joy.ox + joy.dx - 28 : 36,
            top: joy ? joy.oy + joy.dy - 28 : 36,
            transition: joy ? "none" : "all 0.15s ease",
          }}
        />
      </div>

      {/* action cluster at bottom right */}
      <div
        className="absolute right-[max(1rem,env(safe-area-inset-right))] bottom-[max(1.5rem,env(safe-area-inset-bottom))] flex flex-col items-end gap-2 sm:gap-2.5 pointer-events-auto"
        style={{ touchAction: "none" }}
      >
        <div className="flex items-center gap-2">
          <button
            className="btn-ghost px-3.5 py-2 text-[11px] rounded-[3px] min-h-[40px] font-ui font-bold"
            onPointerDown={() => engine?.dashAction()}
          >
            Dash
          </button>
          <button
            className={`px-3.5 py-2 text-[11px] rounded-[3px] min-h-[40px] font-ui font-bold ${sprintOn ? "btn-primary" : "btn-ghost"}`}
            onPointerDown={() => {
              const next = !sprintOn;
              setSprintOn(next);
              engine?.setTouchSprint(next);
            }}
          >
            {sprintOn ? "Sprint ●" : "Sprint"}
          </button>
        </div>
        <button
          className="w-18 h-18 sm:w-20 sm:h-20 rounded-full btn-primary text-[12px] border-2 shadow-[0_0_24px_rgba(163,245,46,0.45)]"
          onPointerDown={() => engine?.setTouchFire(true)}
          onPointerUp={() => engine?.setTouchFire(false)}
          onPointerCancel={() => engine?.setTouchFire(false)}
          onPointerLeave={() => engine?.setTouchFire(false)}
        >
          FIRE
        </button>
      </div>
    </div>
  );
}
