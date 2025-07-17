import express from 'express';
import path from 'path';

const app = express();
const port = process.env.PORT || 3001;

app.use(express.static(path.join(__dirname, '../../web/dist')));

app.get('/api', (req, res) => {
  res.send('Hello from the API!');
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../../web/dist/index.html'));
});

app.listen(port, () => {
  console.log(`API server listening on port ${port}`);
});