<div align="center">

# ☣️ DEAD SECTOR

### *Sector 7 Quarantine Protocol · Top-Down Survival Horror*

[![Vite](https://img.shields.io/badge/Vite-6.4-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![React](https://img.shields.io/badge/React-19.0-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Web Audio API](https://img.shields.io/badge/Web%20Audio-Procedural-f59e0b?style=for-the-badge&logo=soundcharts&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg?style=for-the-badge)](LICENSE)

<p align="center">
  <b>The perimeter wire is breached. Quarantine has collapsed.</b><br/>
  Scavenge the ruins of Sector 7, utilize tactical cover, and unleash high-caliber firepower across 10 escalating campaign waves, culminating in the apex Patriarch boss encounter and infinite Endless Survival Protocol.
</p>

[🕹️ Play on Localhost](#-quick-start) • [⚡ Key Features](#-key-features) • [🔫 The Arsenal](#-the-arsenal) • [🧟 Threat Index](#-threat-index) • [🎮 Controls](#-controls--tactics) • [⚙️ Protocols](#-difficulty-protocols)

---

</div>

## 📖 Overview

**DEAD SECTOR** is a fast-paced, top-down tactical survival shooter engineered from scratch in **TypeScript**, rendered using an ultra-optimized **HTML5 Canvas 2D** rendering engine, styled with **Tailwind CSS**, and fueled by a **zero-asset, 100% procedurally synthesized Web Audio engine**. 

Navigate an expansive 3400×2300 apocalyptic quarantine zone featuring dynamic gore, line-of-sight raycasting, reactive lighting, blood decals, directional audio feedback, particle systems, weapon progression tiers, tactical supply airdrops, and menacing apex boss battles.

---

## ⚡ Key Features

- **💥 High-Performance Canvas 2D Engine**: Silky smooth at 60+ FPS with hundreds of active entities, custom vector raycasting, shell casings, dynamic muzzle lighting, and persistent blood splatters.
- **🎯 Automatic Shooting & Auto-Aim (Laptop Mode)**: Designed for effortless laptop and trackpad play! The system scans for nearest hostiles in line-of-sight, smoothly aligns your firing arc, and triggers continuous fire while threats are in range. Toggle on-the-fly with <kbd>Z</kbd> or <kbd>T</kbd>, or use full manual override anytime.
- **🏆 Dedicated Campaign Victory Sequence**: Purge all 10 campaign waves to neutralize the Patriarch and trigger the **Sector Purged** victory debriefing with complete statistics (score, accuracy, kills, combo, mission time).
- **♾️ Endless Survival Protocol (Wave 11+)**: After conquering the 10-wave campaign, unlock infinite overtime survival with exponential zombie scaling and a permanent ×1.5 score multiplier.
- **🔒 Wave 10 Weapon Stability**: Your heavy loadout is locked during Wave 10+ so mid-wave tier shifts never disrupt your battle against the apex boss.
- **🔥 Rebalanced High-Wave Escalation**: Waves 6–10 feature aggressive sprinting runners (up to 230 px/s), dense acid spitters, high-HP brutes, and rapid burst spawning that forces you to manage stamina, dash, and utilize cover.
- **🔊 Procedural Sound Synthesis**: Zero audio files loaded over the network! Every gunshot, reload click, zombie screech, shell drop, heartbeat, and low-frequency drone is procedurally generated via the **Web Audio API**.
- **🔫 7-Tier Weapon Progression**: Standard sidearms, high-capacity vector SMGs, combat shotguns, assault rifles, rapid miniguns, incendiary spread weapons, and infinite-pierce railguns.
- **📱 Responsive & Touch-Ready**: Custom virtual analog sticks and quick-action touch controls for seamless mobile and tablet play.
- **📊 Tactical HUD & Atmosphere**: Retro CRT scanlines, chromatic hurt vignettes, dynamic crosshair bloom, stamina bars, mini-radar, and mission debrief telemetry.

---

## 🔫 The Arsenal

As you eliminate hostiles, your combat tier advances automatically (stabilized at peak tier during Wave 10+):

| Tier | Weapon | DMG | Fire Rate | Mag | Reload | Special Properties |
| :---: | :--- | :---: | :---: | :---: | :---: | :--- |
| **0** | **M9 SIDEARM** | 13 | 4.4 rps | 12 | 0.85s | Reliable semi-auto sidearm with fast tactical recovery |
| **1** | **VECTOR SMG** | 9 | 11.5 rps | 34 | 1.05s | Blistering fire rate, shreds unarmored hordes |
| **2** | **COMBAT SHOTGUN** | 16×8 | 3.4 rps | 10 | 1.10s | Piercing 8-pellet buckshot spread with frontline punch & sub-bass kick |
| **3** | **AK-74 RIFLE** | 17 | 7.6 rps | 30 | 1.20s | High penetration bullet velocity with 1-target pierce |
| **4** | **M134 MINIGUN** | 11 | 16.5 rps | 140 | 2.00s | Sustained suppression with immense magazine capacity |
| **5** | **M6 INCINERATOR** | 18×8 | 4.2 rps | 16 | 1.20s | High-heat fragmentation pellets that ignite targets and melt dense swarms |
| **6** | **ARC-9 RAILGUN** | 96 | 2.1 rps | 6 | 1.70s | Hyper-velocity slug that pierces through infinite hostiles |

---

## 🧟 Threat Index

| Threat | Classification | Threat Level | Characteristics |
| :--- | :--- | :---: | :--- |
| **WALKER** | Common Infected | 🟩 1/5 | Slow and shambling, deadly in swarming choke points. |
| **RUNNER** | Agitated Infected | 🟨 2/5 | Lightning-fast flankers sprinting at up to 230 px/s in waves 6–10. |
| **SPITTER** | Bio-Corrosive | 🟧 3/5 | Long-range artillery lobbing corrosive area-denial acid pools. |
| **BRUTE** | Mutated Tank | 🟥 4/5 | Heavily armored behemoth capable of soaking immense damage. |
| **ABOMINATION** | Mid-Tier Boss (Wave 5) | 💀 4.5/5 | Massive biohazard signature firing high-damage projectile volleys. |
| **THE PATRIARCH** | Apex Sector Boss (Wave 10) | ☠️ 5/5 | Devastating titan with massive health reserves, plasma strikes, and tactical horde summons. |

---

## 🎮 Controls & Tactics

### Desktop Controls

| Action | Input | Tactical Description |
| :--- | :--- | :--- |
| **Move** | <kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd> or <kbd>↑</kbd> <kbd>←</kbd> <kbd>↓</kbd> <kbd>→</kbd> | Keep maneuvering to prevent getting trapped against sector obstacles. |
| **Aim & Shoot** | <kbd>Mouse</kbd> + <kbd>LMB</kbd> | Manual aiming and firing with full precision and trigger control. |
| **Auto-Shoot Toggle** | <kbd>Z</kbd> or <kbd>T</kbd> | **Laptop Assist Mode:** Automatically aims and fires at enemies in line-of-sight. |
| **Combat Dash** | <kbd>Space</kbd> or <kbd>RMB</kbd> | Grants invulnerability frames to dodge through aggressive hordes. |
| **Sprint** | <kbd>Shift</kbd> | Burns stamina for a quick burst of emergency speed. |
| **Reload** | <kbd>R</kbd> | Active reload during calm moments (auto-reloads when empty). |
| **Maximize Screen** | <kbd>F</kbd> | Toggle full-screen mode anytime. |
| **Toggle Audio** | <kbd>M</kbd> | Mute / unmute synthesized sound effects. |
| **Pause / Resume** | <kbd>P</kbd> or <kbd>Esc</kbd> | Freeze action and adjust combat settings. |

### Mobile & Touch Controls

- **Left Virtual Joystick**: Smooth omnidirectional movement.
- **Right Virtual Joystick**: 360° twin-stick aiming and firing.
- **Tactical Buttons**: Instant Dash, Sprint lock, Auto-Fire toggle, and Pause.

---

## ⚙️ Difficulty Protocols

| Protocol | Multipliers | Description |
| :--- | :--- | :--- |
| **RECRUIT** | HP: 0.70× · DMG: 0.65× · SPD: 0.88× · Score: 0.75× | Thinner horde, softer bites, ideal for learning mechanics. |
| **VETERAN** | HP: 1.00× · DMG: 1.00× · SPD: 1.00× · Score: 1.00× | The intended tactical survival challenge. |
| **NIGHTMARE** | HP: 1.40× · DMG: 1.30× · SPD: 1.14× · Score: 1.60× | Denser, faster, relentless swarms for veteran survivors. |

---

## 🛠️ Tech Stack & Architecture

- **UI & State**: [React 19](https://reactjs.org/) + [Lucide React](https://lucide.dev/) for HUD, victory terminals, and external reactive store.
- **Build Tool**: [Vite 6](https://vitejs.dev/) with instantaneous Hot Module Replacement.
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/) with military HUD styling, CRT scanline effects, and responsive layout grids.
- **Game Engine**: Custom object-oriented canvas engine:
  - Fixed / delta-time game loop (`requestAnimationFrame`)
  - Continuous raycasting and line-of-sight obstacle collision
  - Advanced auto-aim target acquisition and firing controller
  - Procedural particle emitters for smoke, sparks, acid, fire, and blood decals
  - 100% procedural sound synthesis engine using the Web Audio API

---

## 🚀 Quick Start

### Prerequisites
- [Node.js](https://nodejs.org/) (v18.0.0 or higher recommended)
- [npm](https://www.npmjs.com/) or [pnpm](https://pnpm.io/)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/codewithabhiishek/Dead-Sector.git
   cd Dead-Sector
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the local development server:**
   ```bash
   npm run dev
   ```

4. **Launch the game:**
   Open [http://localhost:3000](http://localhost:3000) in your browser.

5. **Production Build:**
   ```bash
   npm run build
   ```

---

## 📁 Project Structure

```text
Dead-Sector/
├── public/                 # Static public assets
├── src/
│   ├── components/
│   │   ├── HUD.tsx         # Tactical heads-up display, auto-fire toggle, and status bars
│   │   └── Screens.tsx     # Menu, pause, victory screen, game over, and touch controls
│   ├── game/
│   │   ├── audio.ts        # Pure Web Audio procedural sound synthesizer
│   │   ├── engine.ts       # 2D canvas game loop, auto-aim, weapons & horde AI
│   │   └── store.ts        # Reactive snapshot store bridging engine & React HUD
│   ├── App.tsx             # Root layout with atmospheric scanlines & canvas
│   ├── index.css           # Tailwind CSS directives & tactical style utilities
│   └── main.tsx            # Application entry point
├── index.html              # HTML shell & web font imports
├── package.json            # Project dependencies & scripts
├── tsconfig.json           # TypeScript configuration
└── vite.config.js          # Vite bundler & dev server config
```

---

## 🛡️ License

This project is licensed under the [MIT License](LICENSE) — free to play, fork, and build upon.

<div align="center">
  <sub>Developed with ❤️ by <a href="https://github.com/codewithabhiishek">codewithabhiishek</a></sub>
</div>
