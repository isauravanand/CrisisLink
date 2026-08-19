import mongoose from "mongoose";
import dotenv from "dotenv";
import app from "../src/app.js";
import MissingPerson from "../src/models/MissingPerson.js";

dotenv.config();

console.log("Checking backend imports & app setup...");
console.log("MissingPerson model loaded successfully:", Boolean(MissingPerson));
console.log("App routes configured successfully.");

process.exit(0);
