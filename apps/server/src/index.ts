import path from 'path';

import 'dotenv/config';
import express, { Request, Response } from 'express';
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import { MongoClient } from 'mongodb';

const PORT = process.env.PORT || 3000;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
if (!GOOGLE_CLIENT_ID) throw new Error('missing env var: GOOGLE_CLIENT_ID');
const JWT_SECRET = process.env.JWT_SECRET!;
if (!JWT_SECRET) throw new Error('missing env var: GOOGLE_CLIENT_ID or JWT_SECRET');
const MONGODB_URI = process.env.MONGODB_URI!;
if (!MONGODB_URI) throw new Error('missing env var: MONGODB_URI');


const app = express();
app.use(express.json());
const clientBuildPath = path.join(__dirname, '../../client/dist');
app.use(express.static(clientBuildPath));

const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);
app.post('/auth/google', async (req: Request, res: Response) => {

  const { credential } = req.body;
  
  if (!credential) {
    return res.status(400).json({ message: 'missing credential' })
  }

  try {

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload) {
      return res.status(401).json({ message: 'no payload from google' });
    }
    const { email, name, picture, sub } = payload;
    const token = jwt.sign({ sub, email, name, picture }, JWT_SECRET, { expiresIn: '1h' });
    res.json({ token, user: { id: sub, email, name, picture } });

  } catch (err) {
    console.error('google auth error:', err);
    res.status(401).json({ message: 'google auth failed' });
  }
});

function authenticateJWT(req: Request, res: Response, next: express.NextFunction) {

  const authHeader = req.headers.authorization;
  
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'missing or invalid auth header' });
  }

  const token = authHeader.split(' ')[1];

  try {
    // const decoded = jwt.verify(token, JWT_SECRET);
    jwt.verify(token, JWT_SECRET);
    // req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'invalid or expired JWT' });
  }
}

const mongoClient = new MongoClient(MONGODB_URI);
mongoClient.connect().then(() => {
  console.log('successfully connected to mongodb!');
});
app.get('/data', authenticateJWT, async (_req: Request, res: Response) => {
  try {
    const db = mongoClient.db('sample_supplies');
    const sales = await db.collection('sales').find({}).limit(1).toArray();
    await new Promise(resolve => setTimeout(resolve, 5000)); // temp
    res.json({ sales });
  } catch (err) {
    console.error('error loading data from mongodb:', err);
    res.status(500).json({ message: 'failed to load data' });
  }
});

app.get('*', (_req: Request, res: Response) => {
  res.sendFile(path.join(clientBuildPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`server listening on http://localhost:${PORT}`);
});