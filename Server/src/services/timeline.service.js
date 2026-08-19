import { createRecord, findRecords } from "../utils/fileStorage.js";

/**
 * Log a new chronological audit event for a case
 */
export const logCaseEvent = async ({
    caseId,
    caseType = "MISSING_PERSON",
    eventType,
    description,
    createdBy = "SYSTEM",
    metadata = {}
}) => {
    if (!caseId || !eventType || !description) {
        console.warn("[TimelineService] Missing required event fields for logCaseEvent");
        return null;
    }

    try {
        const newEvent = createRecord("timeline_events", {
            caseId: caseId.toString(),
            caseType,
            eventType,
            description,
            createdBy,
            metadata,
            timestamp: new Date().toISOString()
        });
        return newEvent;
    } catch (err) {
        console.error("[TimelineService] Failed to log case event:", err);
        return null;
    }
};

/**
 * Retrieve chronological case events for a specific case ID (oldest -> newest)
 */
export const getCaseTimeline = async (caseId) => {
    if (!caseId) return [];

    const { records } = findRecords("timeline_events", (e) => e.caseId === caseId.toString(), {
        sortField: "timestamp",
        sortOrder: "asc"
    });

    return records;
};

export default {
    logCaseEvent,
    getCaseTimeline
};

