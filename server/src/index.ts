import express from 'express';
import cors from 'cors';
import boardsRouter from './routes/boards.js';
import cardsRouter from './routes/cards.js';
import nodesRouter from './routes/nodes.js';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/boards', boardsRouter);
app.use('/api', cardsRouter);
app.use('/api', nodesRouter);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
