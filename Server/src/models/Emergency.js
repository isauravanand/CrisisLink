import mongoose from "mongoose";

const EmergencySchema = new mongoose.Schema(
    {
        caseId: {
            type: String,
            unique: true,
            sparse: true,
            trim: true,
            index: true
        },
        trackingTokenHash: {
            type: String,
            default: null
        },
        trackingTokenCreatedAt: {
            type: Date,
            default: null
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
        description: {
            type: String,
            required: [true, "Emergency description is required"],
            trim: true
        },
        emergencyType: {
            type: String,
            enum: {
                values: ["FIRE", "MEDICAL", "FLOOD", "EARTHQUAKE", "ACCIDENT", "TRAIL_SEARCH", "OTHER", "fire", "medical", "flood", "earthquake", "accident", "trail_search", "other"],
                message: "{VALUE} is not a supported emergency type"
            },
            default: "OTHER"
        },
        victimCount: {
            type: Number,
            default: 1,
            min: [0, "Victim count cannot be negative"]
        },
        location: {
            latitude: {
                type: Number,
                required: [true, "Latitude is required"],
                min: [-90, "Latitude must be between -90 and 90"],
                max: [90, "Latitude must be between -90 and 90"]
            },
            longitude: {
                type: Number,
                required: [true, "Longitude is required"],
                min: [-180, "Longitude must be between -180 and 180"],
                max: [180, "Longitude must be between -180 and 180"]
            },
            address: {
                type: String,
                trim: true,
                default: ""
            }
        },
        priorityScore: {
            type: Number,
            default: 0,
            min: 0,
            max: 100
        },
        priorityLevel: {
            type: String,
            enum: {
                values: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
                message: "{VALUE} is not a valid priority level"
            },
            default: "MEDIUM"
        },
        status: {
            type: String,
            enum: {
                values: ["REPORTED", "INVESTIGATING", "IN_PROGRESS", "RESOLVED", "DISMISSED"],
                message: "{VALUE} is not a valid emergency status"
            },
            default: "REPORTED"
        },
        photoUrl: {
            type: String,
            default: ""
        },
        injuryPhotoUrl: {
            type: String,
            default: ""
        },
        // Automated AI reply generated upon injury upload & description analysis
        aiAutomatedReply: {
            triageLevel: { type: String, default: "MEDIUM" },
            injuryTitle: { type: String, default: "Injury & Emergency Assessment" },
            instructions: { type: [String], default: [] },
            doNotDo: { type: [String], default: [] },
            advice: { type: String, default: "" },
            summary: { type: String, default: "" },
            generatedAt: { type: Date, default: Date.now }
        },
        // AI-Driven Hospital Assignment
        assignedHospital: {
            hospitalId: { type: String, default: "" },
            name: { type: String, default: "" },
            traumaLevel: { type: String, default: "" },
            distanceKm: { type: Number, default: 0 },
            address: { type: String, default: "" },
            latitude: { type: Number, default: 0 },
            longitude: { type: Number, default: 0 },
            contactPhone: { type: String, default: "" },
            ambulanceUnit: { type: String, default: "" },
            aiReasoning: { type: String, default: "" },
            assignedAt: { type: Date, default: null }
        },
        // Extensible sub-document for AI processing pipeline & extracted flags
        aiAnalysis: {
            emergencyType: { type: String, default: "" },
            victimCount: { type: Number, default: 1 },
            immediateDanger: { type: Boolean, default: false },
            elderly: { type: Boolean, default: false },
            child: { type: Boolean, default: false },
            mobilityIssue: { type: Boolean, default: false },
            injury: { type: Boolean, default: false },
            bleeding: { type: Boolean, default: false },
            trapped: { type: Boolean, default: false },
            waterRising: { type: Boolean, default: false },
            summary: { type: String, default: "" },
            rawOutput: { type: mongoose.Schema.Types.Mixed, default: {} },
            analyzedAt: { type: Date, default: Date.now },
            aiStatus: { type: String, enum: ["SUCCESS", "FAILED", "SKIPPED"], default: "SKIPPED" }
        }
    },
    {
        timestamps: true
    }
);

// Compound indexing for dashboard queries, filtering, and priority sorting
EmergencySchema.index({ status: 1, priorityScore: -1, createdAt: -1 });
EmergencySchema.index({ priorityScore: -1, createdAt: -1 });
EmergencySchema.index({ emergencyType: 1, priorityScore: -1 });
EmergencySchema.index({ "location.latitude": 1, "location.longitude": 1 });

const Emergency = mongoose.model("Emergency", EmergencySchema);

export default Emergency;
