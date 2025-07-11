import { Request, Response } from "express";

import { User } from "../models/";
import {
	generateToken,
	generateVerificationToken,
	hashPassword,
	sendVerificationEmail,
	verifyPassword,
} from "../utils/";
import { userPayload } from "../types/";

export const register = async (req: Request, res: Response) => {
	const { email, password, role = "customer", name } = req.body;

	try {
		const existingUser = await User.findOne({ email });
		if (existingUser) {
			return res.status(400).json({ error: 'User already exists with this email' });
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

		res.status(201).json({ message: 'Registration successful! Please check your email to verify your account.' });
	} catch (err) {
		console.error('Error during registration:', err);
		res.status(500).json({ message: 'Server error', error: err });
	}
};

export const login = async (req: Request, res: Response) => {
	const { email, password } = req.body;

	try {
		const user = await User.findOne({ email });
		if (!user) {
			return res.status(400).json({ message: 'Invalid credentials' });
		}

		if (!user.isVerified) {
			return res.status(403).json({ message: 'Please verify your email first' });
		}

		const isMatch = await verifyPassword(password, user.password);
		if (!isMatch) {
			return res.status(400).json({ message: "Invalid credentials" });
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
		res.status(500).json({ message: 'Server error', error: err });
	}
};

export const verifyEmail = async (req: Request, res: Response) => {
	const { token } = req.query;

	try {
		const user = await User.findOne({ verificationToken: token });
		if (!user) {
			return res.status(400).json({ message: 'Invalid or expired token' });
		}

		await User.updateOne(
			{ _id: user._id },
			{ $set: { isVerified: true }, $unset: { verificationToken: "" } }
		);

		res.json({ message: 'Email verified successfully' });
	} catch (err) {
		console.error('Error during email verification:', err);
		res.status(500).json({ message: 'Server error', error: err });
	}
};
