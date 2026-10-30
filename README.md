# Designer Tracker

A responsive front-end prototype for a design-team task tracker.

## Files
- `index.html` – dashboard, designer directory, messages, settings and help views
- `style.css` – shared responsive styling
- `script.js` – demo data, navigation, task CRUD, designer search, profile editing, notifications and local chat
- `login.html` / `signup.html` – separate entry pages
- `assets/` – place your own logo and profile assets here

## Run locally
Open `login.html` in a browser, or use VS Code Live Server. For GitHub Pages, push the files to the repository root and enable Pages from the repository's Settings.

## Demo behaviour and limitations
This prototype stores its data in browser `localStorage`. Data is not shared across devices or team members. Login is a front-end demo only; it does not verify passwords or provide secure sessions. Chat messages are local demo messages. File attachment, invitations and real-time group membership require a backend and file storage.

For production, connect Firebase or Supabase for authentication, database, storage and real-time chat.

## Profile images
Demo avatar URLs are from Random User Generator (`https://randomuser.me/`). Replace these with your own licensed profile images. The logo is an inline icon and wordmark; replace the brand block in `index.html` with your own SVG or image when ready.
