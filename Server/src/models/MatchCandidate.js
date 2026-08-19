import mongoose from "mongoose";

const matchCandidateSchema = new mongoose.Schema(
    {
        missingPersonId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "MissingPerson",
            required: [true, "Missing person reference is required"],
            index: true
        },
        droneVideoId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "DroneVideo",
            default: null,
            index: true
        },
        personDetectionId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "PersonDetection",
            default: null
        },
        source: {
            type: String,
            enum: ["UPLOADED_VIDEO", "LIVE_CAMERA"],
            default: "UPLOADED_VIDEO"
        },
        sightingLocation: {
            latitude: { type: Number, default: null },
            longitude: { type: Number, default: null },
            address: { type: String, default: "" }
        },
        frameUrl: {
            type: String,
            required: [true, "Detection frame image URL is required"]
        },
        personCropUrl: {
            type: String,
            required: [true, "Person crop image URL is required"]
        },
        timestampSeconds: {
            type: Number,
            required: [true, "Timestamp in seconds is required"],
            default: 0
        },
        similarityScore: {
            type: Number,
            required: [true, "Visual similarity score is required"],
            min: 0,
            max: 1
        },
        status: {
            type: String,
            enum: {
                values: ["PENDING_REVIEW", "CONFIRMED", "REJECTED"],
                message: "Status must be PENDING_REVIEW, CONFIRMED, or REJECTED"
            },
            default: "PENDING_REVIEW",
            index: true
        }
    },
    {
        timestamps: true
    }
);

// Index for retrieving ranked candidate matches by similarity score descending
matchCandidateSchema.index({ missingPersonId: 1, similarityScore: -1 });

export const MatchCandidate = mongoose.model("MatchCandidate", matchCandidateSchema);
export default MatchCandidate;
