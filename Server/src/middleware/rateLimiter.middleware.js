const trackingAttemptsMap = new Map();

/**
 * Lightweight rate-limiting middleware for public incident tracking (max 10 attempts per minute per IP)
 */
export const trackRateLimiter = (req, res, next) => {
    const ip = req.ip || req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1";
    const now = Date.now();
    const WINDOW_MS = 60 * 1000; // 1 minute window
    const MAX_ATTEMPTS = 10;

    let record = trackingAttemptsMap.get(ip);

    if (!record || now - record.startTime > WINDOW_MS) {
        record = { count: 1, startTime: now };
    } else {
        record.count += 1;
    }

    trackingAttemptsMap.set(ip, record);

    if (record.count > MAX_ATTEMPTS) {
        return res.status(429).json({
            success: false,
            message: "Too many failed tracking attempts. Please wait 1 minute before trying again."
        });
    }

    next();
};

export default trackRateLimiter;
