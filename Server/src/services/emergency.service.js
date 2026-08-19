import Emergency from "../models/Emergency.js";
import { EmergencyAIService } from "./ai/emergencyAI.service.js";
import geminiService from "./ai/gemini.service.js";
import { PriorityService } from "./priority/priority.service.js";
import {
    generateCaseId,
    generateTrackingCode,
    hashTrackingCode,
    verifyTrackingCode,
    generateTrackingSessionToken,
    verifyTrackingSessionToken,
    getPublicStatusMessage
} from "../utils/tracking.util.js";

const ACTIVE_STATUSES = ["REPORTED", "INVESTIGATING", "IN_PROGRESS"];
const RESOLVED_STATUSES = ["RESOLVED", "DISMISSED"];

/**
 * Heuristic fallback parser when AI is unavailable or fails
 */
const getFallbackAIAnalysis = (description = "", emergencyType = "other", victimCount = 1) => {
    const text = description.toLowerCase();

    return {
        emergencyType: emergencyType ? emergencyType.toLowerCase() : "other",
        victimCount: victimCount || 1,
        immediateDanger: text.includes("danger") || text.includes("trapped") || text.includes("flooding") || text.includes("fire"),
        elderly: text.includes("elderly") || text.includes("grandmother") || text.includes("grandfather") || text.includes("senior"),
        child: text.includes("child") || text.includes("baby") || text.includes("kid"),
        mobilityIssue: text.includes("cannot walk") || text.includes("wheelchair") || text.includes("disabled") || text.includes("immobile"),
        injury: text.includes("injury") || text.includes("injured") || text.includes("hurt"),
        bleeding: text.includes("bleeding") || text.includes("blood"),
        trapped: text.includes("trapped") || text.includes("stuck") || text.includes("locked"),
        waterRising: text.includes("rising water") || text.includes("water rising") || text.includes("flood"),
        summary: description || "Report submitted (Fallback triage processing).",
        aiStatus: "SKIPPED",
        analyzedAt: new Date()
    };
};

/**
 * Service class encapsulating business logic for Emergency module
 */
export class EmergencyService {
    /**
     * Create a new emergency report with AI analysis, priority calculation, Case ID and Tracking Code
     */
    static async createEmergency(data) {
        let aiAnalysis = {};

        // Step 1 & 2: Run AI emergency analysis if Gemini is configured
        if (geminiService.isConfigured()) {
            try {
                const aiResult = await EmergencyAIService.analyzeEmergency(data);
                aiAnalysis = {
                    ...aiResult,
                    aiStatus: "SUCCESS",
                    analyzedAt: new Date()
                };
            } catch (error) {
                console.error(`[EmergencyService] AI Analysis warning: ${error.message}`);
                aiAnalysis = {
                    ...getFallbackAIAnalysis(data.description, data.emergencyType, data.victimCount),
                    aiStatus: "FAILED",
                    errorMessage: error.message
                };
            }
        } else {
            console.log("[EmergencyService] Gemini API key not set. Using rule-based fallback triage.");
            aiAnalysis = getFallbackAIAnalysis(data.description, data.emergencyType, data.victimCount);
        }

        // Step 2.5: Generate automated AI medical & injury reply for the user
        const photoUrl = data.photoUrl || data.injuryPhotoUrl || "";
        const aiAutomatedReply = await EmergencyAIService.generateAutomatedInjuryReply(
            data.description,
            Boolean(photoUrl && photoUrl.length > 0)
        );

        // Step 3: Calculate priority score and level using deterministic priority engine
        const victimCount = data.victimCount !== undefined ? data.victimCount : aiAnalysis.victimCount;
        const priorityResult = PriorityService.calculatePriority(aiAnalysis, victimCount);

        // Normalize emergencyType enum for database persistence
        const rawType = (aiAnalysis.emergencyType || data.emergencyType || "OTHER").toUpperCase();
        const validTypes = ["FIRE", "MEDICAL", "FLOOD", "EARTHQUAKE", "ACCIDENT", "TRAIL_SEARCH", "OTHER"];
        const normalizedEmergencyType = validTypes.includes(rawType) ? rawType : "OTHER";

        // Step 4: Generate unique Case ID and cryptographically secure Tracking Code
        const caseId = generateCaseId();
        const rawTrackingCode = generateTrackingCode();
        const trackingTokenHash = hashTrackingCode(rawTrackingCode);

        // Step 5: Construct and save Emergency document
        const emergencyData = {
            caseId,
            trackingTokenHash,
            trackingTokenCreatedAt: new Date(),
            description: data.description,
            emergencyType: normalizedEmergencyType,
            victimCount,
            location: {
                latitude: data.location ? Number(data.location.latitude) || 28.6139 : 28.6139,
                longitude: data.location ? Number(data.location.longitude) || 77.2090 : 77.2090,
                address: data.location ? data.location.address || "" : ""
            },
            photoUrl,
            injuryPhotoUrl: photoUrl,
            priorityScore: priorityResult.priorityScore,
            priorityLevel: priorityResult.priorityLevel,
            status: data.status || "REPORTED",
            aiAutomatedReply,
            aiAnalysis
        };

        const emergency = new Emergency(emergencyData);
        const savedEmergency = await emergency.save();

        // Attach raw tracking code ONLY once to response object for initial display
        const responseData = savedEmergency.toObject();
        responseData.trackingCode = rawTrackingCode;
        delete responseData.trackingTokenHash; // Do not return hash

        return responseData;
    }

    /**
     * Authenticate and track public emergency incident with Case ID only
     */
    static async trackEmergency(caseId) {
        if (!caseId || typeof caseId !== "string") {
            const error = new Error("Case ID is required");
            error.statusCode = 400;
            throw error;
        }

        const cleanCaseId = caseId.trim().toUpperCase();

        const emergency = await Emergency.findOne({ caseId: cleanCaseId });

        if (!emergency) {
            const error = new Error("Invalid case ID.");
            error.statusCode = 404;
            throw error;
        }

        const sessionToken = generateTrackingSessionToken(emergency.caseId);

        return {
            caseId: emergency.caseId,
            status: emergency.status,
            priorityLevel: emergency.priorityLevel,
            emergencyType: emergency.emergencyType,
            description: emergency.description,
            assignedHospital: emergency.assignedHospital,
            createdAt: emergency.createdAt,
            updatedAt: emergency.updatedAt,
            publicMessage: getPublicStatusMessage(emergency.status),
            sessionToken
        };
    }

    /**
     * Fetch public incident tracking info using short-lived session token
     */
    static async getTrackedEmergencyBySession(sessionToken) {
        const caseId = verifyTrackingSessionToken(sessionToken);
        if (!caseId) {
            const error = new Error("Tracking session expired. Please enter tracking credentials again.");
            error.statusCode = 401;
            throw error;
        }

        const emergency = await Emergency.findOne({ caseId });
        if (!emergency) {
            const error = new Error("Incident not found.");
            error.statusCode = 404;
            throw error;
        }

        return {
            caseId: emergency.caseId,
            status: emergency.status,
            priorityLevel: emergency.priorityLevel,
            emergencyType: emergency.emergencyType,
            description: emergency.description,
            createdAt: emergency.createdAt,
            updatedAt: emergency.updatedAt,
            publicMessage: getPublicStatusMessage(emergency.status),
            sessionToken
        };
    }

    /**
     * Fetch all emergencies with whitelisted filtering, whitelisted sorting, and pagination
     */
    static async getAllEmergencies(queryParams = {}) {
        const {
            status,
            priorityLevel,
            emergencyType,
            page = 1,
            limit = 20,
            sortField = "priorityScore",
            sortOrder = -1
        } = queryParams;

        const filter = {};

        if (status) filter.status = status;
        if (priorityLevel) filter.priorityLevel = priorityLevel;
        if (emergencyType) filter.emergencyType = emergencyType;

        const pageNum = Math.max(1, parseInt(page, 10));
        const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10)));
        const skip = (pageNum - 1) * limitNum;

        // Build whitelisted sort object
        const sortOptions = {};
        sortOptions[sortField] = sortOrder;
        if (sortField !== "createdAt") {
            sortOptions.createdAt = -1; // Tie-breaker for equal priority scores
        }

        const [emergencies, total] = await Promise.all([
            Emergency.find(filter)
                .sort(sortOptions)
                .skip(skip)
                .limit(limitNum),
            Emergency.countDocuments(filter)
        ]);

        return {
            emergencies,
            pagination: {
                total,
                page: pageNum,
                limit: limitNum,
                totalPages: Math.ceil(total / limitNum) || 1
            }
        };
    }

    /**
     * Fetch active emergencies (status in REPORTED, INVESTIGATING, IN_PROGRESS)
     */
    static async getActiveEmergencies(queryParams = {}) {
        const {
            priorityLevel,
            emergencyType,
            page = 1,
            limit = 20
        } = queryParams;

        const filter = {
            status: { $in: ACTIVE_STATUSES }
        };

        if (priorityLevel) filter.priorityLevel = priorityLevel;
        if (emergencyType) filter.emergencyType = emergencyType;

        const pageNum = Math.max(1, parseInt(page, 10));
        const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10)));
        const skip = (pageNum - 1) * limitNum;

        const [emergencies, total] = await Promise.all([
            Emergency.find(filter)
                .sort({ priorityScore: -1, createdAt: -1 })
                .skip(skip)
                .limit(limitNum),
            Emergency.countDocuments(filter)
        ]);

        return {
            emergencies,
            pagination: {
                total,
                page: pageNum,
                limit: limitNum,
                totalPages: Math.ceil(total / limitNum) || 1
            }
        };
    }

    /**
     * Get aggregate statistics for responder dashboard using MongoDB aggregation pipeline
     */
    static async getEmergencyStats() {
        const statsPipeline = [
            {
                $facet: {
                    statusCounts: [
                        { $group: { _id: "$status", count: { $sum: 1 } } }
                    ],
                    priorityCounts: [
                        { $group: { _id: "$priorityLevel", count: { $sum: 1 } } }
                    ],
                    typeCounts: [
                        { $group: { _id: "$emergencyType", count: { $sum: 1 } } }
                    ],
                    totalCount: [
                        { $count: "count" }
                    ]
                }
            }
        ];

        const [aggregationResult] = await Emergency.aggregate(statsPipeline);

        const total = aggregationResult.totalCount[0] ? aggregationResult.totalCount[0].count : 0;

        let activeCount = 0;
        let resolvedCount = 0;
        const byStatus = {};

        aggregationResult.statusCounts.forEach((item) => {
            byStatus[item._id] = item.count;
            if (ACTIVE_STATUSES.includes(item._id)) {
                activeCount += item.count;
            } else if (RESOLVED_STATUSES.includes(item._id)) {
                resolvedCount += item.count;
            }
        });

        const priorityLevels = {
            critical: 0,
            high: 0,
            medium: 0,
            low: 0
        };

        aggregationResult.priorityCounts.forEach((item) => {
            if (item._id) {
                const key = item._id.toLowerCase();
                if (priorityLevels[key] !== undefined) {
                    priorityLevels[key] = item.count;
                }
            }
        });

        const byType = {
            FIRE: 0,
            MEDICAL: 0,
            FLOOD: 0,
            EARTHQUAKE: 0,
            ACCIDENT: 0,
            TRAIL_SEARCH: 0,
            OTHER: 0
        };

        aggregationResult.typeCounts.forEach((item) => {
            if (item._id) {
                const upper = item._id.toUpperCase();
                byType[upper] = item.count;
            }
        });

        return {
            total,
            active: activeCount,
            resolved: resolvedCount,
            critical: priorityLevels.critical,
            high: priorityLevels.high,
            medium: priorityLevels.medium,
            low: priorityLevels.low,
            byType
        };
    }

    /**
     * Fetch a single emergency by ID
     */
    static async getEmergencyById(id) {
        const emergency = await Emergency.findById(id);
        if (!emergency) {
            const error = new Error(`Emergency not found with ID: ${id}`);
            error.statusCode = 404;
            throw error;
        }
        return emergency;
    }

    /**
     * Update status of an emergency by ID with transition checking
     */
    static async updateEmergencyStatus(id, newStatus) {
        const emergency = await Emergency.findById(id);
        if (!emergency) {
            const error = new Error(`Emergency not found with ID: ${id}`);
            error.statusCode = 404;
            throw error;
        }

        // Status transition safety check
        if (RESOLVED_STATUSES.includes(emergency.status) && ACTIVE_STATUSES.includes(newStatus)) {
            const error = new Error(`Cannot transition a closed emergency (${emergency.status}) back to active status (${newStatus})`);
            error.statusCode = 400;
            throw error;
        }

        emergency.status = newStatus;
        return await emergency.save();
    }
}

export default EmergencyService;
