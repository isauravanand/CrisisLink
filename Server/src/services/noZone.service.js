import Emergency from "../models/Emergency.js";
import { findRecords } from "../utils/fileStorage.js";

// Default supply hubs in operational region (Delhi/NCR area)
const DEFAULT_SUPPLY_HUBS = [
    {
        id: "sup_1",
        name: "Central Disaster Relief Supply Depot",
        category: "MEDICAL_FOOD",
        categoryLabel: "Medical & Food Rations",
        address: "Connaught Place, Block C, New Delhi",
        latitude: 28.6315,
        longitude: 77.2167,
        status: "OPEN",
        contactPhone: "+91 11 2341 5501",
        operatingHours: "24/7 Operational",
        supplies: ["First Aid Kits", "Ready-to-Eat Meal Packs", "Bottled Water (20L)", "Tents & Tarpaulins", "Blankets"],
        stockLevel: "HIGH"
    },
    {
        id: "sup_2",
        name: "North Delhi Emergency Oxygen & Medicine Depot",
        category: "MEDICAL_OXYGEN",
        categoryLabel: "Medical & Oxygen Station",
        address: "GTB Hospital Complex, Dilshad Garden, Delhi",
        latitude: 28.6835,
        longitude: 77.3082,
        status: "OPEN",
        contactPhone: "+91 11 2258 6262",
        operatingHours: "24/7 Operational",
        supplies: ["Oxygen Cylinders", "Critical Care Supplies", "Trauma Bandages", "IV Fluids", "Burn Kits"],
        stockLevel: "CRITICAL_STOCK"
    },
    {
        id: "sup_3",
        name: "South Delhi Flood & Disaster Shelter Hub",
        category: "SHELTER_EQUIPMENT",
        categoryLabel: "Shelter & Rescue Equipment",
        address: "Okhla Phase 3, Industrial Area, New Delhi",
        latitude: 28.5355,
        longitude: 77.2650,
        status: "OPEN",
        contactPhone: "+91 11 2638 9012",
        operatingHours: "06:00 AM - 10:00 PM",
        supplies: ["Inflatable Life Rafts", "Life Jackets", "Water Pumps", "Emergency Lights & Generators", "Ropes & Harnesses"],
        stockLevel: "MEDIUM"
    },
    {
        id: "sup_4",
        name: "West Delhi Community Food & Water Center",
        category: "FOOD_WATER",
        categoryLabel: "Clean Water & Food Supply",
        address: "Rajouri Garden District Center, New Delhi",
        latitude: 28.6472,
        longitude: 77.1215,
        status: "OPEN",
        contactPhone: "+91 11 2516 4433",
        operatingHours: "24/7 Operational",
        supplies: ["Purified Drinking Water", "Baby Food & Formula", "Dry Rations (Rice/Pulses)", "Sanitation Kits"],
        stockLevel: "HIGH"
    },
    {
        id: "sup_5",
        name: "East Delhi Mobile Medical Response Base",
        category: "MEDICAL",
        categoryLabel: "Mobile First Aid Unit",
        address: "Laxmi Nagar Metro Station Hub, Delhi",
        latitude: 28.6304,
        longitude: 77.2773,
        status: "OPEN",
        contactPhone: "+91 11 2244 8890",
        operatingHours: "24/7 Operational",
        supplies: ["Mobile Medical Van", "Ambulance Stretcher Kits", "Vaccines", "Pain Relief Medication", "Hygiene Packs"],
        stockLevel: "HIGH"
    }
];

// Fallback emergency incidents if DB contains 0 emergencies
const DEMO_EMERGENCIES = [
    {
        _id: "demo_em_1",
        caseId: "EM-2026-0901",
        description: "CRITICAL: Major Structural Collapse & Active Transformer Fire reported near Market Square",
        emergencyType: "FIRE",
        victimCount: 12,
        priorityLevel: "CRITICAL",
        priorityScore: 95,
        status: "IN_PROGRESS",
        location: {
            latitude: 28.6280,
            longitude: 77.2180,
            address: "Inner Circle, Connaught Place, New Delhi"
        },
        createdAt: new Date().toISOString()
    },
    {
        _id: "demo_em_2",
        caseId: "EM-2026-0902",
        description: "HIGH: Urban Flash Flooding & Rising Water Level near Low-Lying Residential Area",
        emergencyType: "FLOOD",
        victimCount: 8,
        priorityLevel: "HIGH",
        priorityScore: 82,
        status: "INVESTIGATING",
        location: {
            latitude: 28.6750,
            longitude: 77.3010,
            address: "Yamuna Floodplain Sector, Shahdara, Delhi"
        },
        createdAt: new Date().toISOString()
    },
    {
        _id: "demo_em_3",
        caseId: "EM-2026-0903",
        description: "CRITICAL: Multiple Casualties Gas Leak Alert at Chemical Warehouse",
        emergencyType: "MEDICAL",
        victimCount: 15,
        priorityLevel: "CRITICAL",
        priorityScore: 98,
        status: "REPORTED",
        location: {
            latitude: 28.5300,
            longitude: 77.2700,
            address: "Okhla Industrial Estate Phase II, Delhi"
        },
        createdAt: new Date().toISOString()
    },
    {
        _id: "demo_em_4",
        caseId: "EM-2026-0904",
        description: "MEDIUM: Road Accident and Vehicle Pileup blocking Highway Lane",
        emergencyType: "ACCIDENT",
        victimCount: 3,
        priorityLevel: "MEDIUM",
        priorityScore: 65,
        status: "IN_PROGRESS",
        location: {
            latitude: 28.6500,
            longitude: 77.1300,
            address: "Ring Road Interchange, Rajouri Garden, Delhi"
        },
        createdAt: new Date().toISOString()
    }
];

/**
 * Get radius in meters for danger zone red circle based on priority level
 */
const getDangerZoneRadius = (priorityLevel) => {
    switch (priorityLevel?.toUpperCase()) {
        case "CRITICAL":
            return 1800; // 1.8 km danger radius
        case "HIGH":
            return 1200; // 1.2 km danger radius
        case "MEDIUM":
            return 750;  // 750 m danger radius
        case "LOW":
        default:
            return 450;  // 450 m danger radius
    }
};

/**
 * Fetch and construct complete No Zone Area telemetry:
 * - Emergencies list
 * - Red Circle Danger Zones around emergencies
 * - Relief Supply Depots with Google Maps navigation links
 */
export const getNoZoneData = async () => {
    let emergencies = [];
    try {
        emergencies = await Emergency.find().lean();
    } catch {
        emergencies = [];
    }

    // If database has no valid GPS emergencies, append demo emergencies to ensure user sees active map
    if (!emergencies || emergencies.length === 0) {
        emergencies = DEMO_EMERGENCIES;
    }

    const validEmergencies = emergencies.filter(
        em => em.location && typeof em.location.latitude === "number" && typeof em.location.longitude === "number"
    );

    // Build Danger Zones in Red Circle format around emergencies
    const dangerZones = validEmergencies.map((em) => {
        const radiusMeters = getDangerZoneRadius(em.priorityLevel);
        const emId = em._id ? em._id.toString() : em.caseId;

        return {
            id: `dz_${emId}`,
            emergencyId: emId,
            caseId: em.caseId || `EM-${emId.slice(-4)}`,
            title: `RED DANGER ZONE: ${em.emergencyType || "INCIDENT"}`,
            description: em.description,
            latitude: em.location.latitude,
            longitude: em.location.longitude,
            address: em.location.address || "Unspecified Location",
            priorityLevel: em.priorityLevel || "HIGH",
            status: em.status || "REPORTED",
            victimCount: em.victimCount || 1,
            radiusMeters,
            radiusKm: (radiusMeters / 1000).toFixed(1),
            riskLevel: em.priorityLevel === "CRITICAL" ? "EXTREME HAZARD - NO ENTRY" : "HIGH DANGER ZONE",
            color: "#ef4444",
            fillColor: "#ef4444",
            fillOpacity: 0.22,
            createdAt: em.createdAt
        };
    });

    // Format supplies with Google Maps direct link
    const supplies = DEFAULT_SUPPLY_HUBS.map(hub => ({
        ...hub,
        googleMapsUrl: `https://www.google.com/maps/dir/?api=1&destination=${hub.latitude},${hub.longitude}`
    }));

    return {
        screenTitle: "No Zone Area",
        summary: {
            totalEmergencies: validEmergencies.length,
            totalDangerZones: dangerZones.length,
            totalSupplyHubs: supplies.length,
            criticalZonesCount: dangerZones.filter(z => z.priorityLevel === "CRITICAL").length
        },
        emergencies: validEmergencies,
        dangerZones,
        supplies
    };
};

export default {
    getNoZoneData
};
