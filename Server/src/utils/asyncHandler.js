/**
 * Async Handler Wrapper
 * Eliminates repetitive try-catch blocks in controllers.
 * Passes any rejected promise directly to Express error handling middleware.
 */
export const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};
