import { ObjectId } from 'mongodb';

export interface User {
  _id?: ObjectId;
  email: string;
  password: string;
  role: 'customer' | 'owner';
  name: string;
  isVerified: boolean;
  verificationToken?: string;
}