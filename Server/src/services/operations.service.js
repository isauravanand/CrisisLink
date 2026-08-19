import Emergency from "../models/Emergency.js";
import { findRecords, findRecordById, readData } from "../utils/fileStorage.js";
import { HOSPITAL_REGISTRY } from "./hospital.service.js";

/**
 * Retrieve normalized operational points with valid GPS coordinates for the Operations Map
 */
export const getOperationsMapPoints = async () => {
    let emergencies = [];
    try {
        emergencies = await Emergency.find().lean();
    } catch {
        emergencies = [];
    }

    const { records: missingPersons } = findRecords("missing_persons");
    const { records: droneVideos } = findRecords("drone_videos");
    const { records: rawMatchCandidates } = findRecords("match_candidates");

    const matchCandidates = rawMatchCandidates.map(mc => {
        const mp = findRecordById("missing_persons", mc.missingPersonId);
        return {
            ...mc,
            missingPersonId: mp ? {
                caseId: mp.caseId,
                name: mp.name,
                photoUrl: mp.photoUrl,
                status: mp.status,
                lastSeenLocation: mp.lastSeenLocation
            } : null
        };
    });

    const mapPoints = [];

    // 1. Emergency Incidents
    for (const em of emergencies) {
        if (em.location && typeof em.location.latitude === "number" && typeof em.location.longitude === "number") {
            mapPoints.push({
                id: em._id.toString(),
                pointType: "EMERGENCY",
                category: "EMERGENCIES",
                title: `EMERGENCY: ${em.emergencyType}`,
                name: em.description,
                caseId: em._id.toString(),
                latitude: em.location.latitude,
                longitude: em.location.longitude,
                address: em.location.address || "",
                status: em.status,
                priorityLevel: em.priorityLevel,
                priorityScore: em.priorityScore,
                victimCount: em.victimCount,
                assignedHospital: em.assignedHospital || null,
                createdAt: em.createdAt
            });
        }
    }

    // 2. Hospitals & Emergency Facilities
    for (const hosp of HOSPITAL_REGISTRY) {
        mapPoints.push({
            id: hosp.id,
            pointType: "HOSPITAL",
            category: "HOSPITALS",
            title: `HOSPITAL: ${hosp.name}`,
            name: hosp.name,
            caseId: hosp.traumaLevel,
            latitude: hosp.latitude,
            longitude: hosp.longitude,
            address: hosp.address,
            status: hosp.capacityStatus,
            contactPhone: hosp.contactPhone,
            icuBedsAvailable: hosp.icuBedsAvailable,
            createdAt: new Date().toISOString()
        });
    }

    // 2. Missing Person Last Known Locations
    for (const mp of missingPersons) {
        if (mp.lastSeenLocation && typeof mp.lastSeenLocation.latitude === "number" && typeof mp.lastSeenLocation.longitude === "number") {
            mapPoints.push({
                id: mp._id.toString(),
                pointType: "MISSING_PERSON",
                category: "MISSING_PERSONS",
                title: `LAST KNOWN LOCATION: ${mp.name}`,
                name: mp.name,
                caseId: mp.caseId,
                latitude: mp.lastSeenLocation.latitude,
                longitude: mp.lastSeenLocation.longitude,
                address: mp.lastSeenLocation.address || "",
                status: mp.status,
                age: mp.age,
                gender: mp.gender,
                photoUrl: mp.photoUrl,
                createdAt: mp.createdAt
            });
        }
    }

    // 3. Drone Searches
    for (const dv of droneVideos) {
        if (dv.searchLocation && typeof dv.searchLocation.latitude === "number" && typeof dv.searchLocation.longitude === "number") {
            mapPoints.push({
                id: dv._id.toString(),
                pointType: "DRONE_SEARCH",
                category: "DRONE_SEARCHES",
                title: `DRONE FOOTAGE: ${dv.filename}`,
                name: dv.filename,
                caseId: dv.caseId || "",
                latitude: dv.searchLocation.latitude,
                longitude: dv.searchLocation.longitude,
                address: dv.searchLocation.address || "",
                status: dv.status,
                personDetectionsCount: dv.personDetectionsCount,
                createdAt: dv.createdAt
            });
        }
    }

    // 4. Match Candidate Sightings (Possible Sightings / Confirmed Sightings)
    for (const mc of matchCandidates) {
        if (mc.missingPersonId && mc.missingPersonId.lastSeenLocation && typeof mc.missingPersonId.lastSeenLocation.latitude === "number") {
            const lat = mc.missingPersonId.lastSeenLocation.latitude + (Math.random() - 0.5) * 0.005;
            const lng = mc.missingPersonId.lastSeenLocation.longitude + (Math.random() - 0.5) * 0.005;
            const isConfirmed = mc.status === "CONFIRMED";

            mapPoints.push({
                id: mc._id.toString(),
                pointType: isConfirmed ? "CONFIRMED" : "POSSIBLE_MATCH",
                category: isConfirmed ? "CONFIRMED" : "POSSIBLE_MATCHES",
                title: isConfirmed ? `CONFIRMED SIGHTING: ${mc.missingPersonId.name}` : `POSSIBLE SIGHTING (${Math.round(mc.similarityScore * 100)}%)`,
                name: mc.missingPersonId.name,
                caseId: mc.missingPersonId.caseId,
                latitude: lat,
                longitude: lng,
                address: mc.missingPersonId.lastSeenLocation.address || "",
                status: mc.status,
                similarityScore: mc.similarityScore,
                timestampSeconds: mc.timestampSeconds,
                frameUrl: mc.frameUrl,
                personCropUrl: mc.personCropUrl,
                photoUrl: mc.missingPersonId.photoUrl,
                createdAt: mc.createdAt
            });
        }
    }

    return mapPoints;
};

/**
 * Retrieve chronological location history & sightings for a missing person
 */
export const getMissingPersonSightings = async (missingPersonId) => {
    const mpCase = findRecordById("missing_persons", missingPersonId);
    if (!mpCase) {
        const err = new Error("Missing person record not found");
        err.statusCode = 404;
        throw err;
    }

    const { records: rawMatches } = findRecords("match_candidates", mc => mc.missingPersonId === missingPersonId, {
        sortField: "createdAt",
        sortOrder: "asc"
    });

    const matches = rawMatches.map(mc => {
        const droneVideo = findRecordById("drone_videos", mc.droneVideoId);
        return {
            ...mc,
            droneVideoId: droneVideo ? { filename: droneVideo.filename } : null
        };
    });

    const history = [];

    // 1. Last Known Location
    if (mpCase.lastSeenLocation) {
        history.push({
            id: `lkl_${mpCase._id}`,
            sightingType: "LAST_KNOWN_LOCATION",
            label: "LAST KNOWN LOCATION",
            location: mpCase.lastSeenLocation,
            timestamp: mpCase.lastSeenAt,
            description: `Reported last seen location.`
        });
    }

    // 2. Candidate Sightings
    for (const mc of matches) {
        const isConfirmed = mc.status === "CONFIRMED";
        history.push({
            id: mc._id.toString(),
            sightingType: isConfirmed ? "CONFIRMED_SIGHTING" : "POSSIBLE_SIGHTING",
            label: isConfirmed ? "CONFIRMED SIGHTING" : "POSSIBLE SIGHTING",
            similarityScore: mc.similarityScore,
            timestampSeconds: mc.timestampSeconds,
            frameUrl: mc.frameUrl,
            personCropUrl: mc.personCropUrl,
            status: mc.status,
            timestamp: mc.createdAt,
            description: `Drone detection sighting (Similarity: ${mc.similarityScore}).`
        });
    }

    return history;
};

export default {
    getOperationsMapPoints,
    getMissingPersonSightings
};

