# DET Prep Studio

Personal **Duolingo English Test (DET)** Mock Exam Simulator & Gemini AI Practice Studio.

## Features
- **Express (~15 min) & Full (~45 min) Mock Exams** with adaptive difficulty, strict item timers, fullscreen proctor checks, and an official-style 10–160 Score Report (4 Core + 4 Integrated subscores, IELTS & CEFR equivalents).
- **All 13 DET Task Types:** Read & Select, Fill in the Blanks, Read & Complete, Listen & Type, Read Aloud, Interactive Reading (6 stages), Interactive Listening, Write/Speak About the Photo, Interactive Writing (5+3 min), Read Then Speak, Writing Sample, and Speaking Sample.
- **Google Gemini AI Integration:** Evaluates Writing essays and real Speaking microphone audio (`gemini-2.5-flash` / `gemini-2.5-flash-lite`) and generates unlimited fresh adaptive questions.
- **Bilingual UI (UZ / EN)**, Mistake Bank with Flashcard Drill, and JSON Backup/Restore.

## Run Locally
Double-click `start.bat` on Windows or run:
```bash
node scripts/dev-server.js
```
(or `npm run dev`), then open `http://localhost:4173` in your browser.

## Connect Gemini AI (Free Tier)
1. Create a free API key at https://aistudio.google.com/apikey
2. Open **Settings** in the app, paste your key, test the connection, and save. Your key stays strictly in your browser `localStorage`.

## Deploy (Vercel / GitHub Pages)
Configured for zero-dependency static deployment on **Vercel** (`vercel.json` runs `node scripts/build.js` and outputs `dist/`).
