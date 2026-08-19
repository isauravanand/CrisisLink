import Emergency from "../models/Emergency.js";

// Regional Emergency Hospitals & Trauma Centers Registry
export const HOSPITAL_REGISTRY = [
    {
        id: "hosp_1",
        name: "AIIMS Central Apex Trauma Center",
        traumaLevel: "Level 1 Apex Trauma & Burn Center",
        traumaTier: 1,
        address: "Sri Aurobindo Marg, Ansari Nagar, New Delhi",
        latitude: 28.5672,
        longitude: 77.2100,
        contactPhone: "+91 11 2658 8500",
        ambulanceUnit: "ALS-CRITICAL-01",
        specialties: ["Multi-Organ Trauma", "Severe Hemorrhage", "Complex Surgery", "ICU Intensive Care"],
        capacityStatus: "OPERATIONAL_AVAILABLE",
        icuBedsAvailable: 14
    },
    {
        id: "hosp_2",
        name: "Safdarjung Emergency & Burn Care Hospital",
        traumaLevel: "Level 1 Emergency & Major Burn Unit",
        traumaTier: 1,
        address: "Ring Road, Opposite AIIMS, New Delhi",
        latitude: 28.5695,
        longitude: 77.2078,
        contactPhone: "+91 11 2616 5060",
        ambulanceUnit: "ALS-BURN-02",
        specialties: ["Thermal Burns", "Chemical Burns", "Emergency Resuscitation", "Trauma Care"],
        capacityStatus: "OPERATIONAL_AVAILABLE",
        icuBedsAvailable: 10
    },
    {
        id: "hosp_3",
        name: "Max Super Specialty Trauma & Cardiac Hub",
        traumaLevel: "Level 2 Cardiac & Emergency Surgery",
        traumaTier: 2,
        address: "1-2 Press Enclave Road, Saket, New Delhi",
        latitude: 28.5285,
        longitude: 77.2140,
        contactPhone: "+91 11 2651 5050",
        ambulanceUnit: "ALS-CARDIAC-05",
        specialties: ["Chest Pain", "Cardiac Triage", "Fracture Surgery", "Spinal Trauma"],
        capacityStatus: "OPERATIONAL_AVAILABLE",
        icuBedsAvailable: 8
    },
    {
        id: "hosp_4",
        name: "Fortis Emergency Trauma Center",
        traumaLevel: "Level 2 General Disaster Trauma Center",
        traumaTier: 2,
        address: "Aruna Asaf Ali Marg, Sector B, Vasant Kunj, New Delhi",
        latitude: 28.5410,
        longitude: 77.1550,
        contactPhone: "+91 11 4277 6222",
        ambulanceUnit: "BLS-UNIT-08",
        specialties: ["Laceration Repair", "Orthopedic Trauma", "General Emergency Triage"],
        capacityStatus: "OPERATIONAL_AVAILABLE",
        icuBedsAvailable: 12
    },
    {
        id: "hosp_5",
        name: "Apollo Emergency & Urgent First Aid Center",
        traumaLevel: "Level 3 Rapid Urgent Care & Stabilization Center",
        traumaTier: 3,
        address: "Delhi Mathura Road, Sarita Vihar, New Delhi",
        latitude: 28.5390,
        longitude: 77.2840,
        contactPhone: "+91 11 2692 5858",
        ambulanceUnit: "BLS-UNIT-12",
        specialties: ["Minor Burns", "Minor Wounds", "Outpatient Stabilization", "First Aid Triage"],
        capacityStatus: "OPERATIONAL_AVAILABLE",
        icuBedsAvailable: 6
    }
];

/**
 * Haversine formula to compute distance in km between two GPS points
 */
export const calculateDistanceKm = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round((R * c) * 10) / 10;
};

export class HospitalService {
    /**
     * Get list of registered hospitals with computed distance to incident coordinates
     */
    static getHospitalsForLocation(latitude, longitude) {
        return HOSPITAL_REGISTRY.map(hosp => {
            const distanceKm = calculateDistanceKm(latitude, longitude, hosp.latitude, hosp.longitude);
            return {
                ...hosp,
                distanceKm,
                googleMapsUrl: `https://www.google.com/maps/dir/?api=1&destination=${hosp.latitude},${hosp.longitude}`
            };
        }).sort((a, b) => a.distanceKm - b.distanceKm);
    }

    /**
     * AI Automated Hospital Matcher: Evaluates incident criticality & selects optimal hospital
     */
    static async actAndAssignHospital(emergencyId, manualHospitalId = null) {
        const emergency = await Emergency.findById(emergencyId);
        if (!emergency) {
            const err = new Error("Emergency report not found");
            err.statusCode = 404;
            throw err;
        }

        const lat = emergency.location ? Number(emergency.location.latitude) || 28.6139 : 28.6139;
        const lng = emergency.location ? Number(emergency.location.longitude) || 77.2090 : 77.2090;

        const candidateHospitals = this.getHospitalsForLocation(lat, lng);
        let chosenHospital = null;
        let aiReasoning = "";

        if (manualHospitalId) {
            chosenHospital = candidateHospitals.find(h => h.id === manualHospitalId) || candidateHospitals[0];
            aiReasoning = `Responder manually dispatched to ${chosenHospital.name} (${chosenHospital.distanceKm} km away).`;
        } else {
            // AI Automated Selection Logic based on Criticality Score & Triage Flags
            const priorityLevel = emergency.priorityLevel || "MEDIUM";
            const score = emergency.priorityScore || 50;
            const description = (emergency.description || "").toLowerCase();
            const aiFlags = emergency.aiAnalysis || {};

            const isBurn = description.includes("burn") || description.includes("scald") || description.includes("acid");
            const isBleeding = aiFlags.bleeding || description.includes("bleed") || description.includes("blood");
            const isTrappedOrCritical = priorityLevel === "CRITICAL" || score >= 80 || aiFlags.trapped || aiFlags.immediateDanger;

            if (isBurn) {
                // Prefer Burn Unit Hospital (Safdarjung or Level 1)
                chosenHospital = candidateHospitals.find(h => h.id === "hosp_2") || candidateHospitals.find(h => h.traumaTier === 1) || candidateHospitals[0];
                aiReasoning = `AI MATCH: Selected ${chosenHospital.name} (${chosenHospital.distanceKm} km away) due to specialized Major Thermal Burn Unit & Intensive Trauma Resuscitation capability.`;
            } else if (isTrappedOrCritical || isBleeding) {
                // Prefer Level 1 Apex Trauma Center
                chosenHospital = candidateHospitals.find(h => h.traumaTier === 1) || candidateHospitals[0];
                aiReasoning = `AI CRITICAL MATCH: Incident flagged as ${priorityLevel} priority (Score ${score}/100). Assigned Level 1 Apex Trauma Center ${chosenHospital.name} (${chosenHospital.distanceKm} km away) for immediate surgical & ICU dispatch.`;
            } else if (priorityLevel === "HIGH" || score >= 60) {
                // Prefer Level 1 or Level 2 Center
                chosenHospital = candidateHospitals.find(h => h.traumaTier <= 2) || candidateHospitals[0];
                aiReasoning = `AI HIGH PRIORITY MATCH: Assigned ${chosenHospital.name} (${chosenHospital.distanceKm} km away) matching High Priority trauma tier.`;
            } else {
                // Closest available hospital for Medium/Low priority
                chosenHospital = candidateHospitals[0];
                aiReasoning = `AI OPTIMAL DISTANCE MATCH: Assigned nearest facility ${chosenHospital.name} (${chosenHospital.distanceKm} km away) for rapid first-aid stabilization.`;
            }
        }

        // Construct assigned hospital subdocument
        const assignedHospitalData = {
            hospitalId: chosenHospital.id,
            name: chosenHospital.name,
            traumaLevel: chosenHospital.traumaLevel,
            distanceKm: chosenHospital.distanceKm,
            address: chosenHospital.address,
            latitude: chosenHospital.latitude,
            longitude: chosenHospital.longitude,
            contactPhone: chosenHospital.contactPhone,
            ambulanceUnit: chosenHospital.ambulanceUnit,
            aiReasoning,
            assignedAt: new Date()
        };

        // Update emergency document
        emergency.assignedHospital = assignedHospitalData;
        if (emergency.status === "REPORTED") {
            emergency.status = "IN_PROGRESS";
        }

        const savedEmergency = await emergency.save();
        return {
            emergency: savedEmergency,
            assignedHospital: assignedHospitalData
        };
    }
}

export default HospitalService;
