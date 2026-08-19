import multer from "multer";
import path from "path";
import fs from "fs";

// Ensure destination upload directories exist
const missingPersonDir = path.join(process.cwd(), "uploads", "missing-persons");
if (!fs.existsSync(missingPersonDir)) {
    fs.mkdirSync(missingPersonDir, { recursive: true });
}

const injuriesDir = path.join(process.cwd(), "uploads", "injuries");
if (!fs.existsSync(injuriesDir)) {
    fs.mkdirSync(injuriesDir, { recursive: true });
}

// Allowed Image MIME Types & Extensions
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"];

// File Filter Function
const fileFilter = (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const mime = file.mimetype.toLowerCase();

    if (ALLOWED_MIME_TYPES.includes(mime) && ALLOWED_EXTENSIONS.includes(ext)) {
        cb(null, true);
    } else {
        const error = new Error("Invalid photo file format. Only JPEG, PNG, and WEBP image files are allowed.");
        error.statusCode = 400;
        cb(error, false);
    }
};

// Storage Configuration for Missing Persons
const storageMissingPerson = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, missingPersonDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        const ext = path.extname(file.originalname).toLowerCase() || ".jpg";
        cb(null, `missing-person-${uniqueSuffix}${ext}`);
    }
});

// Storage Configuration for Injury Uploads
const storageInjury = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, injuriesDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        const ext = path.extname(file.originalname).toLowerCase() || ".jpg";
        cb(null, `injury-${uniqueSuffix}${ext}`);
    }
});

export const uploadMissingPersonPhoto = multer({
    storage: storageMissingPerson,
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 }
});

export const uploadInjuryPhoto = multer({
    storage: storageInjury,
    fileFilter,
    limits: { fileSize: 10 * 1024 * 1024 }
});

export default uploadMissingPersonPhoto;
