import { Router } from 'express';
import db from '../db.js';

const router = Router();

router.get('/', (_req, res) => {
  const boards = db.prepare('SELECT * FROM boards ORDER BY position, created_at').all();
  res.json(boards);
});

router.post('/', (req, res) => {
  const { id, name } = req.body;
  if (!id || !name) {
    res.status(400).json({ error: 'id and name are required' });
    return;
  }
  const maxPos = db.prepare('SELECT COALESCE(MAX(position), -1) as max FROM boards').get() as { max: number };
  db.prepare(
    'INSERT INTO boards (id, name, position) VALUES (?, ?, ?)'
  ).run(id, name, maxPos.max + 1);
  const board = db.prepare('SELECT * FROM boards WHERE id = ?').get(id);
  res.status(201).json(board);
});

router.patch('/:id', (req, res) => {
  const { id } = req.params;
  const { name, position } = req.body;
  const fields: string[] = [];
  const values: unknown[] = [];

  if (name !== undefined) { fields.push('name = ?'); values.push(name); }
  if (position !== undefined) { fields.push('position = ?'); values.push(position); }

  if (fields.length === 0) {
    res.status(400).json({ error: 'No fields to update' });
    return;
  }

  fields.push("updated_at = datetime('now')");
  values.push(id);

  db.prepare(`UPDATE boards SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  const board = db.prepare('SELECT * FROM boards WHERE id = ?').get(id);
  res.json(board);
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM boards WHERE id = ?').run(req.params.id);
  res.status(204).end();
});

export default router;
