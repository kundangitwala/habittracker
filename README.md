# HabitFlow — Habit Tracker with Chrome Extension

A full-featured habit tracking web app with a companion Chrome Extension for quick access.

---

## 📁 Project Structure

```
habit-tracker/
├── index.html          ← Main web application
├── style.css           ← All styles (dark/light theme)
├── app.js              ← All JavaScript logic
├── README.md           ← This file
└── extension/
    ├── manifest.json   ← Chrome Extension manifest (V3)
    ├── popup.html      ← Extension popup UI
    ├── popup.css       ← Extension popup styles
    ├── popup.js        ← Extension logic
    ├── content-script.js ← Bridges web app ↔ extension
    └── icons/
        ├── icon16.png  ← (add your own icons)
        ├── icon48.png
        └── icon128.png
```

---

## 🚀 Running the Web App

1. Open `index.html` in any modern browser (Chrome, Firefox, Edge, Safari)
2. Create an account via Sign Up
3. Add habits and start tracking!

> **Note:** For best results, serve via a local server:
> ```bash
> npx serve .
> # or
> python3 -m http.server 8080
> ```
> Then open `http://localhost:8080`

---

## 🧩 Installing the Chrome Extension

### Step 1: Add Icons
Create an `extension/icons/` folder and add three PNG icon files:
- `icon16.png` (16×16 px)
- `icon48.png` (48×48 px)
- `icon128.png` (128×128 px)

Use any green hexagon or habit icon. Free options: [Icons8](https://icons8.com), [Flaticon](https://flaticon.com)

### Step 2: Load in Chrome
1. Open Chrome → `chrome://extensions/`
2. Enable **Developer Mode** (top-right toggle)
3. Click **"Load unpacked"**
4. Select the `extension/` folder
5. The HabitFlow icon will appear in your toolbar!

### Step 3: Enable Content Script Sync (Optional but Recommended)
To sync between the web app and extension automatically, add this to `manifest.json` under the `permissions` and `content_scripts` sections:

```json
"host_permissions": [
  "http://localhost/*",
  "http://127.0.0.1/*"
],
"content_scripts": [
  {
    "matches": ["http://localhost/*", "http://127.0.0.1/*"],
    "js": ["content-script.js"],
    "run_at": "document_idle"
  }
]
```

Replace the URL patterns with your actual hosting domain if deployed.

---

## 🔄 How Data Sync Works

### Without Content Script
- Web app stores data in **browser's localStorage**
- Extension stores data in **chrome.storage.local**
- They are **separate** but use the **same key structure**
- Use the extension independently to track habits

### With Content Script (full sync)
- Content script bridges both storages
- Any change in the web app syncs to the extension
- Any mark-done in the extension syncs back to the web app
- Runs automatically when you visit the app's URL

---

## 💾 Data Structure

```javascript
// LocalStorage / chrome.storage.local keys:

// All registered users
hf_users = {
  "u_<timestamp>": {
    id: "u_1234567890",
    name: "Jane Doe",
    email: "jane@example.com",
    password: "hashed_or_plain",  // plain text for demo purposes
    createdAt: "2024-01-15"
  }
}

// Current logged-in user
hf_session = {
  id: "u_1234567890",
  name: "Jane Doe",
  email: "jane@example.com"
}

// User's habits (one key per user)
hf_habits_u_1234567890 = [
  {
    id: "h_1234567890",
    name: "Morning Meditation",
    emoji: "🧘",
    color: "#22c55e",
    completedDates: ["2024-01-15", "2024-01-16", "2024-01-17"],
    createdAt: "2024-01-10"
  }
]
```

---

## ✨ Features

### Web App
- 🔐 Sign Up / Login / Logout with session persistence
- ➕ Add, Edit, Delete habits with emoji & color
- ✅ Mark habits done (once per day)
- 🔥 Streak tracking (current + longest)
- 📅 30-day calendar view per habit
- 📊 Statistics dashboard per habit
- 📈 Weekly bar chart
- 🌙 Dark / Light mode toggle
- 📱 Responsive mobile design

### Chrome Extension
- 👁 View all today's habits in a compact popup
- ✅ Mark habits done directly from the extension
- 🔥 See streak for each habit
- 📊 Summary stats (done/total, best streak, %)
- 🌙 Dark / Light mode toggle
- 🔄 Syncs with web app (with content script)

---

## 🎨 Design

- **Fonts:** Syne (headings) + DM Sans (body)
- **Colors:** Dark `#0d0f14` / Green accent `#22c55e` / Orange streak `#f97316`
- **Cards:** Rounded, bordered, with colored top-stripe
- **Animations:** Smooth fade-up views, spring-physics progress bars

---

## 🔒 Security Note

This is a demo project. Passwords are stored in plain text in LocalStorage.
For production, always use proper password hashing (e.g., bcrypt) and a real backend.
