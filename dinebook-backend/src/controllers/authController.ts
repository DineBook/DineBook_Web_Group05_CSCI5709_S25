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
		// SECURITY: Enhanced input validation and sanitization
		if (!email || !password || !name) {
			return res.status(400).json({ error: 'Email, password, and name are required' });
		}

		// SECURITY: Email format validation
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(email)) {
			return res.status(400).json({ error: 'Invalid email format' });
		}

		// SECURITY: Strong password requirements
		if (password.length < 8) {
			return res.status(400).json({ error: 'Password must be at least 8 characters long' });
		}

		const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/;
		if (!passwordRegex.test(password)) {
			return res.status(400).json({ 
				error: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character' 
			});
		}

		// SECURITY: Name validation (prevent script injection)
		const nameRegex = /^[a-zA-Z\s]+$/;
		if (!nameRegex.test(name) || name.length > 50) {
			return res.status(400).json({ error: 'Invalid name format' });
		}

		// SECURITY: Role validation
		const allowedRoles = ['customer', 'owner'];
		if (!allowedRoles.includes(role)) {
			return res.status(400).json({ error: 'Invalid role specified' });
		}

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
