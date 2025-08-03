import path from 'path';

import 'dotenv/config';
import cookieParser from 'cookie-parser';
import express, { Request, Response } from 'express';
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import { MongoClient } from 'mongodb';
import { google } from 'googleapis';

import { UserData } from '@backtime/types'

// env vars
const PORT = process.env.PORT || 3000;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
if (!GOOGLE_CLIENT_ID) throw new Error('missing env var: GOOGLE_CLIENT_ID');
const JWT_SECRET = process.env.JWT_SECRET!;
if (!JWT_SECRET) throw new Error('missing env var: JWT_SECRET');
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;
if (!GOOGLE_CLIENT_SECRET) throw new Error('missing env var: GOOGLE_CLIENT_SECRET');
const REDIRECT_URI = process.env.NODE_ENV === 'production'
  ? process.env.REDIRECT_URI_PROD
  : process.env.REDIRECT_URI_DEV;
if (!REDIRECT_URI) throw new Error('missing env var: REDIRECT_URI');
const MONGODB_URI = process.env.MONGODB_URI!;
if (!MONGODB_URI) throw new Error('missing env var: MONGODB_URI');


const app = express();
app.use(cookieParser());
app.use(express.json());
const clientBuildPath = path.join(__dirname, '../../client/dist');
app.use(express.static(clientBuildPath));

const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET);
app.post('/auth/google', async (req: Request, res: Response) => {
  const { code } = req.body;

  if (!code) {
    return res.status(400).json({ message: 'missing authorization code' });
  }

  try {
    const { tokens } = await googleClient.getToken({
      code,
      redirect_uri: REDIRECT_URI,
    });

    const idToken = tokens.id_token;
    if (!idToken) {
      return res.status(401).json({ message: 'no id_token from google' });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: idToken,
      audience: GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload) {
      return res.status(401).json({ message: 'no payload from google' });
    }

    const { email, name, picture, sub } = payload;

    if (tokens.refresh_token) {
      const db = mongoClient.db('backtime');
      const usersCollection = db.collection('users');
      await usersCollection.updateOne(
        { googleId: sub },
        { $set: { gmailRefreshToken: tokens.refresh_token } },
        { upsert: true }
      );
      console.log('refresh token stored for user:', sub);
    }

    const token = jwt.sign({ sub, email, name, picture }, JWT_SECRET, { expiresIn: '1h' });

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production'
    });

    res.json({ user: { sub, email, name, picture } });

  } catch (error) {
    console.error('google auth error:', error);
    res.status(401).json({ message: 'google auth failed' });
  }
});

app.get('/auth/me', authenticateJWT, (req: Request, res: Response) => {
  res.json({ user: req.userData });
});

app.post('/auth/logout', (_req: Request, res: Response) => {
  res.clearCookie('token');
  res.json({ message: 'logged out' });
});

function authenticateJWT(req: Request, res: Response, next: express.NextFunction) {

  const token = req.cookies.token;

  if (!token) {
    return res.status(401).json({ message: 'missing token in cookie' });
  }

  try {
    const userData = jwt.verify(token, JWT_SECRET!) as UserData;
    req.userData = userData;
    next();
  } catch (error) {
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
    await new Promise(resolve => setTimeout(resolve, 5000)); // temp delay 
    res.json({ sales });
  } catch (error) {
    console.error('error loading data from mongodb:', error);
    res.status(500).json({ message: 'failed to load data' });
  }
});

app.get('/gmail/messages', authenticateJWT, async (req: Request, res: Response) => {
  const userId = req.userData?.sub;

  if (!userId) {
    return res.status(401).json({ message: 'User not authenticated' });
  }

  try {
    const db = mongoClient.db('backtime');
    const usersCollection = db.collection('users');
    const user = await usersCollection.findOne({ googleId: userId });

    if (!user || !user.gmailRefreshToken) {
      return res.status(400).json({ message: 'gmail access not granted for this user' });
    }

    googleClient.setCredentials({
      refresh_token: user.gmailRefreshToken,
    });

    const { token } = await googleClient.getAccessToken();
    if (!token) {
      throw new Error('failed to get access token');
    }
    googleClient.setCredentials({ access_token: token });

    const gmail = google.gmail({ version: 'v1', auth: googleClient });
    const response = await gmail.users.messages.list({ userId: 'me' });

    res.json(response.data);
  } catch (error) {
    console.error('error fetching gmail messages:', error);
    res.status(500).json({ message: 'failed to fetch gmail messages' });
  }
});

app.get('*', (_req: Request, res: Response) => {
  res.sendFile(path.join(clientBuildPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`server listening on http://localhost:${PORT}`);
});