import fs from "fs";
import path from "path";
import crypto from "crypto";

const DATA_DIR = path.join(process.cwd(), "src", "data");

const ensureDataDir = () => {
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    }
};

const getFilePath = (fileName) => {
    ensureDataDir();
    return path.join(DATA_DIR, fileName.endsWith(".json") ? fileName : `${fileName}.json`);
};

export const readData = (fileName) => {
    const filePath = getFilePath(fileName);
    if (!fs.existsSync(filePath)) {
        return [];
    }
    try {
        const content = fs.readFileSync(filePath, "utf-8");
        return JSON.parse(content || "[]");
    } catch (err) {
        console.error(`[FileStorage] Error reading ${fileName}:`, err);
        return [];
    }
};

export const writeData = (fileName, data) => {
    const filePath = getFilePath(fileName);
    try {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
    } catch (err) {
        console.error(`[FileStorage] Error writing ${fileName}:`, err);
    }
};

export const generateId = (prefix = "rec") => {
    return `${prefix}_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
};

export const generateCaseId = () => {
    const records = readData("missing_persons");
    const currentYear = new Date().getFullYear();
    const prefix = `MP-${currentYear}-`;

    let maxSeq = 0;
    records.forEach(r => {
        if (r.caseId && r.caseId.startsWith(prefix)) {
            const parts = r.caseId.split("-");
            const num = parseInt(parts[2], 10);
            if (!isNaN(num) && num > maxSeq) {
                maxSeq = num;
            }
        }
    });

    return `${prefix}${String(maxSeq + 1).padStart(4, "0")}`;
};

export const createRecord = (fileName, recordData) => {
    const records = readData(fileName);
    const id = recordData._id || generateId(fileName.replace(".json", ""));
    const now = new Date().toISOString();

    const newRecord = {
        _id: id,
        ...recordData,
        createdAt: recordData.createdAt || now,
        updatedAt: now
    };

    records.unshift(newRecord);
    writeData(fileName, records);
    return newRecord;
};

export const findRecords = (fileName, filterFn = () => true, options = {}) => {
    let records = readData(fileName).filter(filterFn);

    if (options.sortField) {
        const order = options.sortOrder === "asc" || options.sortOrder === 1 ? 1 : -1;
        records.sort((a, b) => {
            const valA = a[options.sortField] || "";
            const valB = b[options.sortField] || "";
            if (valA < valB) return -1 * order;
            if (valA > valB) return 1 * order;
            return 0;
        });
    }

    const total = records.length;

    if (options.page && options.limit) {
        const page = Math.max(1, parseInt(options.page, 10));
        const limit = Math.max(1, parseInt(options.limit, 10));
        const skip = (page - 1) * limit;
        records = records.slice(skip, skip + limit);
    }

    return { records, total };
};

export const findRecordById = (fileName, id) => {
    const records = readData(fileName);
    return records.find(r => r._id === id || r.caseId === id || (typeof id === "string" && r._id?.toString() === id)) || null;
};

export const updateRecordById = (fileName, id, updateData) => {
    const records = readData(fileName);
    const index = records.findIndex(r => r._id === id || r.caseId === id || (typeof id === "string" && r._id?.toString() === id));

    if (index === -1) return null;

    records[index] = {
        ...records[index],
        ...updateData,
        updatedAt: new Date().toISOString()
    };

    writeData(fileName, records);
    return records[index];
};

export const deleteRecordById = (fileName, id) => {
    let records = readData(fileName);
    const initialLen = records.length;
    records = records.filter(r => r._id !== id && r.caseId !== id);
    if (records.length !== initialLen) {
        writeData(fileName, records);
        return true;
    }
    return false;
};

export default {
    readData,
    writeData,
    generateId,
    generateCaseId,
    createRecord,
    findRecords,
    findRecordById,
    updateRecordById,
    deleteRecordById
};
