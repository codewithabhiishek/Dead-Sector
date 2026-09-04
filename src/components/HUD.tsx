import { useSyncExternalStore } from "react";
import { store, type Snapshot } from "../game/store";

export function useSnap(): Snapshot {
  return useSyncExternalStore(store.subscribe, store.get);
}

/* ----------------------------- inline SVG icons ----------------------------- */

export function Biohazard({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 8.6a3.4 3.4 0 0 0-3.4 3.4c0 .9.35 1.72.93 2.33l-1.2 1.2A5.1 5.1 0 0 1 6.9 12 5.1 5.1 0 0 1 11 6.97V5.26A6.8 6.8 0 0 0 5.2 12c0 .6.08 1.18.22 1.73l-1.6.93A8.6 8.6 0 0 1 3.4 12c0-4.75 3.85-8.6 8.6-8.6s8.6 3.85 8.6 8.6c0 .93-.15 1.83-.42 2.67l-1.6-.93c.15-.55.22-1.13.22-1.74a6.8 6.8 0 0 0-5.8-6.73v1.7A5.1 5.1 0 0 1 17.1 12a5.1 5.1 0 0 1-1.43 3.53l-1.2-1.2c.58-.6.93-1.43.93-2.33A3.4 3.4 0 0 0 12 8.6Zm-1.7 8.96 1.7-1 1.7 1a3.42 3.42 0 0 1-3.4 0Zm-5.1 2.1a6.78 6.78 0 0 0 4.1-.55l-.83-1.44a5.1 5.1 0 0 1-4.37.1l-.7 1.62c.58.16 1.18.27 1.8.27Zm13.6 0c.62 0 1.22-.1 1.8-.26l-.7-1.63a5.1 5.1 0 0 1-4.37-.1l-.83 1.45c1.29.6 2.79.67 4.1.54Z" />
    </svg>
  );
}

function Skull({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 2a8 8 0 0 0-8 8c0 2.9 1.56 5.43 3.88 6.82L8 20a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1l.12-3.18A8.01 8.01 0 0 0 12 2ZM9 13a2 2 0 1 1 0-4 2 2 0 0 1 0 4Zm6 0a2 2 0 1 1 0-4 2 2 0 0 1 0 4Zm-3 4.5-1.5-2.5h3L12 17.5Z" />
    </svg>
  );
}

function Bolt({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" />
    </svg>
  );
}

function BulletIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M9 2c3 2.5 5 6 5 9v5H4V11c0-3 2-6.5 5-9Zm-5 16h10v4H4v-4Zm12-7h6v11h-6V11Z" />
    </svg>
  );
}

function ShieldIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 2 4 5v6c0 5 3.4 9.4 8 11 4.6-1.6 8-6 8-11V5l-8-3Z" />
    </svg>
  );
}

function DashIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M3 7h8v2H3V7Zm4 4h14v2H7v-2Zm-4 4h10v2H3v-2Zm16-8 4 3-4 3V7Z" />
    </svg>
  );
}

/* --------------------------------- HUD parts --------------------------------- */

function fmtTime(s: number): string {
  const m = Math.floor(s / 60);
  const ss = Math.floor(s % 60);
  return `${m}:${ss.toString().padStart(2, "0")}`;
}

function HpPanel({ s }: { s: Snapshot }) {
  const frac = s.hp / s.maxHp;
  const critical = s.hp <= 30;
  return (
    <div className="hud-panel chamfer px-4 py-3 w-[240px]">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <Biohazard className={`w-5 h-5 ${critical ? "text-blood" : "text-toxic"}`} />
          <span className="stencil text-[10px] text-toxic/80">Vitals</span>
        </div>
        <span className={`font-extrabold text-lg leading-none ${critical ? "text-blood" : "text-bone"}`}>
          {s.hp}
          <span className="text-[10px] text-bone/50 font-semibold">/{s.maxHp}</span>
        </span>
      </div>
      <div className="bar-track chamfer-sm relative h-3.5 stripes overflow-hidden">
        <div
          className={`bar-fill-hp absolute inset-y-0 left-0 ${critical ? "critical" : ""}`}
          style={{ width: `${Math.max(0, frac * 100)}%` }}
        />
      </div>
      {s.shield > 0 && (
        <div className="mt-1.5 flex items-center gap-2">
          <ShieldIcon className="w-3.5 h-3.5 text-[#6be3ff]" />
          <div className="bar-track relative h-1.5 flex-1 overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 bg-[#6be3ff] bar-fill-generic"
              style={{ width: `${(s.shield / 6) * 100}%`, boxShadow: "0 0 8px rgba(107,227,255,0.7)" }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function ScorePanel({ s }: { s: Snapshot }) {
  return (
    <div className="flex flex-col items-end gap-2">
      <div className="hud-panel chamfer px-4 py-2.5 min-w-[210px]">
        <div className="flex items-center justify-between gap-6">
          <span className="stencil text-[10px] text-toxic/80">Score</span>
          <span className="font-extrabold text-2xl leading-none text-acid tabular-nums">
            {s.score.toLocaleString()}
          </span>
        </div>
        <div className="flex items-center justify-between gap-6 mt-1">
          <span className="stencil text-[9px] text-bone/40">Best</span>
          <span className="text-[11px] font-bold text-bone/60 tabular-nums">{s.best.toLocaleString()}</span>
        </div>
      </div>
      {s.combo > 1 && (
        <div key={s.combo} className="hud-panel chamfer-sm combo-pop px-3 py-2 border-ember/50! min-w-[170px]">
          <div className="flex items-center justify-between gap-4">
            <span className="stencil text-[10px] text-ember">Combo</span>
            <span className="font-extrabold text-xl leading-none text-ember tabular-nums">
              ×{s.comboMult.toFixed(1)}
            </span>
          </div>
          <div className="bar-track relative h-1.5 mt-1.5 overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 bg-ember bar-fill-generic"
              style={{ width: `${s.comboFrac * 100}%`, boxShadow: "0 0 8px rgba(255,179,71,0.7)" }}
            />
          </div>
        </div>
      )}
      <div className="hud-panel chamfer-sm px-3 py-2 min-w-[170px]">
        <div className="flex items-center justify-between gap-4">
          <span className="stencil text-[10px] text-toxic/80">Wave {s.wave}</span>
          <span className="flex items-center gap-1.5 text-[11px] font-bold text-bone/70 tabular-nums">
            <Skull className="w-3.5 h-3.5 text-blood" />
            {s.left} LEFT
          </span>
        </div>
      </div>
    </div>
  );
}

function WeaponPanel({ s }: { s: Snapshot }) {
  const reloading = s.reloading >= 0;
  return (
    <div className="hud-panel chamfer px-4 py-3 w-[250px]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <BulletIcon className={`w-4 h-4 shrink-0 ${reloading ? "text-ember" : "text-toxic"}`} />
          <span className="stencil text-[10px] text-toxic/80 truncate">{s.weapon}</span>
        </div>
        <div className="flex gap-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <span
              key={i}
              className={`w-1.5 h-3 skew-x-[-12deg] ${i <= s.weaponTier ? "bg-acid" : "bg-bone/15"}`}
            />
          ))}
        </div>
      </div>
      <div className="flex items-end justify-between mt-1">
        {reloading ? (
          <div className="w-full">
            <span className="stencil text-[10px] text-ember">Reloading…</span>
            <div className="bar-track relative h-2 mt-1 overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 bg-ember bar-fill-generic"
                style={{ width: `${(s.reloading as number) * 100}%` }}
              />
            </div>
          </div>
        ) : (
          <>
            <span className="font-extrabold text-3xl leading-none text-bone tabular-nums">
              {s.ammo}
              <span className="text-xs text-bone/40 font-bold"> /{s.mag}</span>
            </span>
            <span className="stencil text-[9px] text-bone/40 mb-0.5">R — reload</span>
          </>
        )}
      </div>
      <div className="mt-2">
        <div className="flex items-center justify-between mb-1">
          <span className="stencil text-[9px] text-bone/50">
            {s.tierKills > 0 ? `Next weapon in ${s.tierKills} kills` : "Arsenal maxed"}
          </span>
          <span className="text-[9px] font-bold text-bone/40 tabular-nums">{s.kills} kills</span>
        </div>
        <div className="bar-track relative h-1.5 overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 bar-fill-generic"
            style={{
              width: `${s.tierProgress * 100}%`,
              background: "linear-gradient(90deg,#5c8f1e,#a3f52e)",
              boxShadow: "0 0 8px rgba(163,245,46,0.5)",
            }}
          />
        </div>
      </div>
    </div>
  );
}

function StatusPanel({ s }: { s: Snapshot }) {
  const buffs: { key: string; label: string; v: number; max: number; col: string }[] = [];
  if (s.buffs.frenzy > 0) buffs.push({ key: "f", label: "FRENZY", v: s.buffs.frenzy, max: 8, col: "#ffd166" });
  if (s.buffs.power > 0) buffs.push({ key: "p", label: "HOLLOW PT", v: s.buffs.power, max: 8, col: "#ff9d5c" });
  if (s.buffs.shield > 0) buffs.push({ key: "s", label: "SHIELD", v: s.buffs.shield, max: 6, col: "#6be3ff" });
  return (
    <div className="flex flex-col gap-2 items-start">
      <div className="hud-panel chamfer-sm px-3 py-2 w-[190px]">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <DashIcon className={`w-4 h-4 ${s.dashFrac >= 1 ? "text-acid" : "text-bone/40"}`} />
            <span className="stencil text-[10px] text-toxic/80">Dash</span>
          </span>
          <span className={`stencil text-[9px] ${s.dashFrac >= 1 ? "text-acid" : "text-bone/40"}`}>
            {s.dashFrac >= 1 ? "READY" : "CHARGING"}
          </span>
        </div>
        <div className="bar-track relative h-1.5 mt-1.5 overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 bar-fill-generic"
            style={{
              width: `${s.dashFrac * 100}%`,
              background: s.dashFrac >= 1 ? "#d4ff4d" : "#5c8f1e",
              boxShadow: s.dashFrac >= 1 ? "0 0 8px rgba(212,255,77,0.7)" : "none",
            }}
          />
        </div>
      </div>
      {buffs.map((b) => (
        <div key={b.key} className="hud-panel chamfer-sm px-3 py-1.5 w-[190px]">
          <div className="flex items-center justify-between">
            <span className="stencil text-[10px]" style={{ color: b.col }}>
              <Bolt className="w-3 h-3 inline -mt-0.5 mr-1" />
              {b.label}
            </span>
            <span className="text-[11px] font-bold tabular-nums" style={{ color: b.col }}>
              {b.v.toFixed(1)}s
            </span>
          </div>
          <div className="bar-track relative h-1 mt-1 overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 bar-fill-generic"
              style={{ width: `${(b.v / b.max) * 100}%`, background: b.col }}
            />
          </div>
        </div>
      ))}
      <div className="stencil text-[9px] text-bone/35 pl-1 tabular-nums">T+{fmtTime(s.time)}</div>
    </div>
  );
}

function BossBar({ s }: { s: Snapshot }) {
  if (!s.boss) return null;
  return (
    <div className="w-[min(560px,80vw)]">
      <div className="flex items-center justify-between mb-1 px-1">
        <span className="stencil text-[11px] text-blood flex items-center gap-2">
          <Skull className="w-4 h-4" /> {s.boss.name}
        </span>
        <span className="text-[11px] font-bold text-blood/80 tabular-nums">{Math.ceil(s.boss.frac * 100)}%</span>
      </div>
      <div className="bar-track chamfer-sm relative h-3 overflow-hidden border-blood/50!">
        <div className="boss-fill absolute inset-y-0 left-0" style={{ width: `${s.boss.frac * 100}%` }} />
      </div>
    </div>
  );
}

export default function HUD() {
  const s = useSnap();
  if (s.phase !== "playing" && s.phase !== "paused") return null;
  return (
    <div className="absolute inset-0 pointer-events-none z-20 font-ui">
      <div className="absolute top-4 left-4">
        <HpPanel s={s} />
      </div>
      <div className="absolute top-4 right-4">
        <ScorePanel s={s} />
      </div>
      <div className="absolute top-4 left-1/2 -translate-x-1/2">
        <BossBar s={s} />
      </div>
      <div className="absolute bottom-4 left-4">
        <StatusPanel s={s} />
      </div>
      <div className="absolute bottom-4 right-4">
        <WeaponPanel s={s} />
      </div>
    </div>
  );
}
