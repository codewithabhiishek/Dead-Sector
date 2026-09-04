/* DEAD SECTOR — canvas game engine. All visuals procedural, no image assets. */

import { store, loadBest, saveBest, loadMuted, saveMuted, type BannerMsg } from "./store";
import { sfx } from "./audio";

/* ---------------------------------- types ---------------------------------- */

type ZKind = "walker" | "runner" | "spitter" | "brute" | "boss";

interface Zombie {
  kind: ZKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  hp: number;
  maxHp: number;
  speed: number;
  dmg: number;
  score: number;
  phase: number;
  flashT: number;
  atkT: number;
  lungeT: number;
  spitT: number;
  waypoint: { x: number; y: number } | null;
  dead: boolean;
}

interface Bullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  dmg: number;
  pierce: number;
  life: number;
  hitIds: Set<Zombie>;
}

interface Acid {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
}

type PickupKind = "medkit" | "frenzy" | "power" | "shield" | "nuke";

interface Pickup {
  kind: PickupKind;
  x: number;
  y: number;
  t: number;
  life: number;
}

interface Particle {
  kind: "blood" | "spark" | "shell" | "smoke" | "chunk" | "ring" | "acid";
  x: number;
  y: number;
  vx: number;
  vy: number;
  t: number;
  life: number;
  size: number;
  color: string;
  rot: number;
  vr: number;
}

interface FloatText {
  x: number;
  y: number;
  text: string;
  color: string;
  size: number;
  t: number;
  life: number;
  crit: boolean;
}

interface Weapon {
  name: string;
  dmg: number;
  rof: number;
  mag: number;
  reload: number;
  pellets: number;
  spread: number;
  speed: number;
  pierce: number;
  kick: number;
}

const WEAPONS: Weapon[] = [
  { name: "M9 SIDEARM", dmg: 13, rof: 4.4, mag: 12, reload: 0.85, pellets: 1, spread: 0.05, speed: 800, pierce: 0, kick: 2.2 },
  { name: "VECTOR SMG", dmg: 9, rof: 11.5, mag: 34, reload: 1.05, pellets: 1, spread: 0.1, speed: 840, pierce: 0, kick: 1.5 },
  { name: "RIOT SHOTGUN", dmg: 10, rof: 2.7, mag: 6, reload: 1.35, pellets: 6, spread: 0.3, speed: 720, pierce: 0, kick: 6 },
  { name: "AK-74 RIFLE", dmg: 17, rof: 7.6, mag: 30, reload: 1.2, pellets: 1, spread: 0.05, speed: 920, pierce: 1, kick: 2.4 },
  { name: "M134 MINIGUN", dmg: 11, rof: 16.5, mag: 140, reload: 2.0, pellets: 1, spread: 0.14, speed: 880, pierce: 1, kick: 1.2 },
];
const TIER_AT = [0, 12, 35, 75, 140]; // kills needed for tier index

const COMBO_WINDOW = 2.2;

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const dist2 = (ax: number, ay: number, bx: number, by: number) => {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
};

/* ---------------------------------- engine ---------------------------------- */

export class Engine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private ground: HTMLCanvasElement;
  private gore: HTMLCanvasElement;
  private goreCtx: CanvasRenderingContext2D;
  private raf = 0;
  private lastT = 0;
  private w = 800;
  private h = 600;
  private dpr = 1;
  private destroyed = false;

  private phase: "menu" | "playing" | "paused" | "gameover" = "menu";

  // input
  private keys = new Set<string>();
  private mouseX = 400;
  private mouseY = 300;
  private mouseDown = false;
  private touchVec = { x: 0, y: 0, active: false };
  private touchFiring = false;

  // player
  private px = 400;
  private py = 300;
  private pvx = 0;
  private pvy = 0;
  private hp = 100;
  private readonly maxHp = 100;
  private aim = 0;
  private invulnT = 0;
  private dashT = 0;
  private dashCd = 0;
  private dashDx = 0;
  private dashDy = 0;
  private ghosts: { x: number; y: number; a: number; aim: number }[] = [];
  private muzzleT = 0;
  private muzzleX = 0;
  private muzzleY = 0;
  private fireT = 0;
  private reloadT = -1;
  private ammo = WEAPONS[0].mag;
  private spreadKick = 0;
  private dead = false;

  // progression
  private score = 0;
  private kills = 0;
  private tier = 0;
  private combo = 0;
  private comboT = 0;
  private maxCombo = 0;
  private shots = 0;
  private hits = 0;
  private runT = 0;
  private frenzyT = 0;
  private powerT = 0;
  private shieldT = 0;
  private heartT = 0;
  private goreFadeT = 0;

  // wave
  private wave = 0;
  private toSpawn = 0;
  private spawnT = 0;
  private intermission = -1;
  private boss: Zombie | null = null;

  // entities
  private zombies: Zombie[] = [];
  private bullets: Bullet[] = [];
  private acids: Acid[] = [];
  private pickups: Pickup[] = [];
  private particles: Particle[] = [];
  private texts: FloatText[] = [];
  private ambient: Zombie[] = [];
  private spores: { x: number; y: number; vy: number; ph: number }[] = [];
  private fogs: { x: number; y: number; r: number; s: number; ph: number }[] = [];

  // feel
  private shakeT = 0;
  private shakeMag = 0;
  private freezeT = 0;
  private hurtT = 0;
  private bannerKey = 0;
  private hudT = 0;
  private time = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.ground = document.createElement("canvas");
    this.gore = document.createElement("canvas");
    this.goreCtx = this.gore.getContext("2d")!;
    sfx.muted = loadMuted();
    this.resize();
    this.seedAmbient();
    this.attach();
    this.syncHud(true);
    this.lastT = performance.now();
    const loop = (t: number) => {
      if (this.destroyed) return;
      this.raf = requestAnimationFrame(loop);
      let dt = (t - this.lastT) / 1000;
      this.lastT = t;
      dt = clamp(dt, 0, 0.05);
      this.time += dt;
      if (this.freezeT > 0) {
        this.freezeT -= dt;
        dt *= 0.12;
      }
      this.update(dt);
      this.render();
    };
    this.raf = requestAnimationFrame(loop);
  }

  /* ------------------------------ lifecycle ------------------------------ */

  private onKeyDown = (e: KeyboardEvent) => {
    const c = e.code;
    if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "KeyW", "KeyA", "KeyS", "KeyD"].includes(c)) {
      e.preventDefault();
    }
    if (c === "KeyM") {
      this.toggleMute();
      return;
    }
    if (c === "Enter" || c === "Space") {
      if (this.phase === "menu" || this.phase === "gameover") {
        if (c === "Enter" || (c === "Space" && this.phase === "gameover")) this.start();
        return;
      }
    }
    if (c === "KeyP" || c === "Escape") {
      if (this.phase === "playing") this.pause();
      else if (this.phase === "paused") this.resume();
      return;
    }
    if (this.phase !== "playing") return;
    this.keys.add(c);
    if (c === "KeyR") this.startReload();
    if (c === "Space" || c === "ShiftLeft" || c === "ShiftRight") this.dash();
  };

  private onKeyUp = (e: KeyboardEvent) => {
    this.keys.delete(e.code);
  };

  private onMouseMove = (e: MouseEvent) => {
    this.mouseX = e.clientX;
    this.mouseY = e.clientY;
  };

  private onMouseDown = (e: MouseEvent) => {
    if (e.button === 0) this.mouseDown = true;
    if (e.button === 2 && this.phase === "playing") this.dash();
  };

  private onMouseUp = (e: MouseEvent) => {
    if (e.button === 0) this.mouseDown = false;
  };

  private onCtx = (e: Event) => e.preventDefault();

  private onResize = () => this.resize();

  private onBlur = () => {
    if (this.phase === "playing") this.pause();
  };

  private attach() {
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    window.addEventListener("mousemove", this.onMouseMove);
    window.addEventListener("mousedown", this.onMouseDown);
    window.addEventListener("mouseup", this.onMouseUp);
    window.addEventListener("resize", this.onResize);
    window.addEventListener("blur", this.onBlur);
    this.canvas.addEventListener("contextmenu", this.onCtx);
  }

  destroy() {
    this.destroyed = true;
    cancelAnimationFrame(this.raf);
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    window.removeEventListener("mousemove", this.onMouseMove);
    window.removeEventListener("mousedown", this.onMouseDown);
    window.removeEventListener("mouseup", this.onMouseUp);
    window.removeEventListener("resize", this.onResize);
    window.removeEventListener("blur", this.onBlur);
    this.canvas.removeEventListener("contextmenu", this.onCtx);
    sfx.stopDrone();
  }

  private resize() {
    this.dpr = clamp(window.devicePixelRatio || 1, 1, 2);
    this.w = window.innerWidth;
    this.h = window.innerHeight;
    this.canvas.width = Math.floor(this.w * this.dpr);
    this.canvas.height = Math.floor(this.h * this.dpr);
    this.canvas.style.width = `${this.w}px`;
    this.canvas.style.height = `${this.h}px`;
    this.ground.width = this.canvas.width;
    this.ground.height = this.canvas.height;
    this.gore.width = this.canvas.width;
    this.gore.height = this.canvas.height;
    this.paintGround();
    this.px = clamp(this.px, 30, this.w - 30);
    this.py = clamp(this.py, 30, this.h - 30);
    this.seedSpores();
    this.seedFog();
  }

  /* ------------------------------ public API ------------------------------ */

  start() {
    sfx.unlock();
    sfx.ui();
    this.reset();
    this.phase = "playing";
    sfx.startDrone();
    this.startWave(1);
    this.syncHud(true);
  }

  pause() {
    if (this.phase !== "playing") return;
    this.phase = "paused";
    sfx.ui();
    this.syncHud(true);
  }

  resume() {
    if (this.phase !== "paused") return;
    this.phase = "playing";
    this.lastT = performance.now();
    sfx.ui();
    this.syncHud(true);
  }

  toMenu() {
    sfx.ui();
    sfx.stopDrone();
    this.phase = "menu";
    this.zombies = [];
    this.bullets = [];
    this.acids = [];
    this.pickups = [];
    this.texts = [];
    this.boss = null;
    this.dead = false;
    this.goreCtx.clearRect(0, 0, this.gore.width, this.gore.height);
    this.seedAmbient();
    this.syncHud(true);
  }

  toggleMute(): boolean {
    sfx.unlock();
    const m = !sfx.muted;
    sfx.setMuted(m);
    saveMuted(m);
    store.set({ muted: m });
    return m;
  }

  dashAction() {
    if (this.phase === "playing") this.dash();
  }

  setTouchMove(x: number, y: number, active: boolean) {
    this.touchVec.x = x;
    this.touchVec.y = y;
    this.touchVec.active = active;
  }

  setTouchFire(on: boolean) {
    this.touchFiring = on;
  }

  get isTouch(): boolean {
    return typeof window !== "undefined" && ("ontouchstart" in window || navigator.maxTouchPoints > 0);
  }

  /* -------------------------------- setup -------------------------------- */

  private reset() {
    this.zombies = [];
    this.bullets = [];
    this.acids = [];
    this.pickups = [];
    this.particles = [];
    this.texts = [];
    this.ambient = [];
    this.boss = null;
    this.px = this.w / 2;
    this.py = this.h / 2;
    this.pvx = 0;
    this.pvy = 0;
    this.hp = this.maxHp;
    this.dead = false;
    this.invulnT = 0;
    this.dashT = 0;
    this.dashCd = 0;
    this.ghosts = [];
    this.fireT = 0;
    this.reloadT = -1;
    this.ammo = WEAPONS[0].mag;
    this.score = 0;
    this.kills = 0;
    this.tier = 0;
    this.combo = 0;
    this.comboT = 0;
    this.maxCombo = 0;
    this.shots = 0;
    this.hits = 0;
    this.runT = 0;
    this.frenzyT = 0;
    this.powerT = 0;
    this.shieldT = 0;
    this.wave = 0;
    this.intermission = -1;
    this.hurtT = 0;
    this.shakeT = 0;
    this.goreCtx.clearRect(0, 0, this.gore.width, this.gore.height);
  }

  private seedAmbient() {
    this.ambient = [];
    const n = 8;
    for (let i = 0; i < n; i++) {
      this.ambient.push(
        this.makeZombie(Math.random() < 0.3 ? "runner" : "walker", rand(60, this.w - 60), rand(60, this.h - 60), 1)
      );
    }
  }

  private seedSpores() {
    this.spores = [];
    const n = Math.floor((this.w * this.h) / 38000);
    for (let i = 0; i < n; i++) {
      this.spores.push({ x: rand(0, this.w), y: rand(0, this.h), vy: rand(6, 20), ph: rand(0, 6.28) });
    }
  }

  private seedFog() {
    this.fogs = [];
    for (let i = 0; i < 6; i++) {
      this.fogs.push({
        x: rand(0, this.w),
        y: rand(0, this.h),
        r: rand(180, 380),
        s: rand(8, 22),
        ph: rand(0, 6.28),
      });
    }
  }

  private paintGround() {
    const g = this.ground.getContext("2d")!;
    const W = this.ground.width;
    const H = this.ground.height;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.fillStyle = "#0e140d";
    g.fillRect(0, 0, W, H);
    // mottled patches
    for (let i = 0; i < 42; i++) {
      const x = rand(0, W);
      const y = rand(0, H);
      const r = rand(40, 220) * this.dpr;
      const dark = Math.random() < 0.6;
      const gr = g.createRadialGradient(x, y, 0, x, y, r);
      if (dark) {
        gr.addColorStop(0, "rgba(0,0,0,0.20)");
        gr.addColorStop(1, "rgba(0,0,0,0)");
      } else {
        gr.addColorStop(0, "rgba(96,124,66,0.07)");
        gr.addColorStop(1, "rgba(96,124,66,0)");
      }
      g.fillStyle = gr;
      g.fillRect(x - r, y - r, r * 2, r * 2);
    }
    // cracks
    g.strokeStyle = "rgba(0,0,0,0.35)";
    for (let i = 0; i < 26; i++) {
      g.lineWidth = rand(0.6, 1.6) * this.dpr;
      g.beginPath();
      let x = rand(0, W);
      let y = rand(0, H);
      g.moveTo(x, y);
      const segs = 4 + Math.floor(rand(0, 5));
      for (let s = 0; s < segs; s++) {
        x += rand(-70, 70) * this.dpr;
        y += rand(-70, 70) * this.dpr;
        g.lineTo(x, y);
      }
      g.stroke();
    }
    // speckles / bones
    for (let i = 0; i < 320; i++) {
      g.fillStyle = Math.random() < 0.85 ? "rgba(0,0,0,0.22)" : "rgba(214,206,178,0.10)";
      const s = rand(1, 2.6) * this.dpr;
      g.fillRect(rand(0, W), rand(0, H), s, s);
    }
    // containment ring + stencil markings
    const cx = W / 2;
    const cy = H / 2;
    g.strokeStyle = "rgba(163,245,46,0.07)";
    g.lineWidth = 3 * this.dpr;
    g.setLineDash([26 * this.dpr, 18 * this.dpr]);
    g.beginPath();
    g.arc(cx, cy, Math.min(W, H) * 0.33, 0, Math.PI * 2);
    g.stroke();
    g.setLineDash([]);
    g.font = `700 ${26 * this.dpr}px Oxanium, monospace`;
    g.fillStyle = "rgba(163,245,46,0.06)";
    g.textAlign = "center";
    g.fillText("SECTOR 9 // CONTAINMENT FIELD", cx, cy - Math.min(W, H) * 0.33 - 16 * this.dpr);
    g.fillStyle = "rgba(229,34,46,0.05)";
    g.font = `700 ${18 * this.dpr}px Oxanium, monospace`;
    g.fillText("NO EXIT — AUTHORIZED PERSONNEL ONLY", cx, cy + Math.min(W, H) * 0.33 + 30 * this.dpr);
    // hazard corner stripes
    g.save();
    g.globalAlpha = 0.05;
    for (const [ox, oy, rot] of [
      [0, 0, 0],
      [W, 0, Math.PI / 2],
      [W, H, Math.PI],
      [0, H, -Math.PI / 2],
    ] as const) {
      g.save();
      g.translate(ox, oy);
      g.rotate(rot);
      for (let i = 0; i < 7; i++) {
        g.fillStyle = i % 2 === 0 ? "#e8b62a" : "#10160f";
        g.beginPath();
        g.moveTo(i * 26 * this.dpr, 0);
        g.lineTo(i * 26 * this.dpr + 26 * this.dpr, 0);
        g.lineTo(i * 26 * this.dpr + 10 * this.dpr, 60 * this.dpr);
        g.lineTo(i * 26 * this.dpr - 16 * this.dpr, 60 * this.dpr);
        g.fill();
      }
      g.restore();
    }
    g.restore();
  }

  /* --------------------------------- waves --------------------------------- */

  private startWave(n: number) {
    this.wave = n;
    const isBoss = n % 5 === 0;
    let total = Math.min(70, Math.floor(5 + n * 3 + Math.pow(n, 1.18)));
    if (isBoss) total = Math.max(6, Math.floor(total * 0.55));
    this.toSpawn = total;
    this.spawnT = 1.1;
    this.intermission = -1;
    sfx.waveHorn(isBoss);
    this.banner(
      isBoss ? "ABOMINATION DETECTED" : `WAVE ${n}`,
      isBoss ? "MASSIVE SIGNATURE — BRACE" : `${total} HOSTILES INBOUND`,
      isBoss ? "blood" : "toxic"
    );
  }

  private banner(text: string, sub: string, tone: BannerMsg["tone"]) {
    this.bannerKey++;
    store.set({ banner: { text, sub, tone, key: this.bannerKey } });
  }

  private hpScale() {
    return 1 + (this.wave - 1) * 0.16;
  }

  private spdScale() {
    return 1 + Math.min(this.wave, 25) * 0.018;
  }

  private pickKind(): ZKind {
    const r = Math.random();
    const pBrute = this.wave >= 4 ? Math.min(0.16, 0.05 + this.wave * 0.012) : 0;
    const pSpit = this.wave >= 3 ? Math.min(0.2, 0.07 + this.wave * 0.015) : 0;
    const pRun = this.wave >= 2 ? Math.min(0.3, 0.1 + this.wave * 0.02) : 0;
    if (r < pBrute) return "brute";
    if (r < pBrute + pSpit) return "spitter";
    if (r < pBrute + pSpit + pRun) return "runner";
    return "walker";
  }

  private makeZombie(kind: ZKind, x: number, y: number, hpMul: number): Zombie {
    const base = {
      x,
      y,
      vx: 0,
      vy: 0,
      phase: rand(0, 6.28),
      flashT: 0,
      atkT: 0,
      lungeT: 0,
      spitT: rand(1, 2.4),
      waypoint: null,
      dead: false,
    };
    const hs = this.hpScale() * hpMul;
    const ss = this.spdScale();
    switch (kind) {
      case "runner":
        return { ...base, kind, r: 11, hp: 16 * hs, maxHp: 16 * hs, speed: rand(118, 148) * ss, dmg: 6, score: 15 };
      case "spitter":
        return { ...base, kind, r: 12, hp: 30 * hs, maxHp: 30 * hs, speed: rand(55, 68) * ss, dmg: 5, score: 25 };
      case "brute":
        return { ...base, kind, r: 24, hp: 150 * hs, maxHp: 150 * hs, speed: rand(34, 42) * ss, dmg: 22, score: 60 };
      case "boss":
        return { ...base, kind, r: 44, hp: 950 * (1 + (this.wave / 5 - 1) * 0.4), maxHp: 950 * (1 + (this.wave / 5 - 1) * 0.4), speed: 32 * ss, dmg: 30, score: 500 };
      default:
        return { ...base, kind, r: 14, hp: 26 * hs, maxHp: 26 * hs, speed: rand(52, 72) * ss, dmg: 8, score: 10 };
    }
  }

  private spawnZombie() {
    const side = Math.floor(rand(0, 4));
    const m = 46;
    let x = 0;
    let y = 0;
    if (side === 0) {
      x = rand(-m, this.w + m);
      y = -m;
    } else if (side === 1) {
      x = this.w + m;
      y = rand(-m, this.h + m);
    } else if (side === 2) {
      x = rand(-m, this.w + m);
      y = this.h + m;
    } else {
      x = -m;
      y = rand(-m, this.h + m);
    }
    const z = this.makeZombie(this.pickKind(), x, y, 1);
    this.zombies.push(z);
    // spawn poof
    for (let i = 0; i < 5; i++) {
      this.particles.push({
        kind: "smoke",
        x: clamp(x, 10, this.w - 10),
        y: clamp(y, 10, this.h - 10),
        vx: rand(-30, 30),
        vy: rand(-40, -10),
        t: 0,
        life: rand(0.4, 0.7),
        size: rand(8, 16),
        color: "rgba(120,150,90,0.25)",
        rot: 0,
        vr: 0,
      });
    }
  }

  private spawnBoss() {
    const b = this.makeZombie("boss", this.w / 2, -60, 1);
    this.zombies.push(b);
    this.boss = b;
  }

  /* -------------------------------- update -------------------------------- */

  private update(dt: number) {
    if (this.phase === "menu") {
      this.updateAmbient(dt);
      this.updateParticles(dt);
      this.updateAtmos(dt);
      return;
    }
    if (this.phase !== "playing" && this.phase !== "gameover") return;

    this.updateAtmos(dt);

    if (this.phase === "gameover") {
      this.updateZombies(dt, true);
      this.updateParticles(dt);
      this.updateTexts(dt);
      return;
    }

    this.runT += dt;
    this.muzzleT = Math.max(0, this.muzzleT - dt);
    this.invulnT = Math.max(0, this.invulnT - dt);
    this.dashCd = Math.max(0, this.dashCd - dt);
    this.frenzyT = Math.max(0, this.frenzyT - dt);
    this.powerT = Math.max(0, this.powerT - dt);
    this.shieldT = Math.max(0, this.shieldT - dt);
    this.hurtT = Math.max(0, this.hurtT - dt * 2.4);
    this.spreadKick = Math.max(0, this.spreadKick - dt * 3);
    this.comboT -= dt;
    if (this.comboT <= 0 && this.combo > 0) this.combo = 0;

    if (this.hp < 30 && !this.dead) {
      this.heartT -= dt;
      if (this.heartT <= 0) {
        sfx.heart();
        this.heartT = 0.95;
      }
    }

    this.updatePlayer(dt);
    this.updateFiring(dt);
    this.updateBullets(dt);
    this.updateWave(dt);
    this.updateZombies(dt, false);
    this.updateAcids(dt);
    this.updatePickups(dt);
    this.updateParticles(dt);
    this.updateTexts(dt);

    // gore fade
    this.goreFadeT -= dt;
    if (this.goreFadeT <= 0) {
      this.goreFadeT = 1.6;
      this.goreCtx.save();
      this.goreCtx.globalCompositeOperation = "destination-out";
      this.goreCtx.fillStyle = "rgba(0,0,0,0.028)";
      this.goreCtx.fillRect(0, 0, this.gore.width, this.gore.height);
      this.goreCtx.restore();
    }

    this.hudT -= dt;
    if (this.hudT <= 0) {
      this.hudT = 0.1;
      this.syncHud(false);
    }
  }

  private updateAtmos(dt: number) {
    for (const s of this.spores) {
      s.y -= s.vy * dt;
      s.x += Math.sin(this.time * 0.7 + s.ph) * 8 * dt;
      if (s.y < -6) {
        s.y = this.h + 6;
        s.x = rand(0, this.w);
      }
    }
    for (const f of this.fogs) {
      f.x += Math.sin(this.time * 0.05 + f.ph) * f.s * dt;
      f.y += Math.cos(this.time * 0.04 + f.ph) * f.s * 0.6 * dt;
      if (f.x < -f.r) f.x = this.w + f.r;
      if (f.x > this.w + f.r) f.x = -f.r;
      if (f.y < -f.r) f.y = this.h + f.r;
      if (f.y > this.h + f.r) f.y = -f.r;
    }
    this.shakeT = Math.max(0, this.shakeT - dt);
  }

  private updateAmbient(dt: number) {
    for (const z of this.ambient) {
      if (!z.waypoint || dist2(z.x, z.y, z.waypoint.x, z.waypoint.y) < 900) {
        z.waypoint = { x: rand(50, this.w - 50), y: rand(50, this.h - 50) };
      }
      const a = Math.atan2(z.waypoint.y - z.y, z.waypoint.x - z.x);
      z.x += Math.cos(a) * z.speed * 0.4 * dt;
      z.y += Math.sin(a) * z.speed * 0.4 * dt;
      z.phase += dt * 3;
    }
  }

  private moveInput(): { x: number; y: number } {
    let x = 0;
    let y = 0;
    if (this.keys.has("KeyW") || this.keys.has("ArrowUp")) y -= 1;
    if (this.keys.has("KeyS") || this.keys.has("ArrowDown")) y += 1;
    if (this.keys.has("KeyA") || this.keys.has("ArrowLeft")) x -= 1;
    if (this.keys.has("KeyD") || this.keys.has("ArrowRight")) x += 1;
    if (this.touchVec.active) {
      x += this.touchVec.x;
      y += this.touchVec.y;
    }
    const l = Math.hypot(x, y);
    if (l > 1) {
      x /= l;
      y /= l;
    }
    return { x, y };
  }

  private updatePlayer(dt: number) {
    if (this.dead) return;
    const mv = this.moveInput();
    const spd = 268;

    if (this.dashT > 0) {
      this.dashT -= dt;
      this.pvx = this.dashDx * 940;
      this.pvy = this.dashDy * 940;
      this.ghosts.push({ x: this.px, y: this.py, a: 0.5, aim: this.aim });
    } else {
      this.pvx = mv.x * spd;
      this.pvy = mv.y * spd;
    }
    this.px = clamp(this.px + this.pvx * dt, 22, this.w - 22);
    this.py = clamp(this.py + this.pvy * dt, 22, this.h - 22);

    for (const g of this.ghosts) g.a -= dt * 2.4;
    this.ghosts = this.ghosts.filter((g) => g.a > 0);

    // aim
    if (this.touchFiring) {
      let best: Zombie | null = null;
      let bd = 720 * 720;
      for (const z of this.zombies) {
        const d = dist2(z.x, z.y, this.px, this.py);
        if (d < bd) {
          bd = d;
          best = z;
        }
      }
      if (best) this.aim = Math.atan2(best.y - this.py, best.x - this.px);
    } else {
      this.aim = Math.atan2(this.mouseY - this.py, this.mouseX - this.px);
    }
  }

  private dash() {
    if (this.dashCd > 0 || this.dashT > 0 || this.dead) return;
    const mv = this.moveInput();
    let dx = mv.x;
    let dy = mv.y;
    if (dx === 0 && dy === 0) {
      dx = Math.cos(this.aim);
      dy = Math.sin(this.aim);
    }
    const l = Math.hypot(dx, dy) || 1;
    this.dashDx = dx / l;
    this.dashDy = dy / l;
    this.dashT = 0.17;
    this.dashCd = 1.5;
    this.invulnT = Math.max(this.invulnT, 0.22);
    sfx.dash();
    for (let i = 0; i < 8; i++) {
      this.particles.push({
        kind: "smoke",
        x: this.px - this.dashDx * 14,
        y: this.py - this.dashDy * 14,
        vx: -this.dashDx * rand(40, 130) + rand(-30, 30),
        vy: -this.dashDy * rand(40, 130) + rand(-30, 30),
        t: 0,
        life: rand(0.25, 0.45),
        size: rand(6, 12),
        color: "rgba(163,245,46,0.22)",
        rot: 0,
        vr: 0,
      });
    }
  }

  private weapon(): Weapon {
    return WEAPONS[this.tier];
  }

  private startReload() {
    if (this.reloadT >= 0 || this.ammo >= this.weapon().mag || this.dead) return;
    this.reloadT = this.weapon().reload * (this.frenzyT > 0 ? 0.7 : 1);
    sfx.reload();
  }

  private updateFiring(dt: number) {
    if (this.reloadT >= 0) {
      this.reloadT -= dt;
      if (this.reloadT <= 0) {
        this.reloadT = -1;
        this.ammo = this.weapon().mag;
        sfx.reloadDone();
      }
      return;
    }
    const wantFire = this.mouseDown || this.touchFiring;
    this.fireT -= dt;
    if (!wantFire || this.fireT > 0 || this.dead) return;
    if (this.ammo <= 0) {
      sfx.empty();
      this.startReload();
      this.fireT = 0.25;
      return;
    }
    const w = this.weapon();
    this.fireT = 1 / (w.rof * (this.frenzyT > 0 ? 1.7 : 1));
    this.ammo--;
    this.shots += w.pellets;
    const spread = w.spread + this.spreadKick * 0.05;
    const mx = this.px + Math.cos(this.aim) * 24;
    const my = this.py + Math.sin(this.aim) * 24;
    const dmgMul = this.powerT > 0 ? 1.75 : 1;
    for (let i = 0; i < w.pellets; i++) {
      const a = this.aim + rand(-spread, spread);
      const spd = w.speed * rand(0.92, 1.08);
      this.bullets.push({
        x: mx,
        y: my,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd,
        dmg: w.dmg * dmgMul * rand(0.9, 1.1),
        pierce: w.pierce,
        life: 0.9,
        hitIds: new Set(),
      });
    }
    this.muzzleT = 0.05;
    this.muzzleX = mx;
    this.muzzleY = my;
    this.spreadKick = Math.min(1.6, this.spreadKick + 0.35);
    this.addShake(w.kick * 0.5, 0.09);
    this.px -= Math.cos(this.aim) * w.kick * 0.4;
    this.py -= Math.sin(this.aim) * w.kick * 0.4;
    sfx.shoot(this.tier);
    // shell casing
    const ea = this.aim + Math.PI / 2 + rand(-0.4, 0.4);
    this.particles.push({
      kind: "shell",
      x: this.px + Math.cos(this.aim) * 10,
      y: this.py + Math.sin(this.aim) * 10,
      vx: Math.cos(ea) * rand(90, 160),
      vy: Math.sin(ea) * rand(90, 160) - 60,
      t: 0,
      life: 0.9,
      size: 3,
      color: "#ffd166",
      rot: rand(0, 6.28),
      vr: rand(-14, 14),
    });
    if (this.ammo <= 0) this.startReload();
  }

  private updateBullets(dt: number) {
    for (const b of this.bullets) {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      if (b.x < -20 || b.x > this.w + 20 || b.y < -20 || b.y > this.h + 20) b.life = 0;
      for (const z of this.zombies) {
        if (z.dead || b.hitIds.has(z)) continue;
        const rr = z.r + 4;
        if (dist2(b.x, b.y, z.x, z.y) < rr * rr) {
          b.hitIds.add(z);
          this.hits++;
          const crit = Math.random() < 0.12;
          const dmg = b.dmg * (crit ? 2 : 1);
          z.hp -= dmg;
          z.flashT = 0.09;
          const ka = Math.atan2(b.vy, b.vx);
          const kb = z.kind === "brute" || z.kind === "boss" ? 14 : 90;
          z.x += Math.cos(ka) * kb * 0.1;
          z.y += Math.sin(ka) * kb * 0.1;
          this.blood(b.x, b.y, ka, z.kind === "brute" || z.kind === "boss" ? 10 : 6);
          this.texts.push({
            x: z.x + rand(-10, 10),
            y: z.y - z.r - 6,
            text: String(Math.round(dmg)),
            color: crit ? "#ffd166" : "#e8f5d8",
            size: crit ? 21 : 14,
            t: 0,
            life: 0.7,
            crit,
          });
          if (Math.random() < 0.4) sfx.zHit();
          if (z.hp <= 0) this.killZombie(z, ka);
          if (b.pierce > 0) b.pierce--;
          else {
            b.life = 0;
            break;
          }
        }
      }
    }
    this.bullets = this.bullets.filter((b) => b.life > 0);
  }

  private updateWave(dt: number) {
    if (this.intermission >= 0) {
      this.intermission -= dt;
      if (this.intermission <= 0) this.startWave(this.wave + 1);
      return;
    }
    const aliveCap = Math.min(85, 24 + this.wave * 4);
    if (this.toSpawn > 0) {
      this.spawnT -= dt;
      if (this.spawnT <= 0 && this.zombies.length < aliveCap) {
        const burst = this.wave >= 6 && Math.random() < 0.25 ? 2 : 1;
        for (let i = 0; i < burst && this.toSpawn > 0; i++) {
          this.spawnZombie();
          this.toSpawn--;
        }
        this.spawnT = Math.max(0.28, 1.45 - this.wave * 0.085) * rand(0.7, 1.3);
      }
    } else if (this.zombies.length === 0) {
      // wave cleared
      const heal = 14;
      this.hp = Math.min(this.maxHp, this.hp + heal);
      this.banner("WAVE CLEARED", `+${heal} HP RECOVERED — REGROUPING`, "bone");
      sfx.waveClear();
      this.intermission = 3.0;
    }
    // spawn boss alongside wave 5,10,...
    if (this.wave % 5 === 0 && !this.boss && this.toSpawn <= Math.floor(this.toSpawnInit() / 2)) {
      this.spawnBoss();
    }
  }

  private toSpawnInit(): number {
    const n = this.wave;
    let total = Math.min(70, Math.floor(5 + n * 3 + Math.pow(n, 1.18)));
    if (n % 5 === 0) total = Math.max(6, Math.floor(total * 0.55));
    return total;
  }

  private updateZombies(dt: number, noPlayer: boolean) {
    const list = this.zombies;
    for (const z of list) {
      if (z.dead) continue;
      z.flashT = Math.max(0, z.flashT - dt);
      z.atkT = Math.max(0, z.atkT - dt);
      z.lungeT = Math.max(0, z.lungeT - dt);
      z.phase += dt * (z.kind === "runner" ? 11 : 5);

      const tx = noPlayer ? this.px : this.px;
      const ty = noPlayer ? this.py : this.py;
      const d = Math.hypot(tx - z.x, ty - z.y) || 1;
      const dirX = (tx - z.x) / d;
      const dirY = (ty - z.y) / d;

      if (z.kind === "spitter" && !noPlayer) {
        z.spitT -= dt;
        const want = 250;
        let mx = 0;
        let my = 0;
        if (d > want + 40) {
          mx = dirX;
          my = dirY;
        } else if (d < want - 60) {
          mx = -dirX;
          my = -dirY;
        } else {
          mx = -dirY;
          my = dirX;
        }
        z.x += mx * z.speed * dt;
        z.y += my * z.speed * dt;
        if (z.spitT <= 0 && d < 560 && !this.dead) {
          z.spitT = rand(1.9, 2.7);
          const a = Math.atan2(this.py - z.y, this.px - z.x) + rand(-0.12, 0.12);
          this.acids.push({ x: z.x, y: z.y, vx: Math.cos(a) * 270, vy: Math.sin(a) * 270, life: 2.4 });
          sfx.spit();
          z.lungeT = 0.2;
        }
      } else {
        z.x += dirX * z.speed * dt;
        z.y += dirY * z.speed * dt;
      }

      z.x = clamp(z.x, -60, this.w + 60);
      z.y = clamp(z.y, -60, this.h + 60);

      // attack player
      if (!noPlayer && !this.dead) {
        const pr = z.r + 15;
        if (dist2(z.x, z.y, this.px, this.py) < pr * pr && z.atkT <= 0) {
          z.atkT = 0.9;
          z.lungeT = 0.22;
          this.damagePlayer(z.dmg, z.x, z.y, z.kind === "brute" || z.kind === "boss");
        }
      }
    }

    // separation
    for (let i = 0; i < list.length; i++) {
      const a = list[i];
      if (a.dead) continue;
      for (let j = i + 1; j < list.length; j++) {
        const b = list[j];
        if (b.dead) continue;
        const rr = a.r + b.r;
        const d2 = dist2(a.x, a.y, b.x, b.y);
        if (d2 < rr * rr && d2 > 0.01) {
          const d = Math.sqrt(d2);
          const push = ((rr - d) / d) * 0.5;
          const wa = b.r / (a.r + b.r);
          const wb = a.r / (a.r + b.r);
          a.x -= (a.x - b.x) * push * wa * 1.6;
          a.y -= (a.y - b.y) * push * wa * 1.6;
          b.x += (a.x - b.x) * push * wb * 0.1;
          b.y += (a.y - b.y) * push * wb * 0.1;
        }
      }
    }
    this.zombies = list.filter((z) => !z.dead);
    if (this.boss && this.boss.dead) this.boss = null;
  }

  private updateAcids(dt: number) {
    for (const a of this.acids) {
      a.x += a.vx * dt;
      a.y += a.vy * dt;
      a.life -= dt;
      if (a.x < -20 || a.x > this.w + 20 || a.y < -20 || a.y > this.h + 20) {
        a.life = 0;
        continue;
      }
      if (!this.dead && dist2(a.x, a.y, this.px, this.py) < 20 * 20) {
        this.damagePlayer(10, a.x, a.y, false);
        sfx.acidHit();
        this.acidSplat(a.x, a.y);
        a.life = 0;
      }
    }
    this.acids = this.acids.filter((a) => a.life > 0);
  }

  private updatePickups(dt: number) {
    for (const p of this.pickups) {
      p.t += dt;
      p.life -= dt;
      const rr = 26 + 15;
      if (dist2(p.x, p.y, this.px, this.py) < rr * rr) {
        p.life = 0;
        this.applyPickup(p);
      }
    }
    this.pickups = this.pickups.filter((p) => p.life > 0);
  }

  private applyPickup(p: Pickup) {
    switch (p.kind) {
      case "medkit":
        this.hp = Math.min(this.maxHp, this.hp + 32);
        sfx.medkit();
        this.floatLabel(p.x, p.y, "+32 HP", "#7dffa0");
        break;
      case "frenzy":
        this.frenzyT = 8;
        sfx.pickup();
        this.floatLabel(p.x, p.y, "FRENZY — FIRE RATE UP", "#ffd166");
        break;
      case "power":
        this.powerT = 8;
        sfx.pickup();
        this.floatLabel(p.x, p.y, "HOLLOW POINTS — DMG UP", "#ff9d5c");
        break;
      case "shield":
        this.shieldT = 6;
        sfx.pickup();
        this.floatLabel(p.x, p.y, "BARRIER SHIELD", "#6be3ff");
        break;
      case "nuke":
        sfx.nuke();
        this.floatLabel(p.x, p.y, "TACTICAL NUKE", "#d4ff4d");
        this.addShake(20, 0.6);
        this.freezeT = 0.09;
        this.particles.push({ kind: "ring", x: this.px, y: this.py, vx: 0, vy: 0, t: 0, life: 0.6, size: 10, color: "#d4ff4d", rot: 0, vr: 0 });
        for (const z of this.zombies) {
          if (z.dead) continue;
          z.hp -= 420;
          this.blood(z.x, z.y, rand(0, 6.28), 8);
          if (z.hp <= 0) this.killZombie(z, rand(0, 6.28));
        }
        break;
    }
  }

  private floatLabel(x: number, y: number, text: string, color: string) {
    this.texts.push({ x, y: y - 18, text, color, size: 15, t: 0, life: 1.1, crit: false });
  }

  private dropPickup(x: number, y: number, force?: PickupKind) {
    if (this.pickups.length >= 7 && !force) return;
    let kind: PickupKind;
    if (force) kind = force;
    else {
      const r = Math.random();
      if (r < 0.013) kind = "nuke";
      else if (r < 0.085) kind = "medkit";
      else if (r < 0.135) kind = "frenzy";
      else if (r < 0.185) kind = "power";
      else if (r < 0.215) kind = "shield";
      else return;
    }
    this.pickups.push({ kind, x: clamp(x, 30, this.w - 30), y: clamp(y, 30, this.h - 30), t: rand(0, 3), life: 12 });
  }

  /* ------------------------------ combat core ------------------------------ */

  private blood(x: number, y: number, angle: number, n: number) {
    for (let i = 0; i < n; i++) {
      const a = angle + rand(-1.1, 1.1);
      const s = rand(60, 260);
      this.particles.push({
        kind: "blood",
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        t: 0,
        life: rand(0.25, 0.55),
        size: rand(1.6, 3.6),
        color: Math.random() < 0.5 ? "#a51420" : "#e5222e",
        rot: 0,
        vr: 0,
      });
    }
  }

  private acidSplat(x: number, y: number) {
    for (let i = 0; i < 8; i++) {
      const a = rand(0, 6.28);
      const s = rand(30, 130);
      this.particles.push({
        kind: "acid",
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        t: 0,
        life: rand(0.25, 0.5),
        size: rand(2, 4),
        color: "#a8e62e",
        rot: 0,
        vr: 0,
      });
    }
  }

  private goreSplat(x: number, y: number, big: boolean) {
    const g = this.goreCtx;
    g.save();
    g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    const n = big ? 9 : 5;
    for (let i = 0; i < n; i++) {
      const a = rand(0, 6.28);
      const d = rand(0, big ? 34 : 20);
      const r = rand(3, big ? 14 : 9);
      g.fillStyle = Math.random() < 0.5 ? "rgba(96,10,16,0.5)" : "rgba(140,16,24,0.42)";
      g.beginPath();
      g.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, r, 0, Math.PI * 2);
      g.fill();
    }
    g.restore();
  }

  private killZombie(z: Zombie, angle: number) {
    if (z.dead) return;
    z.dead = true;
    const big = z.kind === "brute" || z.kind === "boss";
    this.kills++;
    this.combo++;
    this.comboT = COMBO_WINDOW;
    this.maxCombo = Math.max(this.maxCombo, this.combo);
    if (this.combo > 1 && this.combo % 5 === 0) {
      sfx.combo(this.combo);
      this.floatLabel(z.x, z.y - 20, `KILL STREAK ×${this.combo}`, "#d4ff4d");
    }
    const mult = 1 + Math.min(this.combo, 40) * 0.1;
    const gained = Math.round(z.score * mult);
    this.score += gained;
    this.texts.push({
      x: z.x,
      y: z.y - z.r - 16,
      text: `+${gained}`,
      color: "#a3f52e",
      size: big ? 19 : 13,
      t: 0,
      life: 0.9,
      crit: false,
    });

    // gore + particles
    this.goreSplat(z.x, z.y, big);
    this.blood(z.x, z.y, angle, big ? 18 : 9);
    for (let i = 0; i < (big ? 7 : 3); i++) {
      this.particles.push({
        kind: "chunk",
        x: z.x,
        y: z.y,
        vx: rand(-160, 160),
        vy: rand(-200, -40),
        t: 0,
        life: rand(0.4, 0.7),
        size: rand(2.5, big ? 6 : 4.5),
        color: "#7a1420",
        rot: rand(0, 6.28),
        vr: rand(-10, 10),
      });
    }
    sfx.zDie(big);
    sfx.splat();
    this.freezeT = Math.max(this.freezeT, big ? 0.055 : 0.028);
    this.addShake(big ? 7 : 2.5, 0.18);

    // drops
    if (z.kind === "boss") {
      this.dropPickup(z.x - 30, z.y, "medkit");
      this.dropPickup(z.x + 30, z.y - 20, "power");
      this.dropPickup(z.x, z.y + 30, "frenzy");
    } else {
      this.dropPickup(z.x, z.y);
    }

    this.checkTier();
  }

  private checkTier() {
    let t = 0;
    for (let i = 0; i < TIER_AT.length; i++) if (this.kills >= TIER_AT[i]) t = i;
    if (t > this.tier) {
      this.tier = t;
      const w = WEAPONS[t];
      this.ammo = w.mag;
      this.reloadT = -1;
      this.fireT = 0.2;
      sfx.tierUp();
      this.banner("WEAPON UPGRADED", w.name, "toxic");
      this.floatLabel(this.px, this.py - 40, w.name, "#d4ff4d");
    }
  }

  private damagePlayer(amount: number, sx: number, sy: number, heavy: boolean) {
    if (this.invulnT > 0 || this.dashT > 0 || this.dead) return;
    if (this.shieldT > 0) {
      sfx.acidHit();
      this.addShake(3, 0.12);
      for (let i = 0; i < 8; i++) {
        const a = Math.atan2(this.py - sy, this.px - sx) + rand(-0.9, 0.9);
        this.particles.push({
          kind: "spark",
          x: this.px + Math.cos(a) * 20,
          y: this.py + Math.sin(a) * 20,
          vx: Math.cos(a) * rand(80, 220),
          vy: Math.sin(a) * rand(80, 220),
          t: 0,
          life: 0.3,
          size: 2,
          color: "#6be3ff",
          rot: 0,
          vr: 0,
        });
      }
      return;
    }
    this.hp -= amount;
    this.invulnT = 0.7;
    this.hurtT = 1;
    this.combo = 0;
    sfx.hurt();
    this.addShake(heavy ? 13 : 8, 0.3);
    // knockback
    const a = Math.atan2(this.py - sy, this.px - sx);
    const kb = heavy ? 130 : 60;
    this.px = clamp(this.px + Math.cos(a) * kb * 0.3, 22, this.w - 22);
    this.py = clamp(this.py + Math.sin(a) * kb * 0.3, 22, this.h - 22);
    this.blood(this.px, this.py, a, 6);
    if (this.hp <= 0) {
      this.hp = 0;
      this.die();
    }
  }

  private die() {
    this.dead = true;
    sfx.gameOver();
    sfx.stopDrone();
    this.goreSplat(this.px, this.py, true);
    for (let i = 0; i < 26; i++) {
      const a = rand(0, 6.28);
      const s = rand(60, 320);
      this.particles.push({
        kind: i % 3 === 0 ? "chunk" : "blood",
        x: this.px,
        y: this.py,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        t: 0,
        life: rand(0.4, 0.9),
        size: rand(2, 5),
        color: i % 2 === 0 ? "#a51420" : "#e5222e",
        rot: rand(0, 6.28),
        vr: rand(-8, 8),
      });
    }
    this.addShake(18, 0.7);
    this.freezeT = 0.12;
    const { best, bestWave } = loadBest();
    const newBest = this.score > best;
    saveBest(this.score, this.wave);
    const stats = {
      score: this.score,
      wave: this.wave,
      kills: this.kills,
      maxCombo: this.maxCombo,
      accuracy: this.shots > 0 ? clamp(this.hits / this.shots, 0, 1) : 0,
      time: this.runT,
      newBest,
      best: Math.max(best, this.score),
      bestWave: Math.max(bestWave, this.wave),
    };
    setTimeout(() => {
      if (this.destroyed) return;
      this.phase = "gameover";
      store.set({ phase: "gameover", stats });
      this.syncHud(true);
    }, 900);
  }

  private addShake(mag: number, t: number) {
    this.shakeMag = Math.max(this.shakeMag * (this.shakeT > 0 ? 1 : 0), mag);
    this.shakeT = Math.max(this.shakeT, t);
  }

  private updateParticles(dt: number) {
    for (const p of this.particles) {
      p.t += dt;
      if (p.kind === "shell" || p.kind === "chunk") p.vy += 640 * dt;
      if (p.kind === "blood" || p.kind === "acid") {
        p.vx *= 1 - 6 * dt;
        p.vy *= 1 - 6 * dt;
      }
      if (p.kind === "smoke") p.vy -= 20 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
    }
    this.particles = this.particles.filter((p) => p.t < p.life);
    if (this.particles.length > 420) this.particles.splice(0, this.particles.length - 420);
  }

  private updateTexts(dt: number) {
    for (const t of this.texts) t.t += dt;
    this.texts = this.texts.filter((t) => t.t < t.life);
  }

  /* --------------------------------- HUD sync --------------------------------- */

  private syncHud(force: boolean) {
    const w = this.weapon();
    const nextAt = this.tier < TIER_AT.length - 1 ? TIER_AT[this.tier + 1] : 0;
    const prevAt = TIER_AT[this.tier];
    let patch: Parameters<typeof store.set>[0];
    if (force) {
      patch = { phase: this.phase };
    } else {
      patch = {};
    }
    patch = {
      ...patch,
      hp: Math.ceil(this.hp),
      maxHp: this.maxHp,
      shield: this.shieldT,
      score: this.score,
      best: Math.max(loadBest().best, this.score),
      bestWave: loadBest().bestWave,
      wave: this.wave,
      left: this.toSpawn + this.zombies.length,
      kills: this.kills,
      tierKills: nextAt === 0 ? 0 : nextAt - this.kills,
      tierProgress: nextAt === 0 ? 1 : clamp((this.kills - prevAt) / (nextAt - prevAt), 0, 1),
      weapon: w.name,
      weaponTier: this.tier,
      ammo: this.ammo,
      mag: w.mag,
      reloading: this.reloadT >= 0 ? 1 - this.reloadT / (w.reload * (this.frenzyT > 0 ? 0.7 : 1)) : -1,
      combo: this.combo,
      comboMult: 1 + Math.min(this.combo, 40) * 0.1,
      comboFrac: this.combo > 0 ? clamp(this.comboT / COMBO_WINDOW, 0, 1) : 0,
      dashFrac: 1 - clamp(this.dashCd / 1.5, 0, 1),
      buffs: { frenzy: this.frenzyT, power: this.powerT, shield: this.shieldT },
      boss: this.boss && !this.boss.dead ? { name: "THE ABOMINATION", frac: clamp(this.boss.hp / this.boss.maxHp, 0, 1) } : null,
      hurt: this.hurtT,
      lowHp: this.hp > 0 && this.hp < 30,
      time: this.runT,
    };
    store.set(patch);
  }

  /* --------------------------------- render --------------------------------- */

  private render() {
    const c = this.ctx;
    c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    let ox = 0;
    let oy = 0;
    if (this.shakeT > 0) {
      const m = this.shakeMag * (this.shakeT > 0.15 ? 1 : this.shakeT / 0.15);
      ox = rand(-m, m);
      oy = rand(-m, m);
    } else {
      this.shakeMag = 0;
    }
    c.save();
    c.translate(ox, oy);
    c.drawImage(this.ground, 0, 0, this.w, this.h);
    c.drawImage(this.gore, 0, 0, this.w, this.h);

    if (this.phase === "menu") {
      for (const z of this.ambient) this.drawZombie(c, z);
    } else {
      this.drawPickups(c);
      this.drawBullets(c);
      this.drawAcids(c);
      for (const z of this.zombies) this.drawZombie(c, z);
      if (!this.dead) this.drawPlayer(c);
    }

    this.drawParticles(c);
    this.drawDarkness(c);
    this.drawFog(c);
    this.drawSpores(c);
    this.drawTexts(c);

    if (this.phase === "playing" && !this.isTouch) this.drawCrosshair(c);
    c.restore();
  }

  private drawDarkness(c: CanvasRenderingContext2D) {
    const lx = this.phase === "menu" ? this.w / 2 : this.px;
    const ly = this.phase === "menu" ? this.h / 2 : this.py;
    const flicker = 1 + Math.sin(this.time * 11) * 0.015 + Math.sin(this.time * 3.7) * 0.02;
    const inner = 100 * flicker;
    const outer = Math.max(this.w, this.h) * 0.72;
    const gr = c.createRadialGradient(lx, ly, inner, lx, ly, outer);
    gr.addColorStop(0, "rgba(3,7,5,0)");
    gr.addColorStop(0.4, "rgba(3,7,5,0.32)");
    gr.addColorStop(1, "rgba(2,5,3,0.88)");
    c.fillStyle = gr;
    c.fillRect(-20, -20, this.w + 40, this.h + 40);
    // muzzle light
    if (this.muzzleT > 0) {
      const a = this.muzzleT / 0.05;
      const mg = c.createRadialGradient(this.muzzleX, this.muzzleY, 0, this.muzzleX, this.muzzleY, 130);
      mg.addColorStop(0, `rgba(255,210,120,${0.34 * a})`);
      mg.addColorStop(1, "rgba(255,210,120,0)");
      c.fillStyle = mg;
      c.fillRect(this.muzzleX - 130, this.muzzleY - 130, 260, 260);
    }
  }

  private drawFog(c: CanvasRenderingContext2D) {
    for (const f of this.fogs) {
      const gr = c.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.r);
      gr.addColorStop(0, "rgba(130,168,120,0.05)");
      gr.addColorStop(1, "rgba(130,168,120,0)");
      c.fillStyle = gr;
      c.fillRect(f.x - f.r, f.y - f.r, f.r * 2, f.r * 2);
    }
  }

  private drawSpores(c: CanvasRenderingContext2D) {
    c.fillStyle = "rgba(190,245,130,0.35)";
    for (const s of this.spores) {
      const a = 0.12 + 0.2 * (0.5 + 0.5 * Math.sin(this.time * 2 + s.ph));
      c.globalAlpha = a;
      c.fillRect(s.x, s.y, 2, 2);
    }
    c.globalAlpha = 1;
  }

  private drawZombie(c: CanvasRenderingContext2D, z: Zombie) {
    const bob = Math.sin(z.phase) * 1.8;
    const lunge = 1 + z.lungeT * 1.4;
    const r = z.r * lunge;
    c.save();
    c.translate(z.x, z.y);
    // shadow
    c.fillStyle = "rgba(0,0,0,0.35)";
    c.beginPath();
    c.ellipse(0, r * 0.7, r * 0.95, r * 0.45, 0, 0, Math.PI * 2);
    c.fill();

    const pal = {
      walker: { body: "#5d8f3a", dark: "#39591f", eye: "#d4ff4d" },
      runner: { body: "#b3502e", dark: "#77301a", eye: "#ffd166" },
      spitter: { body: "#8fb32e", dark: "#5c751c", eye: "#d4ff4d" },
      brute: { body: "#6e3b4a", dark: "#45222d", eye: "#ff4b52" },
      boss: { body: "#7a1f2b", dark: "#4a0f17", eye: "#ff4b52" },
    }[z.kind];

    // arms
    const aimA = Math.atan2(this.py - z.y, this.px - z.x);
    const perp = aimA + Math.PI / 2;
    const swing = Math.sin(z.phase * 1.4) * r * 0.3;
    c.fillStyle = pal.dark;
    for (const s of [-1, 1]) {
      const ax = Math.cos(perp) * r * 0.75 * s + Math.cos(aimA) * (r * 0.55 + swing * s);
      const ay = Math.sin(perp) * r * 0.75 * s + Math.sin(aimA) * (r * 0.55 + swing * s);
      c.beginPath();
      c.arc(ax, ay, r * 0.32, 0, Math.PI * 2);
      c.fill();
    }
    // body
    const bg = c.createRadialGradient(-r * 0.3, -r * 0.3 + bob * 0.3, r * 0.2, 0, bob * 0.3, r * 1.15);
    bg.addColorStop(0, pal.body);
    bg.addColorStop(1, pal.dark);
    c.fillStyle = bg;
    c.beginPath();
    c.arc(0, bob * 0.3, r, 0, Math.PI * 2);
    c.fill();
    c.lineWidth = 2;
    c.strokeStyle = "rgba(0,0,0,0.45)";
    c.stroke();

    if (z.kind === "brute" || z.kind === "boss") {
      // armor plates
      c.strokeStyle = "rgba(0,0,0,0.5)";
      c.lineWidth = 3;
      for (let i = 0; i < 3; i++) {
        c.beginPath();
        c.arc(0, bob * 0.3, r * (0.45 + i * 0.22), -0.9, 0.9);
        c.stroke();
      }
    }
    if (z.kind === "boss") {
      c.fillStyle = pal.dark;
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2 + this.time * 0.4;
        c.beginPath();
        c.moveTo(Math.cos(a) * r, Math.sin(a) * r + bob * 0.3);
        c.lineTo(Math.cos(a + 0.18) * (r + 12), Math.sin(a + 0.18) * (r + 12) + bob * 0.3);
        c.lineTo(Math.cos(a + 0.36) * r, Math.sin(a + 0.36) * r + bob * 0.3);
        c.fill();
      }
    }
    if (z.kind === "spitter") {
      const pulse = 1 + Math.sin(this.time * 6 + z.phase) * 0.15;
      c.fillStyle = "#cdeb45";
      c.beginPath();
      c.arc(-Math.cos(aimA) * r * 0.3, -Math.sin(aimA) * r * 0.3 + bob * 0.3, r * 0.42 * pulse, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = "rgba(90,120,10,0.8)";
      c.beginPath();
      c.arc(-Math.cos(aimA) * r * 0.3, -Math.sin(aimA) * r * 0.3 + bob * 0.3, r * 0.2 * pulse, 0, Math.PI * 2);
      c.fill();
    }
    // eyes (cheap glow: halo circle + core)
    for (const s of [-1, 1]) {
      const ex = Math.cos(aimA) * r * 0.45 + Math.cos(perp) * r * 0.28 * s;
      const ey = Math.sin(aimA) * r * 0.45 + Math.sin(perp) * r * 0.28 * s + bob * 0.3;
      const er = Math.max(1.6, r * 0.13);
      c.globalAlpha = 0.28;
      c.fillStyle = pal.eye;
      c.beginPath();
      c.arc(ex, ey, er * 2.4, 0, Math.PI * 2);
      c.fill();
      c.globalAlpha = 1;
      c.beginPath();
      c.arc(ex, ey, er, 0, Math.PI * 2);
      c.fill();
    }

    // hit flash
    if (z.flashT > 0) {
      c.globalAlpha = (z.flashT / 0.09) * 0.8;
      c.fillStyle = "#ffffff";
      c.beginPath();
      c.arc(0, bob * 0.3, r, 0, Math.PI * 2);
      c.fill();
      c.globalAlpha = 1;
    }
    c.restore();

    // hp bar (when damaged, non-boss)
    if (z.hp < z.maxHp && z.kind !== "boss") {
      const bw = z.r * 2;
      const frac = clamp(z.hp / z.maxHp, 0, 1);
      c.fillStyle = "rgba(0,0,0,0.6)";
      c.fillRect(z.x - bw / 2, z.y - z.r - 12, bw, 4);
      c.fillStyle = frac > 0.4 ? "#a3f52e" : "#e5222e";
      c.fillRect(z.x - bw / 2, z.y - z.r - 12, bw * frac, 4);
    }
  }

  private drawPlayer(c: CanvasRenderingContext2D) {
    // ghosts
    for (const g of this.ghosts) {
      c.globalAlpha = g.a * 0.5;
      c.fillStyle = "#a3f52e";
      c.beginPath();
      c.arc(g.x, g.y, 13, 0, Math.PI * 2);
      c.fill();
    }
    c.globalAlpha = 1;

    const blink = this.invulnT > 0 && this.dashT <= 0 && Math.floor(this.time * 18) % 2 === 0;
    c.save();
    c.translate(this.px, this.py);
    c.globalAlpha = blink ? 0.45 : 1;

    // shadow
    c.fillStyle = "rgba(0,0,0,0.4)";
    c.beginPath();
    c.ellipse(0, 10, 14, 7, 0, 0, Math.PI * 2);
    c.fill();

    // gun
    c.save();
    c.rotate(this.aim);
    c.fillStyle = "#20261b";
    const gunLen = this.tier >= 3 ? 26 : 21;
    c.fillRect(4, -3, gunLen, 6);
    c.fillStyle = "#3a4430";
    c.fillRect(4, -3, gunLen - 6, 2);
    if (this.tier === 2) {
      c.fillStyle = "#20261b";
      c.fillRect(8, -5, 6, 10);
    }
    if (this.tier >= 4) {
      c.fillStyle = "#2c3324";
      c.fillRect(12, -6, 10, 12);
    }
    c.restore();

    // body
    const bg = c.createRadialGradient(-4, -5, 2, 0, 0, 16);
    bg.addColorStop(0, "#8ba168");
    bg.addColorStop(1, "#4d5c38");
    c.fillStyle = bg;
    c.beginPath();
    c.arc(0, 0, 13, 0, Math.PI * 2);
    c.fill();
    c.lineWidth = 2;
    c.strokeStyle = "rgba(0,0,0,0.5)";
    c.stroke();
    // helmet
    c.fillStyle = "#3f4d2e";
    c.beginPath();
    c.arc(0, 0, 8, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = "rgba(212,255,77,0.5)";
    c.lineWidth = 1.5;
    c.beginPath();
    c.arc(0, 0, 8, this.aim - 0.6, this.aim + 0.6);
    c.stroke();
    // hands
    c.fillStyle = "#c9a06a";
    const hx = Math.cos(this.aim) * 12;
    const hy = Math.sin(this.aim) * 12;
    const perp = this.aim + Math.PI / 2;
    for (const s of [-1, 1]) {
      c.beginPath();
      c.arc(hx + Math.cos(perp) * 4 * s, hy + Math.sin(perp) * 4 * s, 3, 0, Math.PI * 2);
      c.fill();
    }

    // muzzle flash
    if (this.muzzleT > 0) {
      const a = this.muzzleT / 0.05;
      c.save();
      c.translate(Math.cos(this.aim) * 26, Math.sin(this.aim) * 26);
      c.rotate(this.aim);
      c.globalAlpha = a;
      c.fillStyle = "#ffe9a8";
      c.beginPath();
      c.moveTo(0, -5);
      c.lineTo(14, 0);
      c.lineTo(0, 5);
      c.lineTo(3, 0);
      c.closePath();
      c.fill();
      c.restore();
    }
    c.restore();

    // shield ring
    if (this.shieldT > 0) {
      const pulse = 0.55 + 0.25 * Math.sin(this.time * 7);
      c.save();
      c.translate(this.px, this.py);
      c.rotate(this.time * 1.5);
      c.strokeStyle = `rgba(107,227,255,${pulse})`;
      c.lineWidth = 2.5;
      c.beginPath();
      for (let i = 0; i <= 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const rr = 21;
        if (i === 0) c.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
        else c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
      }
      c.stroke();
      c.restore();
    }
  }

  private drawBullets(c: CanvasRenderingContext2D) {
    for (const b of this.bullets) {
      const lx = b.x - b.vx * 0.022;
      const ly = b.y - b.vy * 0.022;
      const col = this.powerT > 0 ? "#ffb347" : "#ffe9a8";
      c.strokeStyle = this.powerT > 0 ? "rgba(255,179,71,0.25)" : "rgba(255,233,168,0.22)";
      c.lineWidth = 5;
      c.beginPath();
      c.moveTo(lx, ly);
      c.lineTo(b.x, b.y);
      c.stroke();
      c.strokeStyle = col;
      c.lineWidth = 2;
      c.beginPath();
      c.moveTo(lx, ly);
      c.lineTo(b.x, b.y);
      c.stroke();
    }
  }

  private drawAcids(c: CanvasRenderingContext2D) {
    for (const a of this.acids) {
      c.fillStyle = "rgba(168,230,46,0.3)";
      c.beginPath();
      c.arc(a.x, a.y, 9, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = "#a8e62e";
      c.beginPath();
      c.arc(a.x, a.y, 5, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = "#e2ff8a";
      c.beginPath();
      c.arc(a.x - 1, a.y - 1, 2, 0, Math.PI * 2);
      c.fill();
    }
  }

  private drawPickups(c: CanvasRenderingContext2D) {
    for (const p of this.pickups) {
      const bobY = Math.sin(p.t * 3) * 4;
      const blink = p.life < 3 && Math.floor(p.t * 6) % 2 === 0;
      if (blink) continue;
      const conf: Record<PickupKind, { col: string; glow: string }> = {
        medkit: { col: "#e5222e", glow: "rgba(229,34,46,0.35)" },
        frenzy: { col: "#ffd166", glow: "rgba(255,209,102,0.35)" },
        power: { col: "#ff9d5c", glow: "rgba(255,157,92,0.35)" },
        shield: { col: "#6be3ff", glow: "rgba(107,227,255,0.35)" },
        nuke: { col: "#d4ff4d", glow: "rgba(212,255,77,0.45)" },
      };
      const cf = conf[p.kind];
      c.save();
      c.translate(p.x, p.y + bobY);
      const g = c.createRadialGradient(0, 0, 2, 0, 0, 26);
      g.addColorStop(0, cf.glow);
      g.addColorStop(1, "rgba(0,0,0,0)");
      c.fillStyle = g;
      c.fillRect(-26, -26, 52, 52);
      c.rotate(Math.sin(p.t * 2) * 0.12);
      c.fillStyle = "#131a10";
      c.strokeStyle = cf.col;
      c.lineWidth = 2;
      c.beginPath();
      c.rect(-11, -11, 22, 22);
      c.fill();
      c.stroke();
      c.fillStyle = cf.col;
      if (p.kind === "medkit") {
        c.fillRect(-7, -2.5, 14, 5);
        c.fillRect(-2.5, -7, 5, 14);
      } else if (p.kind === "frenzy") {
        for (let i = -1; i <= 1; i++) c.fillRect(i * 5 - 1.5, -7, 3, 14);
      } else if (p.kind === "power") {
        c.beginPath();
        c.moveTo(2, -8);
        c.lineTo(-5, 1);
        c.lineTo(-1, 1);
        c.lineTo(-2, 8);
        c.lineTo(5, -1);
        c.lineTo(1, -1);
        c.closePath();
        c.fill();
      } else if (p.kind === "shield") {
        c.beginPath();
        c.moveTo(0, -8);
        c.lineTo(7, -4);
        c.lineTo(7, 3);
        c.lineTo(0, 8);
        c.lineTo(-7, 3);
        c.lineTo(-7, -4);
        c.closePath();
        c.fill();
      } else {
        // trefoil
        for (let i = 0; i < 3; i++) {
          const a = (i / 3) * Math.PI * 2 - Math.PI / 2;
          c.beginPath();
          c.arc(Math.cos(a) * 4.5, Math.sin(a) * 4.5, 3.4, 0, Math.PI * 2);
          c.fill();
        }
        c.fillStyle = "#131a10";
        c.beginPath();
        c.arc(0, 0, 2.4, 0, Math.PI * 2);
        c.fill();
      }
      c.restore();
    }
  }

  private drawParticles(c: CanvasRenderingContext2D) {
    for (const p of this.particles) {
      const f = 1 - p.t / p.life;
      if (p.kind === "ring") {
        const r = 20 + (p.t / p.life) * Math.max(this.w, this.h) * 0.8;
        c.globalAlpha = f * 0.8;
        c.strokeStyle = p.color;
        c.lineWidth = 6 * f + 1;
        c.beginPath();
        c.arc(p.x, p.y, r, 0, Math.PI * 2);
        c.stroke();
        c.globalAlpha = 1;
        continue;
      }
      c.globalAlpha = f;
      if (p.kind === "shell") {
        c.save();
        c.translate(p.x, p.y);
        c.rotate(p.rot);
        c.fillStyle = p.color;
        c.fillRect(-2.5, -1, 5, 2);
        c.restore();
      } else if (p.kind === "smoke") {
        c.fillStyle = p.color;
        c.beginPath();
        c.arc(p.x, p.y, p.size * (1 + p.t * 2), 0, Math.PI * 2);
        c.fill();
      } else if (p.kind === "spark") {
        c.strokeStyle = p.color;
        c.lineWidth = p.size;
        c.beginPath();
        c.moveTo(p.x, p.y);
        c.lineTo(p.x - p.vx * 0.03, p.y - p.vy * 0.03);
        c.stroke();
      } else {
        c.fillStyle = p.color;
        c.beginPath();
        c.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        c.fill();
      }
      c.globalAlpha = 1;
    }
  }

  private drawTexts(c: CanvasRenderingContext2D) {
    c.textAlign = "center";
    for (const t of this.texts) {
      const f = t.t / t.life;
      const y = t.y - f * 34;
      const pop = t.crit ? 1 + Math.max(0, 0.35 - f * 2) : 1;
      c.globalAlpha = f < 0.7 ? 1 : 1 - (f - 0.7) / 0.3;
      c.font = `800 ${t.size * pop}px Oxanium, monospace`;
      c.strokeStyle = "rgba(0,0,0,0.75)";
      c.lineWidth = 3;
      c.strokeText(t.text, t.x, y);
      c.fillStyle = t.color;
      c.fillText(t.text, t.x, y);
    }
    c.globalAlpha = 1;
  }

  private drawCrosshair(c: CanvasRenderingContext2D) {
    const x = this.mouseX;
    const y = this.mouseY;
    const gap = 7 + this.spreadKick * 9;
    const col = this.ammo <= 0 && this.reloadT < 0 ? "#e5222e" : "#a3f52e";
    c.strokeStyle = col;
    c.lineWidth = 1.6;
    c.globalAlpha = 0.9;
    c.beginPath();
    c.arc(x, y, 2.2, 0, Math.PI * 2);
    c.stroke();
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      c.beginPath();
      c.moveTo(x + Math.cos(a) * gap, y + Math.sin(a) * gap);
      c.lineTo(x + Math.cos(a) * (gap + 7), y + Math.sin(a) * (gap + 7));
      c.stroke();
    }
    if (this.reloadT >= 0) {
      const w = this.weapon();
      const frac = 1 - this.reloadT / (w.reload * (this.frenzyT > 0 ? 0.7 : 1));
      c.strokeStyle = "#ffd166";
      c.lineWidth = 2.5;
      c.beginPath();
      c.arc(x, y, gap + 12, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2);
      c.stroke();
    }
    c.globalAlpha = 1;
  }
}
