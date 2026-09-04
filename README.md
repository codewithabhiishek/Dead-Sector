<div align="center">

# ☣️ DEAD SECTOR

### *Sector 9 Quarantine Protocol · Top-Down Survival Horror*

[![Vite](https://img.shields.io/badge/Vite-6.3-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![React](https://img.shields.io/badge/React-18.2-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Web Audio API](https://img.shields.io/badge/Web%20Audio-Procedural-f59e0b?style=for-the-badge&logo=soundcharts&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg?style=for-the-badge)](LICENSE)

<p align="center">
  <b>The perimeter wire is breached. Quarantine has failed.</b><br/>
  Scavenge the ruins of Sector 9, utilize abandoned wrecks for tactical cover, and unleash high-caliber firepower across 10 escalating waves of relentless undead mutations.
</p>

[🕹️ Play on Localhost](#-quick-start) • [⚡ Features](#-key-features) • [🔫 The Arsenal](#-the-arsenal) • [🧟 Bestiary](#-threat-index) • [🎮 Controls](#-controls--tactics)

---

</div>

## 📖 Overview

**DEAD SECTOR** is a fast-paced, top-down tactical zombie survival game engineered from scratch in **TypeScript**, rendered using an ultra-optimized **HTML5 Canvas 2D** rendering engine, styled with **Tailwind CSS**, and fueled by a **zero-asset, 100% procedurally synthesized Web Audio engine**. 

Navigate an expansive 3400×2300 apocalyptic quarantine zone packed with dynamic gore, reactive lighting, blood decals, directional audio feedback, particle systems, weapon progression tiers, and menacing boss encounters every 5th wave.

---

## ⚡ Key Features

- **💥 High-Performance Canvas 2D Engine**: Runs silky smooth at 60+ FPS with hundreds of active entities, custom vector raycasting, shell casings, dynamic muzzle lighting, and persistent blood splatters.
- **🔊 Procedural Sound Synthesis**: Zero audio assets loaded over the network! Every gunshot, reload click, zombie screech, shell drop, heartbeat, and low-frequency drone is procedurally generated via the **Web Audio API**.
- **🔫 7-Tier Weapon Progression**: Seamlessly unlock new armaments as your kill count climbs—from standard issue sidearms to rapid-fire miniguns and high-tech railguns.
- **🧟 Distinct Hostile Classes & Bosses**: Battle relentless Walkers, agile flanking Runners, acid-spewing Spitters, heavily armored Brutes, and screen-shaking Abomination bosses.
- **🎯 Tactical Movement & Combat**: Fluid WASD navigation, sprint stamina management, invulnerability-frame combat dashing, tactical active reloading, and an escalating combo multiplier window.
- **📱 Fully Responsive & Touch-Ready**: Native virtual analog sticks and quick-action touch controls for seamless mobile and tablet play.
- **📊 Tactical HUD & Atmosphere**: Retro CRT scanlines, chromatic hurt vignettes, dynamic crosshair bloom, stamina bars, mini-radar, and mission debrief telemetry.
- **⚙️ 3 Threat Protocols**: Choose between **Recruit**, **Veteran**, or **Nightmare** difficulty with custom health, speed, horde density, and score scaling.

---

## 🔫 The Arsenal

As you eliminate hostiles, your combat tier advances automatically:

| Tier | Weapon | DMG | Fire Rate | Mag | Reload | Special Properties |
| :---: | :--- | :---: | :---: | :---: | :---: | :--- |
| **0** | **M9 SIDEARM** | 13 | 4.4 rps | 12 | 0.85s | Reliable semi-auto sidearm with fast recovery |
| **1** | **VECTOR SMG** | 9 | 11.5 rps | 34 | 1.05s | Blistering fire rate, shreds unarmored hordes |
| **2** | **RIOT SHOTGUN** | 10×6 | 2.7 rps | 6 | 1.35s | Heavy close-quarters spread with devastating knockback |
| **3** | **AK-74 RIFLE** | 17 | 7.6 rps | 30 | 1.20s | High penetration bullet velocity with 1-target pierce |
| **4** | **M134 MINIGUN** | 11 | 16.5 rps | 140 | 2.00s | Sustained suppression with immense magazine capacity |
| **5** | **M6 INCINERATOR** | 13×6 | 3.2 rps | 8 | 1.50s | High-heat fragmentation blasts covering wide chokepoints |
| **6** | **ARC-9 RAILGUN** | 96 | 2.1 rps | 6 | 1.70s | Hyper-velocity slug that pierces through infinite hostiles |

---

## 🧟 Threat Index

| Threat | Classification | Threat Level | Characteristics |
| :--- | :--- | :---: | :--- |
| **WALKER** | Common Infected | 🟩 1/5 | Slow and shambling, but deadly in swarming numbers. |
| **RUNNER** | Agitated Infected | 🟨 2/5 | Quick flankers that rapidly close combat distance. |
| **SPITTER** | Bio-Corrosive | 🟧 3/5 | Artillery unit lobbing corrosive chemical acid pools. |
| **BRUTE** | Mutated Tank | 🟥 4/5 | Heavily armored behemoth capable of soaking immense damage. |
| **ABOMINATION** | Apex Biohazard | 💀 5/5 | Colossal sector boss firing devastating plasma volleys every 5th wave. |

---

## 🎮 Controls & Tactics

### Desktop Controls

| Action | Input | Tactical Tip |
| :--- | :--- | :--- |
| **Move** | <kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd> or <kbd>↑</kbd> <kbd>←</kbd> <kbd>↓</kbd> <kbd>→</kbd> | Keep moving to prevent getting cornered against sector walls. |
| **Aim & Shoot** | <kbd>Mouse</kbd> + <kbd>Left Click</kbd> | Hold LMB for full-auto spray; lead your shots against fast runners. |
| **Combat Dash** | <kbd>Space</kbd> | Grants brief invulnerability frames to slip through tight chokepoints. |
| **Sprint** | <kbd>Shift</kbd> | Burns stamina for a quick burst of emergency speed. |
| **Reload** | <kbd>R</kbd> | Reload during calm moments or wait for automatic reload on empty. |
| **Pause / Menu** | <kbd>P</kbd> or <kbd>Esc</kbd> | Freeze action and review combat telemetry. |

### Mobile Controls
- **Left Virtual Stick**: Smooth omnidirectional character movement.
- **Right Virtual Stick**: 360° twin-stick aiming and continuous trigger.
- **Touch Action Buttons**: Instant Dash, Sprint toggle, and Reload triggers.

---

## 🛠️ Tech Stack & Architecture

- **UI & State**: [React 18](https://reactjs.org/) + [Lucide React](https://lucide.dev/) for HUD, tactical menus, and game state snapshots.
- **Build Tool**: [Vite 6](https://vitejs.dev/) with lightning-fast Hot Module Replacement (HMR).
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/) + custom scanline shaders and cyber-military typography (`Oxanium` & `Creepster`).
- **Game Engine**: Custom object-oriented canvas engine featuring:
  - Deterministic fixed/delta time loop (`requestAnimationFrame`)
  - Spatial partitioning for bullet-to-zombie hit registration
  - Particle emitters for fire, muzzle flare, blood splatters, and environmental embers
  - Procedural sound synthesis engine with zero network MP3/WAV dependencies

---

## 🚀 Quick Start

### Prerequisites
- [Node.js](https://nodejs.org/) (version 18.0.0 or higher recommended)
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
│   │   ├── HUD.tsx         # Tactical heads-up display, radar, and status bars
│   │   └── Screens.tsx     # Menu, pause, game over, and mobile touch joysticks
│   ├── game/
│   │   ├── audio.ts        # Pure Web Audio procedural sound synthesizer
│   │   ├── engine.ts       # 2D canvas game loop, physics, weapons & horde AI
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
