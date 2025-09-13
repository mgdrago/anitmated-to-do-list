Animated To‑Do — README

Overview
This is a fast, animated to‑do web app. It has a lightweight Node.js + Express backend with a SQLite database, and a minimal, responsive frontend with an animated particle background.

Key Features
- Add tasks: Title, optional due date, optional priority (low/medium/high).
- List tasks: Shows all tasks with priority badges and due dates.
- Search: Filter by text across title and notes.
- Status filter: All, Active, or Completed.
- Priority filter: Any, Low, Medium, High.
- Tag filter: Filter by a single tag (type like “#work”).
- Complete/uncomplete: Toggle via checkbox.
- Reorder: Drag and drop tasks; order persists.
- Soft delete: Delete hides the task (kept in DB).
- Purge deleted: Permanently remove soft‑deleted tasks.
- Toast messages: Quick feedback for actions.
- Animated background: Subtle particle lines following the cursor.
- Accessibility: Focus outlines for keyboard users.

Technology & Frameworks Used
- Language: JavaScript (ES Modules)
- Backend: Node.js (Express), CORS, Morgan
- Database: SQLite via better‑sqlite3
- Frontend: HTML5, CSS3, vanilla JavaScript (no frontend framework)
- Styling helpers: Tailwind CSS via CDN (utility classes)

Project Structure
- package.json            — Scripts and dependencies (ESM enabled)
- server.js               — Express HTTP server and API routes
- db.js                   — SQLite schema and data access helpers
- public/index.html       — Main HTML page
- public/app.js           — Frontend logic (UI + fetch + drag/drop)
- public/styles.css       — Custom styles (including glassmorphism)
- data/todos.db           — SQLite database (auto‑created)

How to Run
1) Install Node.js (v18+ recommended).
2) Install dependencies: npm install
3) Start the server: npm start
4) Open http://localhost:3000 in your browser.

Environment
- PORT (optional): Port to listen on (default 3000).
- NODE_ENV=development (optional): Enables dev logging; used in the dev script.

API Endpoints (JSON)
- GET    /api/health                 → { ok: true }
- GET    /api/todos                  → List with optional query params:
    - q: string (search in title/notes)
    - status: all|active|completed
    - priority: low|medium|high
    - tag: string (without “#”)
- POST   /api/todos                  → Create { title, notes?, priority?, due_date?, tags?, is_completed? }
- GET    /api/todos/:id              → Read one
- PATCH  /api/todos/:id              → Update partial fields
- DELETE /api/todos/:id              → Soft delete (marks deleted_at)
- POST   /api/todos/reorder          → Persist order { ids: [Number] }
- POST   /api/todos/purge            → Permanently delete soft‑deleted tasks

Data Model (todos)
- id: integer primary key
- title: text (required)
- notes: text (optional)
- priority: 'low' | 'medium' | 'high' (default 'medium')
- due_date: ISO string or null
- tags: CSV string (e.g., "work,personal"); UI shows as #work #personal
- is_completed: 0/1
- sort_order: integer (used for ordering)
- created_at / updated_at: timestamps
- deleted_at: nullable (soft‑delete marker)

Usage Tips
- Press Enter in the “Add a task” input to quickly add.
- Use drag and drop to change order; it saves automatically.
- Type tags without the "#" in the tag filter (the UI will show with #).

Notes
- Tailwind utilities are loaded via CDN in public/index.html. If you prefer to avoid external CDNs, remove the script tag and convert remaining Tailwind utility usages to plain CSS.
- The database files live in the data/ folder. You can safely delete the WAL/SHM sidecar files; SQLite will recreate them as needed.

License
No explicit license provided. Treat as private/internal unless stated otherwise.

