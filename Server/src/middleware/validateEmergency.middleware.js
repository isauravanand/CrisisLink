import { errorResponse } from "../utils/apiResponse.js";

const VALID_EMERGENCY_TYPES = ["FIRE", "MEDICAL", "FLOOD", "EARTHQUAKE", "ACCIDENT", "TRAIL_SEARCH", "OTHER"];
const VALID_PRIORITY_LEVELS = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
const VALID_STATUSES = ["REPORTED", "INVESTIGATING", "IN_PROGRESS", "RESOLVED", "DISMISSED"];

const SORT_FIELD_MAP = {
    priority: "priorityScore",
    priorityscore: "priorityScore",
    createdat: "createdAt",
    createdAt: "createdAt"
};

const SORT_ORDER_MAP = {
    asc: 1,
    desc: -1
};

/**
 * Middleware to validate POST /api/emergencies request body
 */
export const validateCreateEmergency = (req, res, next) => {
    let { description, location, emergencyType, priorityLevel, victimCount } = req.body;
    const errors = [];

    // Parse location if sent as stringified JSON via FormData
    if (typeof location === "string") {
        try {
            location = JSON.parse(location);
            req.body.location = location;
        } catch {
            location = { latitude: 28.6139, longitude: 77.2090, address: "User Report Location" };
            req.body.location = location;
        }
    }

    // Convert string victimCount from FormData
    if (victimCount !== undefined && victimCount !== null) {
        const parsedCount = Number(victimCount);
        victimCount = isNaN(parsedCount) ? 1 : parsedCount;
        req.body.victimCount = victimCount;
    }

    // Description validation
    if (!description || typeof description !== "string" || description.trim().length === 0) {
        errors.push("Description is required and must be a non-empty string");
    }

    // Location validation
    if (!location || typeof location !== "object") {
        errors.push("Location object is required with latitude and longitude");
    } else {
        const latitude = Number(location.latitude);
        const longitude = Number(location.longitude);

        if (isNaN(latitude) || latitude < -90 || latitude > 90) {
            errors.push("Valid latitude number is required in location (-90 to 90)");
        } else {
            location.latitude = latitude;
        }

        if (isNaN(longitude) || longitude < -180 || longitude > 180) {
            errors.push("Valid longitude number is required in location (-180 to 180)");
        } else {
            location.longitude = longitude;
        }
    }

    // Optional field checks if provided
    if (emergencyType && typeof emergencyType === "string" && !VALID_EMERGENCY_TYPES.includes(emergencyType.toUpperCase())) {
        errors.push(`emergencyType must be one of: ${VALID_EMERGENCY_TYPES.join(", ")}`);
    }

    if (priorityLevel && typeof priorityLevel === "string" && !VALID_PRIORITY_LEVELS.includes(priorityLevel.toUpperCase())) {
        errors.push(`priorityLevel must be one of: ${VALID_PRIORITY_LEVELS.join(", ")}`);
    }

    if (victimCount !== undefined && (typeof victimCount !== "number" || isNaN(victimCount) || victimCount < 0)) {
        errors.push("victimCount must be a non-negative number");
    }

    if (errors.length > 0) {
        return errorResponse(res, "Validation failed for emergency creation", 400, errors);
    }

    next();
};

/**
 * Middleware to sanitize and validate GET /api/emergencies query parameters
 */
export const validateEmergencyQuery = (req, res, next) => {
    const { page, limit, status, priority, priorityLevel, emergencyType, sort, order } = req.query;
    const sanitized = {};

    // 1. Pagination: page (default 1)
    let pageNum = parseInt(page, 10);
    if (isNaN(pageNum) || pageNum < 1) pageNum = 1;
    sanitized.page = pageNum;

    // 2. Pagination: limit (default 20, max capped at 50)
    let limitNum = parseInt(limit, 10);
    if (isNaN(limitNum) || limitNum < 1) limitNum = 20;
    if (limitNum > 50) limitNum = 50; // Strict maximum cap
    sanitized.limit = limitNum;

    // 3. Status filter
    if (status && typeof status === "string") {
        const upperStatus = status.trim().toUpperCase();
        if (VALID_STATUSES.includes(upperStatus)) {
            sanitized.status = upperStatus;
        } else {
            return errorResponse(res, `Invalid status filter. Allowed values: ${VALID_STATUSES.join(", ")}`, 400);
        }
    }

    // 4. Priority filter (accepts priority or priorityLevel)
    const prioInput = priority || priorityLevel;
    if (prioInput && typeof prioInput === "string") {
        const upperPrio = prioInput.trim().toUpperCase();
        if (VALID_PRIORITY_LEVELS.includes(upperPrio)) {
            sanitized.priorityLevel = upperPrio;
        } else {
            return errorResponse(res, `Invalid priority filter. Allowed values: ${VALID_PRIORITY_LEVELS.join(", ")}`, 400);
        }
    }

    // 5. Emergency Type filter
    if (emergencyType && typeof emergencyType === "string") {
        const upperType = emergencyType.trim().toUpperCase();
        if (VALID_EMERGENCY_TYPES.includes(upperType)) {
            sanitized.emergencyType = upperType;
        } else {
            return errorResponse(res, `Invalid emergencyType filter. Allowed values: ${VALID_EMERGENCY_TYPES.join(", ")}`, 400);
        }
    }

    // 6. Whitelisted Sorting: sort field (default: priorityScore)
    if (sort && typeof sort === "string") {
        const key = sort.trim().toLowerCase();
        sanitized.sortField = SORT_FIELD_MAP[key] || "priorityScore";
    } else {
        sanitized.sortField = "priorityScore";
    }

    // 7. Whitelisted Sorting: sort order (default: desc / -1)
    if (order && typeof order === "string") {
        const ordKey = order.trim().toLowerCase();
        sanitized.sortOrder = SORT_ORDER_MAP[ordKey] !== undefined ? SORT_ORDER_MAP[ordKey] : -1;
    } else {
        sanitized.sortOrder = -1;
    }

    // Attach sanitized object back to request for downstream controller/service
    req.sanitizedQuery = sanitized;
    next();
};

/**
 * Middleware to validate PATCH /api/emergencies/:id/status request body
 */
export const validateUpdateStatus = (req, res, next) => {
    const { status } = req.body;

    if (!status || typeof status !== "string") {
        return errorResponse(res, "Status string is required", 400);
    }

    const upperStatus = status.trim().toUpperCase();

    if (!VALID_STATUSES.includes(upperStatus)) {
        return errorResponse(
            res,
            `Invalid status provided. Must be one of: ${VALID_STATUSES.join(", ")}`,
            400
        );
    }

    req.body.status = upperStatus;
    next();
};
