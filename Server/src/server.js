import dotenv from "dotenv";
import app from "./app.js";
import connectDB from "./config/db.js";

// Load environment variables from .env file
dotenv.config();

const PORT = process.env.PORT || 5000;

// Connect to Database & Start Server
const startServer = async () => {
    // Initialize MongoDB connection
    await connectDB();

    app.listen(PORT, () => {
        console.log(`=================================`);
        console.log(`  LifeLine AI Server Running     `);
        console.log(`  Port: ${PORT}                  `);
        console.log(`  Mode: ${process.env.NODE_ENV || "development"}`);
        console.log(`=================================`);
    });
};

startServer();