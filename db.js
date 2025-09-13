// db.js — SQLite helpers (better-sqlite3, ESM-safe)

import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure data directory exists
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);

// Open / create database
const dbPath = path.join(dataDir, 'todos.db');
const db = new Database(dbPath);

// Pragmas for stability & performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Schema
db.exec(`
CREATE TABLE IF NOT EXISTS todos (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  title        TEXT NOT NULL,
  notes        TEXT DEFAULT '',
  priority     TEXT CHECK(priority IN ('low','medium','high')) DEFAULT 'medium',
  due_date     TEXT,
  tags         TEXT DEFAULT '',          -- comma-separated
  is_completed INTEGER DEFAULT 0,        -- 0/1
  sort_order   INTEGER DEFAULT 0,
  created_at   TEXT DEFAULT (datetime('now')),
  updated_at   TEXT DEFAULT (datetime('now')),
  deleted_at   TEXT
);
CREATE INDEX IF NOT EXISTS idx_todos_sort ON todos(sort_order);
CREATE INDEX IF NOT EXISTS idx_todos_completed ON todos(is_completed);
`);

/**
 * List todos with optional filters
 * @param {Object} opts
 * @param {string} opts.q search query (title/notes)
 * @param {'all'|'active'|'completed'} opts.status
 * @param {'low'|'medium'|'high'} [opts.priority]
 * @param {string} [opts.tag] tag name without '#' (matches CSV)
 */
export function listTodos({ q = '', status = 'all', priority, tag } = {}) {
  const where = ['deleted_at IS NULL'];
  const params = {};

  if (q) {
    where.push('(title LIKE @q OR notes LIKE @q)');
    params.q = `%${q}%`;
  }
  if (priority) {
    where.push('priority = @priority');
    params.priority = priority;
  }
  if (tag) {
    // Match a CSV cell exactly on boundaries
    where.push(`(',' || tags || ',') LIKE @tag`);
    params.tag = `%,${tag},%`;
  }
  if (status === 'active') where.push('is_completed = 0');
  if (status === 'completed') where.push('is_completed = 1');

  const sql = `
    SELECT *
    FROM todos
    WHERE ${where.join(' AND ')}
    ORDER BY is_completed, sort_order, due_date IS NULL, due_date
  `;

  return db.prepare(sql).all(params);
}

/**
 * Create a todo
 * @param {Object} todo
 */
export function createTodo(todo) {
  const insert = db.prepare(`
    INSERT INTO todos (title, notes, priority, due_date, tags, is_completed, sort_order)
    VALUES (@title, @notes, @priority, @due_date, @tags, @is_completed, @sort_order)
  `);

  const info = insert.run({
    title: (todo.title ?? '').toString().trim(),
    notes: todo.notes ?? '',
    priority: todo.priority ?? 'medium',
    due_date: todo.due_date ?? null,
    tags: Array.isArray(todo.tags) ? todo.tags.join(',') : (todo.tags ?? ''),
    is_completed: todo.is_completed ? 1 : 0,
    // Use time-based default to keep new items at bottom
    sort_order: Number.isFinite(todo.sort_order) ? todo.sort_order : Date.now()
  });

  return getTodo(info.lastInsertRowid);
}

/**
 * Get a todo by id
 */
export function getTodo(id) {
  const row = db.prepare(`SELECT * FROM todos WHERE id = ?`).get(id);
  return row ?? null;
}

/**
 * Update a todo (partial)
 * @param {number} id
 * @param {Object} patch
 */
export function updateTodo(id, patch = {}) {
  const current = getTodo(id);
  if (!current) return null;

  // Merge & normalize fields
  const merged = {
    ...current,
    ...patch,
  };

  // Normalize tags
  if (Array.isArray(patch.tags)) {
    merged.tags = patch.tags.join(',');
  } else if (typeof patch.tags === 'string') {
    merged.tags = patch.tags;
  } else {
    merged.tags = current.tags;
  }

  // Normalize is_completed
  if (typeof patch.is_completed === 'boolean') {
    merged.is_completed = patch.is_completed ? 1 : 0;
  }

  // Allow due_date null
  if (patch.hasOwnProperty('due_date') && !patch.due_date) {
    merged.due_date = null;
  }

  // Keep sort_order if provided
  if (!Number.isFinite(merged.sort_order)) {
    merged.sort_order = current.sort_order;
  }

  db.prepare(`
    UPDATE todos
    SET title=@title,
        notes=@notes,
        priority=@priority,
        due_date=@due_date,
        tags=@tags,
        is_completed=@is_completed,
        sort_order=@sort_order,
        updated_at = datetime('now')
    WHERE id=@id
  `).run({
    id,
    title: (merged.title ?? current.title).toString().trim(),
    notes: merged.notes ?? '',
    priority: merged.priority ?? 'medium',
    due_date: merged.due_date ?? null,
    tags: merged.tags ?? '',
    is_completed: merged.is_completed ?? current.is_completed,
    sort_order: merged.sort_order
  });

  return getTodo(id);
}

/**
 * Reorder todos by array of ids in desired order
 * @param {number[]} idsInOrder
 */
export function reorder(idsInOrder = []) {
  const update = db.prepare(`UPDATE todos SET sort_order = @sort_order, updated_at = datetime('now') WHERE id = @id`);
  const tx = db.transaction((ids) => {
    ids.forEach((id, idx) => {
      update.run({ id, sort_order: (idx + 1) * 100 });
    });
  });
  tx(idsInOrder);
}

/**
 * Soft delete (marks deleted_at)
 */
export function softDelete(id) {
  db.prepare(`UPDATE todos SET deleted_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`).run(id);
}

/**
 * Permanently remove soft-deleted rows
 */
export function purgeDeleted() {
  db.prepare(`DELETE FROM todos WHERE deleted_at IS NOT NULL`).run();
}
