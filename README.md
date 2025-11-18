🎬 Flago – Group Movie Decision App
Flago is a cross-platform web application designed to help groups of friends quickly and fairly decide on a single movie to watch. Users can create rooms, join via shared links, submit personalized movie preferences, swipe through recommendations, and receive a final movie ranking generated through an ELO-based scoring algorithm.

Built for both desktop and mobile, Flago brings a smooth, interactive, and visually dynamic experience.

🚀 Features
🎉 Real-Time Group Rooms

Hosts create a party room and share a unique URL with friends.

Friends join instantly — no sign-up required.

All participants stay synced throughout the session.

📝 Dynamic Preference Form

Each user fills out a customizable form with:

Genre selection (required)

Era preferences (optional)

Music-based mood input (Spotify API)

Additional optional selectors

Users can skip all optional categories, making the process fast and flexible.

⏳ Live Progress Tracking

Host dashboard shows completion progress of all users in real time.

Session begins only when the host starts the room.

🎬 Movie Generation & Swiping

Recommendations are generated based on all users' combined preferences.

Users interact with each movie using:

➡️ Swipe right / Like

⬅️ Swipe left / Dislike

🖱️ Or click corresponding buttons

🧠 ELO-Based Ranking System

The backend uses a custom ELO scoring algorithm to:

Rank movies based on collective user preferences

Prevent ties

Produce a final, consensus-based ranking

✨ Modern UI & Interactive Feel

Smooth, mobile-friendly UI

3D animated background

Micro-animations across forms, swipes, buttons, and lists

A polished, app-like feel

Additional "About" and "Contact Us" pages for completeness

🛠️ Tech Stack
🖥️ Frontend

React.js

TailwindCSS / Custom CSS

Swipe & gesture libraries

3D animation libraries (e.g., Three.js)

Responsive mobile + desktop layout

☁️ Backend

Node.js / Express

Supabase

Spotify Web API (song ↔ mood analysis)

Movie Data API (TMDB or equivalent)

Custom ELO ranking algorithm

🔧 Other Tools

Git / GitHub

Deployment platforms (e.g., Vercel, Netlify, Render, Railway)

Environment variable handling

🔐 Supabase Integration
Flago uses Supabase to handle all room and user persistence logic:

🚪 Room Creation: When a host creates a room, a new room entry is stored.

🤝 User Joining: As users join via the shared link, they are added to that room’s session.

💾 Preference Storage: User preferences (genres, eras, music inputs) are stored in Supabase to ensure:

State persistence

Accurate backend processing

Reliable ELO calculations

🔄 State Syncing: Supabase also helps sync state if users refresh their browser or reconnect.

This allows the app to build real-time, multi-user functionality without managing a database from scratch.

🧩 How It Works
Create: Host creates a room → receives shareable link.

Join: Friends join the room via URL.

Submit: Each user completes the preference form.

Monitor: Host monitors progress from their dashboard.

Generate: Backend generates movies based on combined preferences.

Swipe: Users swipe / like / dislike recommended movies.

Calculate: ELO ranking algorithm calculates final scores.

View: Final results page displays the top movie picks for the group.
