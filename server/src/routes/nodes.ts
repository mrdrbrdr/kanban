import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import db from '../db.js';
import { wouldCreateCycle, recomputeStatuses } from '../lib/graph.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DOCS_DIR = path.join(__dirname, '..', '..', '..', 'docs');

const router = Router();

// Get all nodes + dependencies for a card
router.get('/cards/:cardId/nodes', (req, res) => {
  const { cardId } = req.params;
  const nodes = db.prepare('SELECT * FROM nodes WHERE card_id = ? ORDER BY created_at').all(cardId);
  const dependencies = db.prepare(
    `SELECT nd.* FROM node_dependencies nd
     JOIN nodes n ON n.id = nd.node_id
     WHERE n.card_id = ?`
  ).all(cardId);
  res.json({ nodes, dependencies });
});

// Create a node
router.post('/cards/:cardId/nodes', (req, res) => {
  const { cardId } = req.params;
  const { id, title } = req.body;
  if (!id || !title) {
    res.status(400).json({ error: 'id and title are required' });
    return;
  }
  db.prepare(
    'INSERT INTO nodes (id, card_id, title, status) VALUES (?, ?, ?, ?)'
  ).run(id, cardId, title, 'unlocked');

  recomputeStatuses(cardId);
  const node = db.prepare('SELECT * FROM nodes WHERE id = ?').get(id);
  res.status(201).json(node);
});

// Update a node
router.patch('/nodes/:id', (req, res) => {
  const { id } = req.params;
  const { title, description, notes, deadline, status } = req.body;
  const fields: string[] = [];
  const values: unknown[] = [];

  if (title !== undefined) { fields.push('title = ?'); values.push(title); }
  if (description !== undefined) { fields.push('description = ?'); values.push(description); }
  if (notes !== undefined) { fields.push('notes = ?'); values.push(notes); }
  if (deadline !== undefined) { fields.push('deadline = ?'); values.push(deadline); }
  if (status !== undefined) { fields.push('status = ?'); values.push(status); }

  if (fields.length === 0) {
    res.status(400).json({ error: 'No fields to update' });
    return;
  }

  fields.push("updated_at = datetime('now')");
  values.push(id);

  db.prepare(`UPDATE nodes SET ${fields.join(', ')} WHERE id = ?`).run(...values);

  // Recompute downstream statuses, then return the post-recompute state
  const node = db.prepare('SELECT card_id FROM nodes WHERE id = ?').get(id) as { card_id: string } | undefined;
  if (node) recomputeStatuses(node.card_id);

  const updated = db.prepare('SELECT * FROM nodes WHERE id = ?').get(id);
  res.json(updated);
});

// Delete a node
router.delete('/nodes/:id', (req, res) => {
  const node = db.prepare('SELECT card_id FROM nodes WHERE id = ?').get(req.params.id) as { card_id: string } | undefined;
  db.prepare('DELETE FROM nodes WHERE id = ?').run(req.params.id);
  if (node) recomputeStatuses(node.card_id);
  res.status(204).end();
});

// Add a dependency
router.post('/nodes/:nodeId/dependencies', (req, res) => {
  const { nodeId } = req.params;
  const { id, dependsOnId } = req.body;
  if (!id || !dependsOnId) {
    res.status(400).json({ error: 'id and dependsOnId are required' });
    return;
  }

  // Get the card_id for cycle check
  const node = db.prepare('SELECT card_id FROM nodes WHERE id = ?').get(nodeId) as { card_id: string } | undefined;
  if (!node) {
    res.status(404).json({ error: 'Node not found' });
    return;
  }

  if (wouldCreateCycle(nodeId, dependsOnId, node.card_id)) {
    res.status(400).json({ error: 'Cannot add dependency: would create a circular dependency' });
    return;
  }

  try {
    db.prepare(
      'INSERT INTO node_dependencies (id, node_id, depends_on_id) VALUES (?, ?, ?)'
    ).run(id, nodeId, dependsOnId);
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes('UNIQUE')) {
      res.status(409).json({ error: 'Dependency already exists' });
      return;
    }
    throw err;
  }

  recomputeStatuses(node.card_id);
  res.status(201).json({ id, node_id: nodeId, depends_on_id: dependsOnId });
});

// Remove a dependency
router.delete('/nodes/:nodeId/dependencies/:depId', (req, res) => {
  const node = db.prepare(
    `SELECT n.card_id FROM nodes n
     JOIN node_dependencies nd ON nd.node_id = n.id
     WHERE nd.id = ?`
  ).get(req.params.depId) as { card_id: string } | undefined;

  db.prepare('DELETE FROM node_dependencies WHERE id = ?').run(req.params.depId);

  if (node) recomputeStatuses(node.card_id);
  res.status(204).end();
});

// Get full context for a node (card, all sibling nodes, dependencies, doc)
router.get('/nodes/:nodeId/context', (req, res) => {
  const { nodeId } = req.params;
  const node = db.prepare('SELECT card_id FROM nodes WHERE id = ?').get(nodeId) as { card_id: string } | undefined;
  if (!node) {
    res.status(404).json({ error: 'Node not found' });
    return;
  }

  const cardId = node.card_id;
  const card = db.prepare(`
    SELECT c.*, b.name as board_name, b.id as board_id,
      COUNT(n.id) as totalNodes,
      COUNT(CASE WHEN n.status = 'done' THEN 1 END) as doneNodes
    FROM cards c
    JOIN boards b ON b.id = c.board_id
    LEFT JOIN nodes n ON n.card_id = c.id
    WHERE c.id = ?
    GROUP BY c.id
  `).get(cardId);

  const nodes = db.prepare('SELECT * FROM nodes WHERE card_id = ? ORDER BY created_at').all(cardId);
  const dependencies = db.prepare(
    `SELECT nd.* FROM node_dependencies nd
     JOIN nodes n ON n.id = nd.node_id
     WHERE n.card_id = ?`
  ).all(cardId);

  let doc = '';
  try {
    doc = fs.readFileSync(path.join(DOCS_DIR, `${cardId}.md`), 'utf-8');
  } catch {}

  res.json({ card, nodes, dependencies, doc });
});

export default router;
