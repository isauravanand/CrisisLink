import mongoose from "mongoose";

const adminSchema = new mongoose.Schema(
    {
        email: {
            type: String,
            required: [true, "Admin email is required"],
            unique: true,
            lowercase: true,
            trim: true,
            index: true
        },
        passwordHash: {
            type: String,
            required: [true, "Password hash is required"]
        },
        role: {
            type: String,
            enum: {
                values: ["ADMIN"],
                message: "Role must be ADMIN"
            },
            default: "ADMIN"
        }
    },
    {
        timestamps: true
    }
);

export const Admin = mongoose.model("Admin", adminSchema);
export default Admin;
