import {
    createRecord,
    findRecords,
    findRecordById,
    updateRecordById,
    generateCaseId
} from "../utils/fileStorage.js";
import { logCaseEvent } from "./timeline.service.js";

/**
 * Create a new Missing Person case
 */
export const createMissingPersonCase = async (data) => {
    const caseId = generateCaseId();

    const missingPerson = createRecord("missing_persons", {
        ...data,
        caseId,
        status: "ACTIVE"
    });

    // Log CASE_CREATED event
    await logCaseEvent({
        caseId: missingPerson.caseId,
        caseType: "MISSING_PERSON",
        eventType: "CASE_CREATED",
        description: `Missing person report created for ${missingPerson.name} (Age ${missingPerson.age}).`,
        metadata: { missingPersonId: missingPerson._id, lastSeenLocation: missingPerson.lastSeenLocation }
    });

    return missingPerson;
};

/**
 * Fetch all missing person cases with pagination, status filter, and sorting
 */
export const getAllMissingPersons = async (queryParams = {}) => {
    const page = Math.max(1, parseInt(queryParams.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(queryParams.limit, 10) || 20));

    const statusFilter = queryParams.status ? queryParams.status.toUpperCase() : null;
    const sortField = queryParams.sort === "name" ? "name" : "createdAt";
    const sortOrder = queryParams.order === "asc" ? "asc" : "desc";

    const filterFn = (rec) => {
        if (statusFilter && rec.status !== statusFilter) {
            return false;
        }
        return true;
    };

    const { records: cases, total } = findRecords("missing_persons", filterFn, {
        page,
        limit,
        sortField,
        sortOrder
    });

    return {
        cases,
        pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit) || 1
        }
    };
};

/**
 * Fetch active missing person cases
 */
export const getActiveMissingPersons = async (queryParams = {}) => {
    return getAllMissingPersons({
        ...queryParams,
        status: "ACTIVE"
    });
};

/**
 * Fetch single missing person case by ID or Case ID
 */
export const getMissingPersonById = async (identifier) => {
    const caseRecord = findRecordById("missing_persons", identifier);
    if (!caseRecord) {
        const error = new Error(`Missing person case '${identifier}' not found`);
        error.statusCode = 404;
        throw error;
    }

    return caseRecord;
};

/**
 * Update status of a missing person case
 */
export const updateMissingPersonStatus = async (id, newStatus) => {
    const allowedStatuses = ["ACTIVE", "POSSIBLE_MATCH", "FOUND", "CLOSED"];
    const normalizedStatus = (newStatus || "").toUpperCase();

    if (!allowedStatuses.includes(normalizedStatus)) {
        const error = new Error(`Invalid status '${newStatus}'. Allowed: ${allowedStatuses.join(", ")}`);
        error.statusCode = 400;
        throw error;
    }

    const updatedCase = updateRecordById("missing_persons", id, { status: normalizedStatus });
    if (!updatedCase) {
        const error = new Error(`Missing person case '${id}' not found`);
        error.statusCode = 404;
        throw error;
    }

    // Log CASE_STATUS_CHANGED event
    await logCaseEvent({
        caseId: updatedCase.caseId,
        caseType: "MISSING_PERSON",
        eventType: "CASE_STATUS_CHANGED",
        description: `Case status changed to ${normalizedStatus}.`,
        metadata: { missingPersonId: updatedCase._id, status: normalizedStatus }
    });

    return updatedCase;
};

export default {
    createMissingPersonCase,
    getAllMissingPersons,
    getActiveMissingPersons,
    getMissingPersonById,
    updateMissingPersonStatus
};

