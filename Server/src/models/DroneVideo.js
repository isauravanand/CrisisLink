import mongoose from "mongoose";

const droneVideoSchema = new mongoose.Schema(
    {
        caseId: {
            type: String,
            trim: true,
            default: ""
        },
        missingPersonId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "MissingPerson",
            default: null,
            index: true
        },
        videoUrl: {
            type: String,
            required: [true, "Video URL is required"]
        },
        videoPublicId: {
            type: String,
            default: ""
        },
        filename: {
            type: String,
            required: [true, "Original filename is required"],
            trim: true
        },
        searchLocation: {
            latitude: { type: Number, default: null },
            longitude: { type: Number, default: null },
            address: { type: String, trim: true, default: "" }
        },

        status: {
            type: String,
            enum: {
                values: ["UPLOADED", "PROCESSING", "COMPLETED", "FAILED"],
                message: "Status must be UPLOADED, PROCESSING, COMPLETED, or FAILED"
            },
            default: "UPLOADED",
            index: true
        },
        duration: {
            type: Number,
            default: 0
        },
        fileSize: {
            type: Number,
            default: 0
        },
        totalFrames: {
            type: Number,
            default: 0
        },
        processedFrames: {
            type: Number,
            default: 0
        },
        personDetectionsCount: {
            type: Number,
            default: 0
        },
        error: {
            type: String,
            default: null
        },
        processingStartedAt: {
            type: Date,
            default: null
        },
        processingCompletedAt: {
            type: Date,
            default: null
        }
    },
    {
        timestamps: true
    }
);

droneVideoSchema.index({ createdAt: -1 });

export const DroneVideo = mongoose.model("DroneVideo", droneVideoSchema);
export default DroneVideo;
