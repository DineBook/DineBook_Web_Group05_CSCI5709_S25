import { Request, Response } from "express";

import { User } from "../models/";
import {
	generateToken,
	generateVerificationToken,
	hashPassword,
	sendVerificationEmail,
	verifyPassword,
} from "../utils/";
import { sendPasswordResetEmail } from "../utils/email";
import { userPayload } from "../types/";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key';

export const register = async (req: Request, res: Response) => {
	const { email, password, role = "customer", name } = req.body;

	try {
		const existingUser = await User.findOne({ email });
		if (existingUser) {
			return res.status(400).json({ error: 'A user with this email already exists.' });
		}

		const verificationToken = generateVerificationToken(32);
		const hashedPassword = await hashPassword(password);
		const user = new User({
			email,
			password: hashedPassword,
			role,
			name,
			isVerified: false,
			verificationToken,
		});
		await user.save();

		await sendVerificationEmail(email, verificationToken);

		res.status(201).json({ message: 'Registration successful. Please check your email to verify your account.' });
	} catch (err) {
		console.error('Error during registration:', err);
		res.status(500).json({ message: 'An unexpected error occurred during registration. Please try again later.' });
	}
};

export const login = async (req: Request, res: Response) => {
	const { email, password } = req.body;

	try {
		const user = await User.findOne({ email });
		if (!user) {
			return res.status(400).json({ message: 'Invalid email or password.' });
		}

		if (!user.isVerified) {
			return res.status(403).json({ message: 'Please verify your email before logging in.' });
		}

		const isMatch = await verifyPassword(password, user.password);
		if (!isMatch) {
			return res.status(400).json({ message: 'Invalid email or password.' });
		}

		const payload: userPayload = {
			id: user._id.toString(),
			role: user.role,
		};
		const token = generateToken(payload);
		res.json({
			token,
			user: {
				id: user._id,
				email: user.email,
				role: user.role,
				name: user.name,
			},
		});
	} catch (err) {
		console.error('Error during login:', err);
		res.status(500).json({ message: 'An unexpected error occurred during login. Please try again later.' });
	}
};

export const verifyEmail = async (req: Request, res: Response) => {
	const { token } = req.query;

	try {
		const user = await User.findOne({ verificationToken: token });
		if (!user) {
			return res.status(400).json({ message: 'Invalid or expired verification link.' });
		}

		await User.updateOne(
			{ _id: user._id },
			{ $set: { isVerified: true }, $unset: { verificationToken: "" } }
		);

		res.json({ message: 'Your email has been verified successfully.' });
	} catch (err) {
		console.error('Error during email verification:', err);
		res.status(500).json({ message: 'An unexpected error occurred during email verification. Please try again later.' });
	}
};

export const forgotPassword = async (req: Request, res: Response) => {
	const { email } = req.body;

	try {
		const user = await User.findOne({ email });
		if (!user) {
			// Return success message even if user doesn't exist for security
			return res.json({ message: 'If an account with that email exists, we have sent a password reset link.' });
		}

		// Generate JWT token for password reset (expires in 1 hour)
		const resetToken = jwt.sign(
			{ userId: user._id.toString(), email: user.email },
			JWT_SECRET,
			{ expiresIn: '1h' }
		);

		await sendPasswordResetEmail(user.email, resetToken);

		res.json({ message: 'If an account with that email exists, we have sent a password reset link.' });
	} catch (err) {
		console.error('Error during password reset request:', err);
		res.status(500).json({ message: 'An unexpected error occurred. Please try again later.' });
	}
};

export const resetPassword = async (req: Request, res: Response) => {
	const { token, newPassword } = req.body;

	try {
		// Verify the JWT token
		const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; email: string };

		const user = await User.findById(decoded.userId);
		if (!user || user.email !== decoded.email) {
			return res.status(400).json({ message: 'Invalid or expired reset token.' });
		}

		// Hash the new password
		const hashedPassword = await hashPassword(newPassword);

		// Update the user's password
		await User.updateOne(
			{ _id: user._id },
			{ $set: { password: hashedPassword } }
		);

		res.json({ message: 'Your password has been reset successfully.' });
	} catch (err) {
		if (err instanceof jwt.JsonWebTokenError) {
			return res.status(400).json({ message: 'Invalid or expired reset token.' });
		}
		console.error('Error during password reset:', err);
		res.status(500).json({ message: 'An unexpected error occurred. Please try again later.' });
	}
};
