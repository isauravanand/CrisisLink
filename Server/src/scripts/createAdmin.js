import dotenv from "dotenv";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import connectDB from "../config/db.js";
import Admin from "../models/Admin.js";

dotenv.config();

const createOrUpdateAdmin = async () => {
    try {
        const email = process.env.ADMIN_EMAIL;
        const password = process.env.ADMIN_PASSWORD;

        if (!email || !password) {
            console.error("ERROR: ADMIN_EMAIL and ADMIN_PASSWORD environment variables are required.");
            console.error("Please configure them in Server/.env before running npm run admin:create");
            process.exit(1);
        }

        await connectDB();

        const cleanEmail = email.trim().toLowerCase();
        let admin = await Admin.findOne({ email: cleanEmail });

        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(password, saltRounds);

        if (admin) {
            // Update passwordHash for existing admin account
            admin.passwordHash = passwordHash;
            admin.role = "ADMIN";
            await admin.save();
            console.log("\nAdmin account updated successfully.");
        } else {
            // Create new admin account
            admin = await Admin.create({
                email: cleanEmail,
                passwordHash,
                role: "ADMIN"
            });
            console.log("\nAdmin account created successfully.");
        }

        console.log("==================================================");
        console.log("Admin account ready:");
        console.log(admin.email);
        console.log("==================================================\n");

        await mongoose.connection.close();
        process.exit(0);
    } catch (error) {
        console.error("Failed to create/update admin account:", error);
        await mongoose.connection.close();
        process.exit(1);
    }
};

createOrUpdateAdmin();
