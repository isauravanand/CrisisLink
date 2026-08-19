import { errorResponse } from "../utils/apiResponse.js";

/**
 * Centralized Error Handling Middleware
 */
export const errorHandler = (err, req, res, next) => {
    let statusCode = err.statusCode || 500;
    let message = err.message || "Internal Server Error";
    let errors = err.errors || null;

    // Handle invalid Mongoose ObjectId cast error
    if (err.name === "CastError" && err.kind === "ObjectId") {
        statusCode = 400;
        message = `Invalid ID format: ${err.value}`;
    }

    // Handle Mongoose Validation Errors
    if (err.name === "ValidationError") {
        statusCode = 400;
        message = "Database validation failed";
        errors = Object.values(err.errors).map((e) => e.message);
    }

    // Handle Duplicate Key Error (E11000)
    if (err.code === 11000) {
        statusCode = 400;
        message = "Duplicate field value entered";
    }

    console.error(`[Error] ${statusCode} - ${message}`);
    if (process.env.NODE_ENV !== "production" && err.stack) {
        console.error(err.stack);
    }

    return errorResponse(res, message, statusCode, errors);
};

/**
 * Middleware for 404 Not Found route handler
 */
export const notFoundHandler = (req, res) => {
    return errorResponse(res, `Route not found: ${req.originalUrl}`, 404);
};
