import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import Admin from "../models/Admin.js";

/**
 * POST /api/auth/login
 * Admin Login Endpoint
 */
export const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Email and password are required"
            });
        }

        const cleanEmail = email.trim().toLowerCase();
        const admin = await Admin.findOne({ email: cleanEmail });

        if (!admin) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password"
            });
        }

        const isMatch = await bcrypt.compare(password, admin.passwordHash);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password"
            });
        }

        const secret = process.env.JWT_SECRET || "lifeline_jwt_secret_key_2026_super_secure";
        const token = jwt.sign(
            {
                id: admin._id.toString(),
                email: admin.email,
                role: admin.role
            },
            secret,
            { expiresIn: "24h" }
        );

        return res.status(200).json({
            success: true,
            data: {
                token,
                user: {
                    id: admin._id.toString(),
                    email: admin.email,
                    role: admin.role
                }
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * GET /api/auth/me
 * Fetch authenticated admin profile
 */
export const getMe = async (req, res, next) => {
    try {
        return res.status(200).json({
            success: true,
            data: {
                id: req.user.id,
                email: req.user.email,
                role: req.user.role
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * POST /api/auth/logout
 * Admin Logout Endpoint
 */
export const logout = async (req, res, next) => {
    try {
        return res.status(200).json({
            success: true,
            message: "Logged out successfully"
        });
    } catch (error) {
        next(error);
    }
};

export default { login, getMe, logout };
