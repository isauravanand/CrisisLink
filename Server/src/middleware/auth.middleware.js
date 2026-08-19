import jwt from "jsonwebtoken";
import Admin from "../models/Admin.js";

/**
 * Middleware to verify JWT authentication token
 */
export const requireAuth = async (req, res, next) => {
    try {
        let token = null;

        if (req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
            token = req.headers.authorization.split(" ")[1];
        } else if (req.cookies && req.cookies.token) {
            token = req.cookies.token;
        }

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "Authentication token missing. Please sign in."
            });
        }

        const secret = process.env.JWT_SECRET || "lifeline_jwt_secret_key_2026_super_secure";
        const decoded = jwt.verify(token, secret);

        // Verify admin user still exists in database
        const adminUser = await Admin.findById(decoded.id).select("-passwordHash");
        if (!adminUser) {
            return res.status(401).json({
                success: false,
                message: "Admin account no longer exists."
            });
        }

        req.user = {
            id: adminUser._id.toString(),
            email: adminUser.email,
            role: adminUser.role
        };

        next();
    } catch (error) {
        if (error.name === "TokenExpiredError") {
            return res.status(401).json({
                success: false,
                message: "Session expired. Please sign in again."
            });
        }
        return res.status(401).json({
            success: false,
            message: "Invalid authentication token."
        });
    }
};

/**
 * Middleware to enforce ADMIN role authorization
 */
export const requireAdmin = [
    requireAuth,
    (req, res, next) => {
        if (req.user && req.user.role === "ADMIN") {
            return next();
        }
        return res.status(403).json({
            success: false,
            message: "Access denied. Admin authorization required."
        });
    }
];

export default { requireAuth, requireAdmin };
