import express, { Request, Response } from 'express';
import path from 'path';
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';

// these should be environment variables in a real application
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID';
const JWT_SECRET = process.env.JWT_SECRET || 'YOUR_JWT_SECRET';

const client = new OAuth2Client(GOOGLE_CLIENT_ID);

const app = express();
app.use(express.json()); // to parse json body
const port = process.env.PORT || 3001;

app.use(express.static(path.join(__dirname, '../../web/dist')));

app.post('/api/auth/google', async (req: Request, res: Response) => {
  const { id_token } = req.body;

  try {
    const ticket = await client.verifyIdToken({
      idToken: id_token,
      audience: GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();

    if (!payload) {
      return res.status(401).json({ message: 'invalid google id token' });
    }

    const { sub, email, name, picture } = payload;

    // generate our own jwt
    const appToken = jwt.sign({ sub, email, name, picture }, JWT_SECRET, { expiresIn: '1h' });

    res.json({ token: appToken, user: { id: sub, email, name, picture } });

  } catch (error) {
    console.error('google auth error:', error);
    res.status(401).json({ message: 'google authentication failed' });
  }
});

// middleware to verify our own jwt
const authenticateToken = (req: Request, res: Response, next: express.NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token == null) return res.sendStatus(401); // if there isn't any token

  jwt.verify(token, JWT_SECRET as string, (err: any, user: any) => {
    if (err) return res.sendStatus(403);
    (req as any).user = user; // attach user payload to request
    next();
  });
};

app.get('/api', authenticateToken, (_req: Request, res: Response) => {
  res.send('Hello from the API!');
});

app.get('*', authenticateToken, (_req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, '../../web/dist/index.html'));
});

app.listen(port, () => {
  console.log(`API server listening on port ${port}`);
});