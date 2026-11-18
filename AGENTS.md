# AGENTS.md — Instructions for Codex and development agents

## Mission / المهمة
Build **Warraq (ورّاق)** as a high-quality, original, Arabic-first immersive educational math game for students in Oman across grade levels. The benchmark is the *level of delight and learning flow* of children's guided-learning game products, **not their exact characters, assets, branding, layouts, voices, or code**. Never scrape, copy, or reproduce AdaptedMind proprietary assets.

## Project architecture
- Current hosting: GitHub Pages from `main` / `/(root)`. It is a **static frontend**.
- Primary game entry: `adventure.html` / `adventure.js` / `adventure.css`. This is the newer game prototype and must remain the main focus.
- `play.html` redirects to `adventure.html`. `play-classic.html` and older `play.js` / `play.css` / `play-arcade.css` are previous experiments; don't build new features on these.
- `game-data.js` contains two original, example-only math packs: Grade 5 fractions and Grade 12 advanced limits.
- `index.html`, `main.js`, `style.css`: PDF flipbook editor prototype; preserve its working routes.
- `lab.html`, `lab.js`, `lab.css`: image-to-3D teaching lab; preserve.
- `worker/index.js`: example optional server for AI analysis; do not publish secrets.

## Product requirements
1. Game storytelling flow: original welcome corridor → grade choice → immersive teaching scene (e.g. underwater for fractions, observatory for limits) → interactive answer and feedback → star reward → progress map → avatar customization. Users must be able to access each stage with clear buttons and navigate backwards.
2. Questions must be integrated naturally into the game **without covering the character**. On small phones, show at least the face/upper body and the full legible math question and answer choices; scroll only when essential.
3. Use high-quality **original** 3D characters/worlds, expressive idle/talking/celebrating/thinking states, smooth but not excessive camera transitions, controllable audio and reduced-motion support.
4. Real natural Arabic spoken dialogue requires either recorded voice-actor audio assets licensed for use or an optional **secure backend** TTS; built-in `speechSynthesis` is a clearly labeled fallback and will sound synthetic. No claims that it sounds like a human actor without tests.
5. Grade-appropriate Arabic educational UX: grade 5 playful, grade 12 more mature. RTL and Arabic-Indic digits. Math must use real stacked fractions, readable exponents, graph labels; never show mangled expressions or reverse equation ordering. Respect correct mathematics.
6. Accessibility: tap targets >= 44px, keyboard navigation, text alternatives, color contrast, captions/text alternatives for dialogue, audio controls.
7. Performance: Android mid-range phone at 360×800 and 390×844, mobile Chrome; test 3D initialization, frame rates, overflow, world transitions, error paths. Cap DPR and animation rate reasonably; progressive enhancement when WebGL unavailable.
8. Questions from actual textbooks must be imported only when user possesses appropriate rights and reviewed by teacher. Do not invent that demo content comes from a textbook. Leave a validated JSON schema / content import plan suitable for future grades.
9. Keep voices and user uploads private. Do not put OpenAI, speech, database or any API keys in client-side HTML/JS, GitHub, or GitHub Pages. Use secrets on an authenticated server, with rate limits, budget caps and abuse prevention.

## Coding and verification workflow
- Read current implementation before modifying. Avoid a rewrite that breaks existing paths.
- Work in a **feature branch** and prepare a PR, not directly on `main`, until screenshot, interaction, and regression testing are complete.
- Add a small repeatable local development and testing workflow (e.g. `package.json`, Vite preview or static dev server, and Playwright smoke tests) before large animation work. If tests cannot run, document the exact blocker.
- Verify the complete user journey: scene intro → grade choice → question (wrong answer + hint) → right answer → reward → next question → map → customization → replay.
- Test mobile screenshots at **360×800, 390×844, 768×1024**, and desktop at **1440×900**. Report screenshots or artifacts and list any known issues.
- Follow small iterative PRs: reliability first, then scene layout and question presentation, then expressive animation, then improved voice. Avoid implementing 20 features in one untested commit.
- Prefer maintainable modules for scene state, world setup, question rendering, sound, and data. Introduce complexity only when justified. Three.js is already present.
- Do not claim voice naturalness, extraction accuracy, or external hosting without live verification.
- Build for learning outcomes as well as visual excitement: clear hint, explanatory feedback, mastered/unmastered skills, safe positive rewards without shame.

## First Codex task
See GitHub issue **"Codex Sprint 1 — polished original 3D math adventure"**. Audit `adventure.*`, fix known UX and correctness issues, establish tests, improve the phone presentation in an original cinematic style, and open a PR with before/after screenshots. Preserve `main` until reviewed.

## Expected response format
Briefly report: changed files; design rationale; mobile and desktop test evidence; actual sound source (device TTS / voice actor / optional service); performance; open problems; link to PR. Explain technical changes in accessible Arabic for a teacher who wants to learn.
