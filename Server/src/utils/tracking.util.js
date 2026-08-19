import crypto from "crypto";
import jwt from "jsonwebtoken";

/**
 * Generate a unique public Case ID (e.g. LF-2026-8K29P)
 */
export const generateCaseId = () => {
    const year = new Date().getFullYear();
    const chars = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"; // Readability friendly (no 0, O, 1, I)
    let randomPart = "";
    const bytes = crypto.randomBytes(5);
    for (let i = 0; i < 5; i++) {
        randomPart += chars[bytes[i] % chars.length];
    }
    return `LF-${year}-${randomPart}`;
};

/**
 * Generate a cryptographically secure random tracking code (e.g. 7F9K-2M4P)
 */
export const generateTrackingCode = () => {
    const chars = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
    const bytes = crypto.randomBytes(8);
    let part1 = "";
    let part2 = "";
    for (let i = 0; i < 4; i++) {
        part1 += chars[bytes[i] % chars.length];
    }
    for (let i = 4; i < 8; i++) {
        part2 += chars[bytes[i] % chars.length];
    }
    return `${part1}-${part2}`;
};

/**
 * Compute SHA-256 hash of raw tracking code
 */
export const hashTrackingCode = (code) => {
    if (!code) return "";
    const cleanCode = code.trim().toUpperCase();
    return crypto.createHash("sha256").update(cleanCode).digest("hex");
};

/**
 * Securely verify tracking code against stored SHA-256 hash
 */
export const verifyTrackingCode = (code, storedHash) => {
    if (!code || !storedHash) return false;
    const inputHash = hashTrackingCode(code);
    try {
        const bufA = Buffer.from(inputHash, "utf8");
        const bufB = Buffer.from(storedHash, "utf8");
        if (bufA.length !== bufB.length) return false;
        return crypto.timingSafeEqual(bufA, bufB);
    } catch {
        return false;
    }
};

/**
 * Generate a short-lived public tracking session JWT (1h expiration)
 */
export const generateTrackingSessionToken = (caseId) => {
    const secret = process.env.JWT_SECRET || "lifeline_jwt_secret_key_2026_super_secure";
    return jwt.sign(
        { caseId, role: "PUBLIC_TRACKER" },
        secret,
        { expiresIn: "1h" }
    );
};

/**
 * Verify short-lived public tracking session JWT
 */
export const verifyTrackingSessionToken = (token) => {
    try {
        const secret = process.env.JWT_SECRET || "lifeline_jwt_secret_key_2026_super_secure";
        const decoded = jwt.verify(token, secret);
        if (decoded && decoded.role === "PUBLIC_TRACKER" && decoded.caseId) {
            return decoded.caseId;
        }
        return null;
    } catch {
        return null;
    }
};

/**
 * Controlled public message mapping for incident status
 */
export const getPublicStatusMessage = (status) => {
    const upperStatus = (status || "REPORTED").toUpperCase();
    switch (upperStatus) {
        case "REPORTED":
            return "Your emergency report has been received and logged into the emergency queue.";
        case "INVESTIGATING":
            return "Your emergency report is currently being reviewed by command center dispatchers.";
        case "IN_PROGRESS":
            return "Response operations are currently in progress for your incident.";
        case "RESOLVED":
            return "This incident has been marked as resolved by emergency response units.";
        case "DISMISSED":
            return "This incident report has been closed.";
        default:
            return "Your emergency report is in system queue.";
    }
};

export default {
    generateCaseId,
    generateTrackingCode,
    hashTrackingCode,
    verifyTrackingCode,
    generateTrackingSessionToken,
    verifyTrackingSessionToken,
    getPublicStatusMessage
};
