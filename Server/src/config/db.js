import mongoose from "mongoose";

/**
 * Connect to MongoDB using Mongoose connection URI
 */
const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGODB_URI);
        console.log(`[MongoDB] Connected successfully: ${conn.connection.host}`);
    } catch (error) {
        console.error(`[MongoDB] Connection Error: ${error.message}`);
        // Do not crash the entire process immediately in development if connection fails,
        // but log clearly so server startup issues can be diagnosed.
    }
};

export default connectDB;
