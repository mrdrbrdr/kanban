import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import db from '../db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DOCS_DIR = path.join(__dirname, '..', '..', '..', 'docs');

const router = Router();

// List cards for a board (with progress counts)
router.get('/boards/:boardId/cards', (req, res) => {
  const cards = db.prepare(`
    SELECT c.*,
      COUNT(n.id) as totalNodes,
      COUNT(CASE WHEN n.status = 'done' THEN 1 END) as doneNodes
    FROM cards c
    LEFT JOIN nodes n ON n.card_id = c.id
    WHERE c.board_id = ?
    GROUP BY c.id
    ORDER BY c.position, c.created_at
  `).all(req.params.boardId);
  res.json(cards);
});

// Create a card
router.post('/boards/:boardId/cards', (req, res) => {
  const { id, title, description, column } = req.body;
  const boardId = req.params.boardId;
  if (!id || !title) {
    res.status(400).json({ error: 'id and title are required' });
    return;
  }
  const maxPos = db.prepare(
    'SELECT COALESCE(MAX(position), -1) as max FROM cards WHERE board_id = ? AND "column" = ?'
  ).get(boardId, column || 'backlog') as { max: number };

  db.prepare(
    'INSERT INTO cards (id, board_id, title, description, "column", position) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(id, boardId, title, description || '', column || 'backlog', maxPos.max + 1);

  const card = db.prepare('SELECT * FROM cards WHERE id = ?').get(id);
  res.status(201).json(card);
});

// Update a card
router.patch('/cards/:id', (req, res) => {
  const { id } = req.params;
  const { title, description, column, position, priority } = req.body;
  const fields: string[] = [];
  const values: unknown[] = [];

  if (title !== undefined) { fields.push('title = ?'); values.push(title); }
  if (description !== undefined) { fields.push('description = ?'); values.push(description); }
  if (column !== undefined) { fields.push('"column" = ?'); values.push(column); }
  if (position !== undefined) { fields.push('position = ?'); values.push(position); }
  if (priority !== undefined) { fields.push('priority = ?'); values.push(priority ? 1 : 0); }

  if (fields.length === 0) {
    res.status(400).json({ error: 'No fields to update' });
    return;
  }

  fields.push("updated_at = datetime('now')");
  values.push(id);

  db.prepare(`UPDATE cards SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  const card = db.prepare('SELECT * FROM cards WHERE id = ?').get(id);
  res.json(card);
});

// Delete a card
router.delete('/cards/:id', (req, res) => {
  db.prepare('DELETE FROM cards WHERE id = ?').run(req.params.id);
  res.status(204).end();
});

// Get card documentation markdown
router.get('/cards/:cardId/doc', (req, res) => {
  const { cardId } = req.params;
  if (!/^[a-z0-9]{4,}$/.test(cardId)) {
    res.status(400).json({ error: 'Invalid card ID' });
    return;
  }
  const filePath = path.join(DOCS_DIR, `${cardId}.md`);
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    res.json({ content });
  } catch {
    res.json({ content: '' });
  }
});

// Write card documentation markdown
router.put('/cards/:cardId/doc', (req, res) => {
  const { cardId } = req.params;
  if (!/^[a-z0-9]{4,}$/.test(cardId)) {
    res.status(400).json({ error: 'Invalid card ID' });
    return;
  }
  const { content } = req.body;
  if (typeof content !== 'string') {
    res.status(400).json({ error: 'content must be a string' });
    return;
  }
  fs.mkdirSync(DOCS_DIR, { recursive: true });
  fs.writeFileSync(path.join(DOCS_DIR, `${cardId}.md`), content);
  res.json({ ok: true });
});

export default router;
