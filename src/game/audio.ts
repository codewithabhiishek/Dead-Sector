/* Procedural WebAudio sound engine — no assets, everything synthesized. */

export class SoundEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noiseBuf: AudioBuffer | null = null;
  private droneNodes: { stop: () => void } | null = null;
  muted = false;

  private ensure(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.5;
      this.master.connect(this.ctx.destination);
      const len = this.ctx.sampleRate;
      this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
    return this.ctx;
  }

  unlock(): void {
    this.ensure();
  }

  setMuted(m: boolean): void {
    this.muted = m;
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(m ? 0 : 0.5, this.ctx.currentTime, 0.03);
    }
  }

  private noise(dur: number, freq: number, vol: number, q = 1, slideTo?: number): void {
    const ctx = this.ensure();
    if (!ctx || !this.master || !this.noiseBuf) return;
    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = "bandpass";
    f.frequency.setValueAtTime(freq, t);
    if (slideTo) f.frequency.exponentialRampToValueAtTime(Math.max(30, slideTo), t + dur);
    f.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(f).connect(g).connect(this.master);
    src.start(t);
    src.stop(t + dur + 0.02);
  }

  private tone(
    type: OscillatorType,
    f0: number,
    f1: number,
    dur: number,
    vol: number,
    delay = 0
  ): void {
    const ctx = this.ensure();
    if (!ctx || !this.master) return;
    const t = ctx.currentTime + delay;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(Math.max(20, f0), t);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(this.master);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  /* ------------ game events ------------ */

  shoot(tier: number): void {
    if (tier === 2) {
      // shotgun boom
      this.noise(0.16, 900, 0.5, 0.8, 200);
      this.tone("square", 130, 50, 0.14, 0.3);
    } else if (tier >= 4) {
      this.noise(0.07, 1600, 0.3, 1.2, 500);
      this.tone("square", 220 + Math.random() * 40, 90, 0.06, 0.18);
    } else {
      this.noise(0.08, 1300 + tier * 300, 0.34, 1.1, 400);
      this.tone("square", 190 + tier * 25 + Math.random() * 30, 70, 0.07, 0.2);
    }
  }

  empty(): void {
    this.tone("square", 700, 500, 0.04, 0.1);
  }

  reload(): void {
    this.noise(0.05, 2600, 0.16, 2);
    this.tone("square", 340, 240, 0.05, 0.1, 0.06);
  }

  reloadDone(): void {
    this.noise(0.05, 3000, 0.2, 2);
    this.tone("square", 500, 720, 0.07, 0.14, 0.02);
  }

  zHit(): void {
    this.noise(0.06, 500 + Math.random() * 300, 0.22, 1.4, 150);
  }

  zDie(big = false): void {
    this.tone("sawtooth", big ? 160 : 240 + Math.random() * 80, 40, big ? 0.5 : 0.28, big ? 0.34 : 0.2);
    this.noise(big ? 0.3 : 0.14, 320, big ? 0.34 : 0.18, 0.9, 80);
  }

  splat(): void {
    this.noise(0.1, 240, 0.16, 0.8, 90);
  }

  hitmark(): void {
    this.tone("square", 1250, 950, 0.035, 0.045);
  }

  plasma(): void {
    this.tone("sawtooth", 150, 55, 0.3, 0.26);
    this.noise(0.24, 520, 0.18, 1, 140);
    this.tone("square", 90, 45, 0.28, 0.2, 0.03);
  }

  killTick(): void {
    this.tone("square", 880, 1320, 0.06, 0.08);
    this.tone("square", 1760, 1760, 0.05, 0.045, 0.03);
  }

  step(sprint: boolean): void {
    this.noise(0.045, sprint ? 560 : 430, sprint ? 0.055 : 0.04, 1.4, 160);
    if (sprint) this.tone("sine", 90, 60, 0.05, 0.03);
  }

  hurt(): void {
    this.tone("sawtooth", 110, 45, 0.3, 0.34);
    this.noise(0.2, 250, 0.26, 0.8, 70);
  }

  dash(): void {
    this.noise(0.22, 400, 0.2, 1.4, 2600);
  }

  pickup(): void {
    this.tone("triangle", 520, 780, 0.09, 0.2);
    this.tone("triangle", 780, 1180, 0.12, 0.2, 0.07);
  }

  medkit(): void {
    this.tone("sine", 420, 660, 0.12, 0.22);
    this.tone("sine", 660, 880, 0.16, 0.22, 0.09);
  }

  nuke(): void {
    this.tone("sine", 90, 24, 0.9, 0.5);
    this.noise(0.8, 400, 0.4, 0.6, 60);
  }

  spit(): void {
    this.noise(0.14, 700, 0.14, 1.6, 240);
  }

  acidHit(): void {
    this.noise(0.16, 340, 0.2, 1, 100);
    this.tone("sawtooth", 200, 70, 0.14, 0.12);
  }

  waveHorn(boss = false): void {
    const base = boss ? 70 : 98;
    this.tone("sawtooth", base, base * 0.98, 0.5, 0.24);
    this.tone("sawtooth", base * 1.5, base * 1.47, 0.5, 0.18, 0.02);
    this.tone("sawtooth", base * 0.5, base * 0.49, 0.8, 0.2, 0.05);
  }

  waveClear(): void {
    this.tone("triangle", 392, 392, 0.12, 0.2);
    this.tone("triangle", 523, 523, 0.12, 0.2, 0.1);
    this.tone("triangle", 659, 659, 0.22, 0.2, 0.2);
  }

  tierUp(): void {
    this.tone("square", 330, 330, 0.08, 0.18);
    this.tone("square", 440, 440, 0.08, 0.18, 0.08);
    this.tone("square", 660, 660, 0.16, 0.2, 0.16);
    this.noise(0.2, 2400, 0.14, 1.6);
  }

  combo(n: number): void {
    const f = 300 + Math.min(n, 20) * 34;
    this.tone("square", f, f * 1.3, 0.07, 0.1);
  }

  heart(): void {
    this.tone("sine", 62, 40, 0.16, 0.4);
    this.tone("sine", 58, 38, 0.14, 0.3, 0.22);
  }

  gameOver(): void {
    this.tone("sawtooth", 220, 210, 0.4, 0.2);
    this.tone("sawtooth", 165, 155, 0.4, 0.2, 0.35);
    this.tone("sawtooth", 110, 55, 1.1, 0.24, 0.7);
    this.noise(1.2, 200, 0.14, 0.7, 50);
  }

  ui(): void {
    this.tone("square", 640, 880, 0.05, 0.08);
  }

  /* ------------ ambient drone ------------ */

  startDrone(): void {
    const ctx = this.ensure();
    if (!ctx || !this.master || this.droneNodes) return;
    const g = ctx.createGain();
    g.gain.value = 0.055;
    const f = ctx.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = 240;
    f.Q.value = 4;
    const o1 = ctx.createOscillator();
    o1.type = "sawtooth";
    o1.frequency.value = 55;
    const o2 = ctx.createOscillator();
    o2.type = "sawtooth";
    o2.frequency.value = 55.7;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.13;
    const lfoG = ctx.createGain();
    lfoG.gain.value = 90;
    lfo.connect(lfoG).connect(f.frequency);
    o1.connect(f);
    o2.connect(f);
    f.connect(g).connect(this.master);
    o1.start();
    o2.start();
    lfo.start();
    this.droneNodes = {
      stop: () => {
        g.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.2);
        setTimeout(() => {
          try {
            o1.stop();
            o2.stop();
            lfo.stop();
          } catch {
            /* already stopped */
          }
        }, 700);
      },
    };
  }

  stopDrone(): void {
    this.droneNodes?.stop();
    this.droneNodes = null;
  }
}

export const sfx = new SoundEngine();
