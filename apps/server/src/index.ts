import path from 'path';

import 'dotenv/config';
import express, { Request, Response } from 'express';
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';

const PORT = process.env.PORT || 3000;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const JWT_SECRET = process.env.JWT_SECRET!;
if (!GOOGLE_CLIENT_ID || !JWT_SECRET) {
  throw new Error('missing env vars: GOOGLE_CLIENT_ID or JWT_SECRET');
}

const app = express();
app.use(express.json());
const clientBuildPath = path.join(__dirname, '../../client/dist');
app.use(express.static(clientBuildPath));


const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);
app.post('/auth/google', async (req: Request, res: Response) => {

  const { credential } = req.body;
  
  if (!credential) {
    return res.status(400).json({ error: 'missing credential' })
  }

  try {

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload) {
      return res.status(401).json({ error: 'no payload from google' });
    }
    const { email, name, picture, sub } = payload;
    const token = jwt.sign({ sub, email, name, picture }, JWT_SECRET, { expiresIn: '1h' });
    res.json({ token, user: { id: sub, email, name, picture } });

  } catch (err) {
    console.error('google auth error:', err);
    res.status(401).json({ error: 'google auth failed' });
  }
});

function authenticateJWT(req: Request, res: Response, next: express.NextFunction) {

  const authHeader = req.headers.authorization;
  
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'missing or invalid auth header' });
  }

  const token = authHeader.split(' ')[1];

  try {
    // const decoded = jwt.verify(token, JWT_SECRET);
    jwt.verify(token, JWT_SECRET);
    // req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'invalid or expired JWT' });
  }
}

// sample protected route
app.get('/protected', authenticateJWT, (_req: Request, res: Response) => {
  // res.json({ message: 'access granted', user: req.user });
  res.json({ message: 'access granted' });
});

app.get('*', (_req: Request, res: Response) => {
  res.sendFile(path.join(clientBuildPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`server listening on http://localhost:${PORT}`);
});