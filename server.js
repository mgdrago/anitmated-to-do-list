import express from 'express';
import morgan from 'morgan';
import path from 'path';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { listTodos, createTodo, getTodo, updateTodo, reorder, softDelete, purgeDeleted } from './db.js';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


const app = express();
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));


// Serve frontend
app.use(express.static(path.join(__dirname, 'public')));


// Health
app.get('/api/health', (req, res) => res.json({ ok: true }));


// List
app.get('/api/todos', (req, res) => {
const { q = '', status = 'all', priority, tag } = req.query;
const data = listTodos({ q, status, priority, tag });
res.json(data);
});


// Create
app.post('/api/todos', (req, res) => {
const { title } = req.body;
if (!title || !title.trim()) return res.status(400).json({ error: 'Title is required' });
const todo = createTodo(req.body);
res.status(201).json(todo);
});


// Read one
app.get('/api/todos/:id', (req, res) => {
const todo = getTodo(Number(req.params.id));
if (!todo) return res.status(404).json({ error: 'Not found' });
res.json(todo);
});


// Update
app.patch('/api/todos/:id', (req, res) => {
const updated = updateTodo(Number(req.params.id), req.body);
if (!updated) return res.status(404).json({ error: 'Not found' });
res.json(updated);
});


// Soft delete
app.delete('/api/todos/:id', (req, res) => {
softDelete(Number(req.params.id));
res.status(204).end();
});


// Reorder
app.post('/api/todos/reorder', (req, res) => {
const { ids } = req.body; // array of ids in the desired order
if (!Array.isArray(ids)) return res.status(400).json({ error: 'ids must be an array' });
reorder(ids.map(Number));
res.json({ ok: true });
});


// Maintenance (optional)
app.post('/api/todos/purge', (_req, res) => { purgeDeleted(); res.json({ ok: true }); });


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`\n🚀 Animated To‑Do running → http://localhost:${PORT}\n`));
