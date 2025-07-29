import jwt from "jsonwebtoken";
import multer from "multer";
import { User } from "../models";
import { Request, Response, NextFunction } from "express";
import { AuthenticatedRequest, userPayload } from "../types/";

const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret_key";

export const authenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // Get authorization header as string
    const rawAuthHeader =
      req.headers.authorization || req.header("authorization");

    // Convert to string if it's an array
    const authHeader: string = Array.isArray(rawAuthHeader)
      ? rawAuthHeader[0]
      : rawAuthHeader || "";

    if (!authHeader || authHeader.trim() === "") {
      return res
        .status(401)
        .json({ error: "Access denied. No token provided." });
    }

    // Extract token (handle both "Bearer token" and just "token" formats)
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.replace("Bearer ", "")
      : authHeader;

    if (!token || token.trim() === "") {
      return res
        .status(401)
        .json({ error: "Access denied. No token provided." });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as userPayload;
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({ error: "Invalid token. User not found." });
    }

    req.user = {
      ...user.toObject(),
      id: user._id.toString(),
      role: user.role || decoded.role,
    };
    next();
  } catch (error) {
    console.error("Authentication error:", error);
    res.status(401).json({ error: "Invalid token." });
  }
};

export const checkOwner = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      return res
        .status(401)
        .json({ error: "Access denied. User not authenticated." });
    }
    if (req.user.role !== "owner") {
      return res
        .status(403)
        .json({ error: "Access denied. Owner privileges required." });
    }
    next();
  } catch (error) {
    console.error("Owner check error:", error);
    res
      .status(403)
      .json({ error: "Access denied. Unable to verify owner status." });
  }
};

// Multer configuration for optional image uploads
const storage = multer.memoryStorage();

const fileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  // Accept only image files
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed!"));
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

// Optional image upload middleware - won't fail if no file is provided
export const optionalImageUpload = upload.single("image");
