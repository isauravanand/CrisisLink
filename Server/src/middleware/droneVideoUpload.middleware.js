import multer from "multer";
import path from "path";
import fs from "fs";

// Ensure destination upload directory exists
const uploadDir = path.join(process.cwd(), "uploads", "drone-videos");
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Storage Configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        const ext = path.extname(file.originalname).toLowerCase() || ".mp4";
        cb(null, `drone-video-${uniqueSuffix}${ext}`);
    }
});

// Allowed Video MIME Types & Extensions
const ALLOWED_MIME_TYPES = ["video/mp4", "video/quicktime", "video/webm", "video/x-matroska"];
const ALLOWED_EXTENSIONS = [".mp4", ".mov", ".webm", ".mkv"];

// File Filter Function
const fileFilter = (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const mime = file.mimetype.toLowerCase();

    if (ALLOWED_MIME_TYPES.includes(mime) || ALLOWED_EXTENSIONS.includes(ext)) {
        cb(null, true);
    } else {
        const error = new Error("Invalid video file format. Allowed formats: MP4, MOV, WEBM.");
        error.statusCode = 400;
        cb(error, false);
    }
};

const maxVideoSize = parseInt(process.env.MAX_VIDEO_SIZE, 10) || 100 * 1024 * 1024; // Default 100 MB

export const uploadDroneVideoFile = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: maxVideoSize
    }
});

export default uploadDroneVideoFile;
