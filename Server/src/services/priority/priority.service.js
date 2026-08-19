/**
 * Deterministic Priority Engine Service
 * Calculates emergency priority scores & levels using explicit, explainable rules.
 * Does NOT allow LLMs to arbitrarily assign priority scores.
 */
export class PriorityService {
    /**
     * Calculate priority score and level deterministically from extracted flags
     * @param {Object} aiAnalysis - Extracted AI flags
     * @param {number} [victimCountOverride] - Optional victim count override from user report
     * @returns {Object} { priorityScore, priorityLevel, breakdown }
     */
    static calculatePriority(aiAnalysis = {}, victimCountOverride) {
        let score = 0;
        const breakdown = [];

        const victimCount = victimCountOverride !== undefined
            ? victimCountOverride
            : (aiAnalysis.victimCount || 1);

        // Scoring rules
        if (aiAnalysis.immediateDanger) {
            score += 30;
            breakdown.push({ factor: "immediateDanger", weight: +30 });
        }

        if (aiAnalysis.trapped) {
            score += 30;
            breakdown.push({ factor: "trapped", weight: +30 });
        }

        if (aiAnalysis.bleeding) {
            score += 30;
            breakdown.push({ factor: "bleeding", weight: +30 });
        }

        if (aiAnalysis.injury) {
            score += 20;
            breakdown.push({ factor: "injury", weight: +20 });
        }

        if (aiAnalysis.waterRising) {
            score += 20;
            breakdown.push({ factor: "waterRising", weight: +20 });
        }

        if (aiAnalysis.mobilityIssue) {
            score += 20;
            breakdown.push({ factor: "mobilityIssue", weight: +20 });
        }

        if (aiAnalysis.elderly) {
            score += 15;
            breakdown.push({ factor: "elderly", weight: +15 });
        }

        if (aiAnalysis.child) {
            score += 15;
            breakdown.push({ factor: "child", weight: +15 });
        }

        if (victimCount > 1) {
            score += 10;
            breakdown.push({ factor: "multipleVictims", weight: +10, victimCount });
        }

        // Default base score for any valid reported emergency if no flags triggered
        if (score === 0) {
            score = 25;
            breakdown.push({ factor: "baseReportScore", weight: +25 });
        }

        // Clamp score between 0 and 100
        const priorityScore = Math.min(100, Math.max(0, score));

        // Deterministic Level Classification
        let priorityLevel = "MEDIUM";
        if (priorityScore >= 80) {
            priorityLevel = "CRITICAL";
        } else if (priorityScore >= 60) {
            priorityLevel = "HIGH";
        } else if (priorityScore >= 40) {
            priorityLevel = "MEDIUM";
        } else {
            priorityLevel = "LOW";
        }

        return {
            priorityScore,
            priorityLevel,
            breakdown
        };
    }
}
