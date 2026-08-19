import mongoose from "mongoose";

const personDetectionSchema = new mongoose.Schema(
    {
        droneVideoId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "DroneVideo",
            required: [true, "DroneVideo reference is required"],
            index: true
        },
        missingPersonId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "MissingPerson",
            default: null,
            index: true
        },
        frameUrl: {
            type: String,
            required: [true, "Frame image URL is required"]
        },
        timestampSeconds: {
            type: Number,
            required: [true, "Timestamp in seconds is required"]
        },
        frameNumber: {
            type: Number,
            required: [true, "Frame index number is required"]
        },
        confidence: {
            type: Number,
            required: [true, "Detection confidence score is required"],
            min: 0,
            max: 1
        },
        boundingBox: {
            x: { type: Number, required: true },
            y: { type: Number, required: true },
            width: { type: Number, required: true },
            height: { type: Number, required: true }
        }
    },
    {
        timestamps: true
    }
);

// Index for sorting detections by confidence descending or timestamp ascending
personDetectionSchema.index({ droneVideoId: 1, confidence: -1 });
personDetectionSchema.index({ droneVideoId: 1, timestampSeconds: 1 });

export const PersonDetection = mongoose.model("PersonDetection", personDetectionSchema);
export default PersonDetection;
