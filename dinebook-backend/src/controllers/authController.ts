import { Request, Response } from 'express';
import { Db } from 'mongodb';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { User } from '../models/user';
import { sendVerificationEmail } from '../utils/email';

export const register = async (req: Request, res: Response) => {
  const { email, password, role, name } = req.body;
  const db: Db = req.app.locals.db;

  try {
    const existingUser = await db.collection('users').findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const verificationToken = crypto.randomBytes(32).toString('hex');
    const hashedPassword = await bcrypt.hash(password, 10);
    const user: User = {
      email,
      password: hashedPassword,
      role,
      name,
      isVerified: false,
      verificationToken,
    };
    await db.collection('users').insertOne(user);

    await sendVerificationEmail(email, verificationToken);

    res.status(201).json({ message: 'Registration successful! Please check your email to verify your account.' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err });
  }
};

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const db: Db = req.app.locals.db;

  try {
    const user = await db.collection('users').findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    if (!user.isVerified) {
      return res.status(403).json({ message: 'Please verify your email first' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '1h' }
    );

    res.json({ token, user: { id: user._id, email: user.email, role: user.role, name: user.name } });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err });
  }
};

export const verifyEmail = async (req: Request, res: Response) => {
  const { token } = req.query;
  const db: Db = req.app.locals.db;

  try {
    const user = await db.collection('users').findOne({ verificationToken: token });
    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired token' });
    }

    await db.collection('users').updateOne(
      { _id: user._id },
      { $set: { isVerified: true }, $unset: { verificationToken: '' } }
    );

    res.json({ message: 'Email verified successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err });
  }
};