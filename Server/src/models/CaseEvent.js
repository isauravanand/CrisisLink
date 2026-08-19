import mongoose from "mongoose";

const caseEventSchema = new mongoose.Schema(
    {
        caseId: {
            type: String,
            required: [true, "Case ID reference is required"],
            index: true
        },
        caseType: {
            type: String,
            enum: {
                values: ["MISSING_PERSON", "EMERGENCY", "DRONE_VIDEO"],
                message: "caseType must be MISSING_PERSON, EMERGENCY, or DRONE_VIDEO"
            },
            default: "MISSING_PERSON",
            index: true
        },
        eventType: {
            type: String,
            enum: {
                values: [
                    "CASE_CREATED",
                    "RESPONDER_ASSIGNED",
                    "DRONE_VIDEO_UPLOADED",
                    "VIDEO_PROCESSING_STARTED",
                    "VIDEO_PROCESSING_COMPLETED",
                    "VISUAL_SEARCH_STARTED",
                    "LIVE_SEARCH_STARTED",
                    "LIVE_SEARCH_STOPPED",
                    "POSSIBLE_MATCH_CREATED",
                    "MATCH_CONFIRMED",
                    "MATCH_REJECTED",
                    "CASE_STATUS_CHANGED"
                ],
                message: "Invalid eventType"
            },
            required: [true, "eventType is required"],
            index: true
        },
        description: {
            type: String,
            required: [true, "Event description is required"],
            trim: true
        },
        timestamp: {
            type: Date,
            default: Date.now,
            index: true
        },
        createdBy: {
            type: String,
            default: "SYSTEM",
            trim: true
        },
        metadata: {
            type: mongoose.Schema.Types.Mixed,
            default: {}
        }
    },
    {
        timestamps: true
    }
);

// Index for chronological timeline retrieval (oldest to newest)
caseEventSchema.index({ caseId: 1, timestamp: 1 });

export const CaseEvent = mongoose.model("CaseEvent", caseEventSchema);
export default CaseEvent;
