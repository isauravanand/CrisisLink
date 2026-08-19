import mongoose from "mongoose";

const missingPersonSchema = new mongoose.Schema(
    {
        caseId: {
            type: String,
            required: [true, "Case ID is required"],
            unique: true,
            trim: true,
            index: true
        },
        name: {
            type: String,
            required: [true, "Full name of missing person is required"],
            trim: true
        },
        age: {
            type: Number,
            required: [true, "Age is required"],
            min: [1, "Age must be at least 1"],
            max: [120, "Age cannot exceed 120"]
        },
        gender: {
            type: String,
            enum: {
                values: ["Male", "Female", "Other", "Prefer not to say"],
                message: "Gender must be Male, Female, Other, or Prefer not to say"
            },
            default: "Prefer not to say"
        },
        photoUrl: {
            type: String,
            required: [true, "Photograph URL is required"]
        },
        description: {
            type: String,
            trim: true,
            default: ""
        },
        lastSeenLocation: {
            latitude: {
                type: Number,
                required: [true, "Last seen latitude is required"],
                min: [-90, "Latitude must be between -90 and 90"],
                max: [90, "Latitude must be between -90 and 90"]
            },
            longitude: {
                type: Number,
                required: [true, "Last seen longitude is required"],
                min: [-180, "Longitude must be between -180 and 180"],
                max: [180, "Longitude must be between -180 and 180"]
            },
            address: {
                type: String,
                trim: true,
                default: ""
            }
        },
        lastSeenAt: {
            type: Date,
            required: [true, "Last seen date and time is required"]
        },
        clothingDescription: {
            type: String,
            trim: true,
            default: ""
        },
        identifyingFeatures: {
            type: String,
            trim: true,
            default: ""
        },
        status: {
            type: String,
            enum: {
                values: ["ACTIVE", "POSSIBLE_MATCH", "FOUND", "CLOSED"],
                message: "Status must be ACTIVE, POSSIBLE_MATCH, FOUND, or CLOSED"
            },
            default: "ACTIVE",
            index: true
        },
        contactName: {
            type: String,
            trim: true,
            default: ""
        },
        contactPhone: {
            type: String,
            trim: true,
            default: ""
        },
        trackingTokenHash: {
            type: String,
            default: null
        },
        trackingTokenCreatedAt: {
            type: Date,
            default: null
        }
    },
    {
        timestamps: true
    }
);

// Compound index for querying active cases sorted by creation time
missingPersonSchema.index({ status: 1, createdAt: -1 });

export const MissingPerson = mongoose.model("MissingPerson", missingPersonSchema);
export default MissingPerson;
