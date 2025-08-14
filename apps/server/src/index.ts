import crypto from 'crypto';
import path from 'path';

import { GoogleGenerativeAI } from '@google/generative-ai';
import cookieParser from 'cookie-parser';
import 'dotenv/config';
import express, { Request, Response } from 'express';
import { OAuth2Client } from 'google-auth-library';
import { google } from 'googleapis';
import jwt from 'jsonwebtoken';
import { MongoClient } from 'mongodb';

import { UserData } from '@backtime/types'

// env vars
const PORT = process.env.PORT || 3000;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
if (!GOOGLE_CLIENT_ID) throw new Error('missing env var: GOOGLE_CLIENT_ID');
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;
if (!GOOGLE_CLIENT_SECRET) throw new Error('missing env var: GOOGLE_CLIENT_SECRET');
const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;
if (!GEMINI_API_KEY) throw new Error('missing env var: GEMINI_API_KEY');
const MONGODB_URI = process.env.MONGODB_URI!;
if (!MONGODB_URI) throw new Error('missing env var: MONGODB_URI');
const JWT_SECRET = process.env.JWT_SECRET!;
if (!JWT_SECRET) throw new Error('missing env var: JWT_SECRET');
const REDIRECT_URI = process.env.NODE_ENV === 'production'
  ? process.env.REDIRECT_URI_PROD
  : process.env.REDIRECT_URI_DEV;
if (!REDIRECT_URI) throw new Error('missing env var: REDIRECT_URI');

const app = express();
app.use(cookieParser());
app.use(express.json());
const clientBuildPath = path.join(__dirname, '../../client/dist');
app.use(express.static(clientBuildPath));

const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET);

const mongoClient = new MongoClient(MONGODB_URI);
mongoClient.connect().then(() => {
  console.log('successfully connected to mongodb!');
});

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const gemini = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

app.post('/auth/google', async (req: Request, res: Response) => {

  console.log('@@@ /auth/google hit');

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
      idToken,
      audience: GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (!payload) {
      return res.status(401).json({ message: 'no payload from google' });
    }
    const { sub, email, name, picture } = payload;

    const db = mongoClient.db('backtime');
    const usersCollection = db.collection('users');

    // app refresh token
    const refreshToken = crypto.randomBytes(64).toString('hex');
    const hashedRefreshToken = crypto.createHash('sha256').update(refreshToken).digest('hex');

    const updateDoc = {
      $set: {
        name,
        email,
        picture,
        appRefreshToken: hashedRefreshToken,
        ...(tokens.refresh_token && { googleRefreshToken: tokens.refresh_token }),
        lastLoginAt: new Date(),
      },
      $setOnInsert: {
        sub,
        createdAt: new Date(),
      },
    };

    await usersCollection.updateOne({ sub }, updateDoc, { upsert: true });

    const accessToken = jwt.sign({ sub, email, name, picture }, JWT_SECRET, { expiresIn: '15m' });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });

    res.json({ accessToken, userData: { sub, email, name, picture } });

  } catch (error) {
    console.error('google auth error:', error);
    res.status(401).json({ message: 'google auth failed' });
  }
});

app.post('/auth/refresh', async (req: Request, res: Response) => {

  console.log('@@@ /auth/refresh hit');

  const refreshToken = req.cookies.refreshToken;
  console.log(refreshToken);
  if (!refreshToken) {
    return res.status(401).json({ message: 'no refresh token' });
  }

  const hashedRefreshToken = crypto.createHash('sha256').update(refreshToken).digest('hex');

  const db = mongoClient.db('backtime');
  const usersCollection = db.collection('users');
  const user = await usersCollection.findOne({ appRefreshToken: hashedRefreshToken });

  if (!user) {
    return res.status(401).json({ message: 'invalid refresh token' });
  }

  const { sub, email, name, picture } = user;
  const accessToken = jwt.sign({ sub, email, name, picture }, JWT_SECRET, { expiresIn: '15m' });

  res.json({ accessToken, userData: { sub, email, name, picture } });
});

app.post('/auth/logout', async (req: Request, res: Response) => {

  console.log('@@@ /auth/logout hit');

  const refreshToken = req.cookies.refreshToken;
  if (refreshToken) {
    const hashedRefreshToken = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const db = mongoClient.db('backtime');
    await db.collection('users').updateOne(
      { appRefreshToken: hashedRefreshToken }, 
      { $unset: { appRefreshToken: '' } }
    );
  }
  res.clearCookie('refreshToken');
  res.json({ message: 'user logged out' });
});

function authenticateJWT(req: Request, res: Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;

  if (authHeader) {
    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'malformed token' });
    }

    try {
      const userData = jwt.verify(token, JWT_SECRET!) as UserData;
      req.userData = userData;
      next();
    } catch (error) {
      return res.status(401).json({ message: 'invalid or expired JWT' });
    }
  } else {
    res.status(401).json({ message: 'missing auth token' });
  }
}

app.get('/data', authenticateJWT, async (_req: Request, res: Response) => {
  try {
    const db = mongoClient.db('sample_supplies');
    const sales = await db.collection('sales').find({}).limit(1).toArray();
    await new Promise(resolve => setTimeout(resolve, 3000)); // temp delay 
    res.json({ sales });
  } catch (error) {
    console.error('error loading data from mongodb:', error);
    res.status(500).json({ message: 'failed to load data' });
  }
});

app.get('/gmail/message', authenticateJWT, async (req: Request, res: Response) => {

  const sub = req.userData?.sub;
  if (!sub) {
    return res.status(401).json({ message: 'user is not authenticated' });
  }

  try {
    
    const db = mongoClient.db('backtime');
    const usersCollection = db.collection('users');
    const user = await usersCollection.findOne({ sub });

    if (!user || !user.googleRefreshToken) {
      return res.status(400).json({ message: 'gmail access not granted for this user' });
    }

    googleClient.setCredentials({
      refresh_token: user.googleRefreshToken,
    });

    const gmail = google.gmail({ version: 'v1', auth: googleClient });

    const listResponse = await gmail.users.messages.list({ userId: 'me', labelIds: ['INBOX'] });
    const messageId = listResponse.data.messages?.[0]?.id;

    if (!messageId) {
      return res.status(404).json({ message: 'No messages found.' });
    }

    const msgResponse = await gmail.users.messages.get({ userId: 'me', id: messageId });
    const payload = msgResponse.data.payload;

    const subjectHeader = payload?.headers?.find(h => h.name === 'Subject');
    const title = subjectHeader?.value || 'No Subject';

    let bodyData = '';
    if (payload?.parts) {
      const plainTextPart = payload.parts.find(part => part.mimeType === 'text/plain');
      bodyData = plainTextPart?.body?.data || '';
    } else if (payload?.body?.data) {
      bodyData = payload.body.data;
    }

    const body = Buffer.from(bodyData, 'base64').toString('utf8').replace(/(\r\n|\n|\r)/gm, " ").replace(/ +/g, " ");

    await new Promise(resolve => setTimeout(resolve, 3000)); // temp delay 
    res.json({ title, body });

  } catch (error) {
    console.error('error fetching gmail stuff:', error);
    res.status(500).json({ message: 'failed to fetch gmail stuff' });
  }
});

app.post('/gemini/summarize', authenticateJWT, async (req: Request, res: Response) => {

  const { text } = req.body;
  if (!text) {
    return res.status(400).json({ message: 'missing text to summarize' });
  }

  try {

    const prompt = `Summarize this in one sentence: ${text}`;
    const result = await gemini.generateContent(prompt);
    const response = await result.response;
    const summary = response.text();
    res.json({ summary });
    
  } catch (error) {
    console.error('error fetching gemini stuff:', error);
    res.status(500).json({ message: 'failed to fetch gemini stuff' });
  }
});

app.get('*', (_req: Request, res: Response) => {
  res.sendFile(path.join(clientBuildPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`server listening on http://localhost:${PORT}`);
});