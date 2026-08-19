/**
 * Standard API Response Utilities
 * Ensures consistent response format across all controllers:
 * Success: { success: true, message: "...", data: {...} }
 * Error:   { success: false, message: "...", errors: [...] }
 */

export const successResponse = (res, data = null, message = "Success", statusCode = 200) => {
    return res.status(statusCode).json({
        success: true,
        message,
        data
    });
};

export const errorResponse = (res, message = "Something went wrong", statusCode = 500, errors = null) => {
    const responsePayload = {
        success: false,
        message
    };

    if (errors) {
        responsePayload.errors = errors;
    }

    return res.status(statusCode).json(responsePayload);
};
