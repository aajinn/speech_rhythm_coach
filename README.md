# 🎤 Speech Rhythm Coach

A real-time browser tool that trains you to speak at **82 BPM** — one word per beat. Speak into your microphone, get instant rhythm feedback, and climb the leaderboard against AI competitors that grow as you improve.

---

## ✨ Features

### Metronome Engine
- Accurate 82 BPM click track using the **Web Audio API look-ahead scheduler** (Chris Wilson technique)
- Stays locked in timing even during long sessions
- Mutable click with audible/silent toggle

### Real-time Speech Tracking
- Microphone input via `getUserMedia` — no browser speech recognition API
- Voice activity detection (VAD) using RMS energy analysis on an `AnalyserNode`
- Detects speech onsets, burst durations, and silence gaps at ~20 ms latency

### Rhythm Analysis
- Measures your **inter-onset interval (IOI)** and converts to BPM using an exponential weighted average
- Beat-grid phase scoring — how closely your words land on each click
- Live **Slow ↔ Perfect ↔ Fast** meter animated with Framer Motion springs

### Coaching Feedback
- 8 coaching messages that update in real time: *Excellent Pace*, *Stay With The Beat*, *Slow Down*, *Speed Up*, *Keep Speaking*, and more
- Driven by BPM delta, accuracy score, consistency, and silence gap detection

### Session Metrics
- Accuracy %, Average BPM, Rhythm Consistency, Beat Streak, Fast/Slow Deviations
- End-of-session summary modal with animated score reveal

### Competence Scoring
Composite 0–100 score using four weighted components:

| Component | Weight | Measures |
|---|---|---|
| Beat-grid accuracy | 40% | How precisely words land on beats |
| Rhythm consistency | 30% | BPM stability across the session |
| Longest streak | 20% | Consecutive perfect beats |
| Session duration | 10% | Rewards longer practice |

A BPM-penalty multiplier (0.6–1.0) reduces the score when average tempo drifts far from 82 BPM.

### Skill Tiers
`🌱 Novice` → `📈 Apprentice` → `🎯 Practitioner` → `⚡ Expert` → `👑 Master`

### Leaderboard
- Right-side slide panel with personal best tracking
- **12 AI competitors** spread across all tiers — they simulate practice sessions after every real session you complete, growing faster when you're outpacing them
- Scores stored in `localStorage` — no backend required
- Bot entries clearly labelled `AI`

### Keyboard Shortcuts

| Key | Action |
|---|---|
| `Space` | Start / Stop session |
| `M` | Mute / unmute click |
| `Esc` | Dismiss modal |

---

## 🏗️ Architecture

```
app/
  page.tsx                  # Server component shell
  layout.tsx                # Root layout with metadata

components/
  SpeechRhythmCoach.tsx     # Main orchestrator
  PulseVisualizer.tsx       # Animated beat circle (Framer Motion)
  SessionControls.tsx       # Start / Stop / Mute buttons
  SessionTimer.tsx          # mm:ss elapsed timer
  CoachingFeedback.tsx      # Live coaching message card
  RhythmDisplay.tsx         # BPM vs you, meter, accuracy, metrics
  RhythmMeter.tsx           # Slow ↔ Fast spring-animated slider
  SessionSummary.tsx        # End-of-session modal
  Leaderboard.tsx           # Right-side leaderboard panel
  NamePrompt.tsx            # Name entry modal (first save)

lib/
  MetronomeEngine.ts        # Web Audio look-ahead scheduler
  AudioAnalyzer.ts          # AnalyserNode VAD + RMS
  SpeechTracker.ts          # Mic lifecycle + burst tracking
  RhythmCalculator.ts       # IOI → BPM, accuracy scoring (pure)
  MetricsCalculator.ts      # Session aggregates + coaching logic (pure)
  SessionController.ts      # Session lifecycle + snapshot history
  CompetenceScorer.ts       # 0–100 composite score + tier mapping
  LeaderboardStore.ts       # localStorage persistence
  FakeSpeakers.ts           # AI competitor simulation engine

hooks/
  useMetronome.ts           # MetronomeEngine → React state
  useSpeechTracker.ts       # SpeechTracker → React state
  useSessionMetrics.ts      # SessionController → React state
  useLeaderboard.ts         # Leaderboard + bot trigger wiring
  useKeyboardShortcuts.ts   # Global keydown handler

types/
  index.ts                  # All shared TypeScript types
```

---

## 🚀 Getting Started

**Requirements:** Node.js 20+, a browser with Web Audio API and `getUserMedia` support.

```bash
# Install dependencies
npm install

# Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and allow microphone access when prompted.

---

## 🏗️ Building

```bash
npm run build
```

This outputs a fully static site to `out/` (Next.js `output: "export"` mode).

---

## 🌐 Deployment — GitHub Pages

The repository includes a GitHub Actions workflow at `.github/workflows/deploy.yml`.

**To enable:**

1. Push to GitHub
2. Go to **Settings → Pages → Source** and select **GitHub Actions**
3. If your repository is not named `speech_rhythm_coach`, update the `REPO_NAME` variable at the top of `.github/workflows/deploy.yml`

On every push to `main` the workflow will:
- Install dependencies with `npm ci`
- Build the static export with the correct `basePath`
- Add `.nojekyll` so GitHub Pages doesn't strip `_next/`
- Deploy to `https://<your-username>.github.io/<repo-name>/`

---

## 🛠️ Tech Stack

| | |
|---|---|
| Framework | [Next.js 16](https://nextjs.org) (App Router, static export) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS v4 |
| Animation | [Framer Motion 12](https://www.framer.com/motion/) |
| Audio | Web Audio API (`AudioContext`, `AnalyserNode`) |
| Storage | `localStorage` |
| CI/CD | GitHub Actions → GitHub Pages |
