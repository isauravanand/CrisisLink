import groqService from "./groq.service.js";
import geminiService from "./gemini.service.js";

const SYSTEM_INSTRUCTION = `
You are an expert emergency triage AI assistant for LifeLine AI disaster response platform.
Your task is to analyze raw emergency reports and extract structured critical triage information.

You MUST respond ONLY with a valid, raw JSON object (no markdown formatting, no markdown backticks, no explanatory prose).

The output JSON object MUST contain exactly these keys:
{
  "emergencyType": string (e.g., "flood", "fire", "medical", "earthquake", "accident", "trail_search", "other"),
  "victimCount": number (integer >= 0, default 1 if unspecified),
  "immediateDanger": boolean,
  "elderly": boolean,
  "child": boolean,
  "mobilityIssue": boolean,
  "injury": boolean,
  "bleeding": boolean,
  "trapped": boolean,
  "waterRising": boolean,
  "summary": string (1-2 sentence concise technical summary of the situation)
}
`;

const INJURY_REPLY_SYSTEM_INSTRUCTION = `
You are LifeLine AI's Emergency Medical Triage Specialist.
When a user uploads an injury report (description and/or photo), generate an immediate, concise, step-by-step automated AI response for first-aid guidance.

Respond ONLY with a valid JSON object matching this structure:
{
  "triageLevel": "CRITICAL" | "HIGH" | "MEDIUM" | "LOW",
  "injuryTitle": string (e.g., "Severe Laceration First-Aid Protocol"),
  "instructions": array of string (3-5 concise, actionable immediate first-aid steps),
  "doNotDo": array of string (2-3 critical things NOT to do),
  "advice": string (Reassuring advice for waiting for emergency responders),
  "summary": string (1 sentence clinical summary)
}
`;

export class EmergencyAIService {
    static cleanJSONString(text) {
        if (!text) return "";
        let cleaned = text.trim();
        if (cleaned.startsWith("```json")) {
            cleaned = cleaned.replace(/^```json/, "").replace(/```$/, "");
        } else if (cleaned.startsWith("```")) {
            cleaned = cleaned.replace(/^```/, "").replace(/```$/, "");
        }
        return cleaned.trim();
    }

    static validateAndNormalize(parsedData) {
        if (!parsedData || typeof parsedData !== "object") {
            throw new Error("Invalid AI analysis output format");
        }

        const validTypes = ["flood", "fire", "medical", "earthquake", "accident", "trail_search", "other"];

        return {
            emergencyType: typeof parsedData.emergencyType === "string" && validTypes.includes(parsedData.emergencyType.toLowerCase())
                ? parsedData.emergencyType.toLowerCase()
                : "other",
            victimCount: typeof parsedData.victimCount === "number" && !isNaN(parsedData.victimCount) && parsedData.victimCount >= 0
                ? Math.floor(parsedData.victimCount)
                : 1,
            immediateDanger: Boolean(parsedData.immediateDanger),
            elderly: Boolean(parsedData.elderly),
            child: Boolean(parsedData.child),
            mobilityIssue: Boolean(parsedData.mobilityIssue),
            injury: Boolean(parsedData.injury),
            bleeding: Boolean(parsedData.bleeding),
            trapped: Boolean(parsedData.trapped),
            waterRising: Boolean(parsedData.waterRising),
            summary: typeof parsedData.summary === "string" && parsedData.summary.trim().length > 0
                ? parsedData.summary.trim()
                : "Emergency analysis performed."
        };
    }

    /**
     * Fallback rule-based Medical AI Reply Generator
     */
    static generateFallbackInjuryReply(description = "", hasPhoto = false) {
        const text = (description || "").toLowerCase();

        if (text.includes("bleed") || text.includes("cut") || text.includes("wound") || text.includes("blood") || text.includes("slash")) {
            return {
                triageLevel: "HIGH",
                injuryTitle: "Severe Laceration & Hemorrhage Control Protocol",
                instructions: [
                    "Apply firm, direct pressure on the bleeding wound using a clean cloth or sterile gauze immediately.",
                    "Elevate the injured area above the heart level if possible to reduce arterial pressure.",
                    "Keep pressure constant for at least 10–15 minutes without lifting the cloth to check.",
                    "If blood seeps through, layer additional clean cloths directly on top; do not remove original padding."
                ],
                doNotDo: [
                    "Do NOT remove deeply embedded glass, metal, or objects from the wound.",
                    "Do NOT apply a tight tourniquet unless trained and in life-threatening bleeding."
                ],
                advice: "Emergency dispatch teams have been alerted to your coordinates. Keep the victim seated, calm, and warm.",
                summary: "Active bleeding wound reported. First-aid pressure applied.",
                generatedAt: new Date().toISOString()
            };
        }

        if (text.includes("burn") || text.includes("fire") || text.includes("scald") || text.includes("heat") || text.includes("acid")) {
            return {
                triageLevel: "CRITICAL",
                injuryTitle: "Thermal Burn Triage & Cooling Protocol",
                instructions: [
                    "Cool the burn immediately under cool, gentle running water for 10 to 20 minutes.",
                    "Cover the burned area loosely with clean, non-stick plastic film or clean dry cloth.",
                    "Remove tight items such as rings, watches, or clothing near the burn before swelling begins."
                ],
                doNotDo: [
                    "Do NOT apply ice, ice water, butter, oils, or ointments directly on open burns.",
                    "Do NOT break or puncture any fluid-filled skin blisters."
                ],
                advice: "Burn response unit notified. Ensure victim is breathing normally and protected from drafts.",
                summary: "Thermal burn reported. Cooling protocol initiated.",
                generatedAt: new Date().toISOString()
            };
        }

        if (text.includes("fracture") || text.includes("bone") || text.includes("fall") || text.includes("sprain") || text.includes("twist") || text.includes("leg") || text.includes("arm")) {
            return {
                triageLevel: "HIGH",
                injuryTitle: "Suspected Bone Fracture & Trauma Immobilization",
                instructions: [
                    "Immobilize the limb immediately in the exact position found; do not force realigning.",
                    "Apply a cloth-wrapped cold pack or ice pack for 15 minutes to reduce swelling.",
                    "Support the injured joint or limb using rolled towels, clothing, or cushions."
                ],
                doNotDo: [
                    "Do NOT attempt to push protruding bones back into place.",
                    "Do NOT allow the victim to walk or place weight on the injured limb."
                ],
                advice: "Paramedic crew dispatched. Keep victim comfortable and minimize any movement.",
                summary: "Trauma injury reported with suspected limb fracture.",
                generatedAt: new Date().toISOString()
            };
        }

        if (text.includes("head") || text.includes("unconscious") || text.includes("dizzy") || text.includes("concussion") || text.includes("faint")) {
            return {
                triageLevel: "CRITICAL",
                injuryTitle: "Head Trauma & Spinal Alignment Protocol",
                instructions: [
                    "Keep the patient lying completely flat with head and neck stabilized in a neutral position.",
                    "Monitor airway and breathing continuously; turn gently to side if vomiting occurs.",
                    "Apply gentle direct pressure if there is an external scalp laceration."
                ],
                doNotDo: [
                    "Do NOT tilt or twist the neck if spinal trauma is possible.",
                    "Do NOT administer food, liquids, or pain medication orally."
                ],
                advice: "Priority Critical Code Red assigned. Stand by for paramedic arrival.",
                summary: "Head trauma report. Airway and cervical spine monitoring active.",
                generatedAt: new Date().toISOString()
            };
        }

        if (text.includes("chest") || text.includes("breath") || text.includes("heart") || text.includes("gasp") || text.includes("choke")) {
            return {
                triageLevel: "CRITICAL",
                injuryTitle: "Acute Respiratory & Cardiac Triage Protocol",
                instructions: [
                    "Assist the person into an upright seated position, leaning slightly forward.",
                    "Loosen all tight clothing around neck, chest, and waist immediately.",
                    "Maintain calm environment and encourage slow, deep nasal breaths."
                ],
                doNotDo: [
                    "Do NOT allow the person to walk, climb stairs, or exert themselves.",
                    "Do NOT give oral drinks or meals."
                ],
                advice: "Emergency Medical Services dispatched with top priority response route.",
                summary: "Respiratory emergency flagged. Oxygen & paramedic response unit alerted.",
                generatedAt: new Date().toISOString()
            };
        }

        // Generic Injury Default AI Response
        return {
            triageLevel: hasPhoto ? "HIGH" : "MEDIUM",
            injuryTitle: "Automated Emergency Injury First-Aid Guidance",
            instructions: [
                "Ensure the immediate area is safe from ongoing hazards before providing aid.",
                "Keep the injured person lying down or seated in a comfortable resting position.",
                "Cover the victim with a jacket or blanket to preserve body warmth and prevent shock.",
                "Continuously observe breathing, pulse, and mental alertness until help arrives."
            ],
            doNotDo: [
                "Do NOT move the injured person unless there is immediate danger (fire, gas leak, collapse).",
                "Do NOT offer food or drinks in case surgical intervention is needed."
            ],
            advice: "LifeLine dispatch team has logged your emergency report. Keep phone line open for emergency calls.",
            summary: `Injury report processed ${hasPhoto ? "with uploaded photographic evidence." : "."}`,
            generatedAt: new Date().toISOString()
        };
    }

    /**
     * Generate automated AI reply for injury report via Groq API (or Gemini / fallback)
     */
    static async generateAutomatedInjuryReply(description, hasPhoto = false) {
        const prompt = `Analyze this user injury report ${hasPhoto ? "with uploaded injury photo attachment" : ""}:\n"${description || "Injury reported."}"\n\nGenerate structured automated first-aid response JSON matching: {"triageLevel": "CRITICAL"|"HIGH"|"MEDIUM"|"LOW", "injuryTitle": string, "instructions": [string], "doNotDo": [string], "advice": string, "summary": string}`;

        if (groqService.isConfigured()) {
            try {
                const rawText = await groqService.generateText({
                    prompt,
                    systemInstruction: INJURY_REPLY_SYSTEM_INSTRUCTION
                });

                const cleaned = this.cleanJSONString(rawText);
                const parsed = JSON.parse(cleaned);

                return {
                    triageLevel: parsed.triageLevel || "HIGH",
                    injuryTitle: parsed.injuryTitle || "Automated Medical Injury Reply",
                    instructions: Array.isArray(parsed.instructions) && parsed.instructions.length > 0 ? parsed.instructions : [
                        "Apply firm pressure if bleeding.",
                        "Keep patient calm and still.",
                        "Wait for dispatched medical responders."
                    ],
                    doNotDo: Array.isArray(parsed.doNotDo) && parsed.doNotDo.length > 0 ? parsed.doNotDo : [
                        "Do not move the victim needlessly.",
                        "Do not give oral drinks."
                    ],
                    advice: parsed.advice || "Emergency team dispatched. Stay on line.",
                    summary: parsed.summary || "AI injury analysis completed.",
                    generatedAt: new Date().toISOString()
                };
            } catch (err) {
                console.warn("[EmergencyAIService] Groq AI reply failed, trying Gemini or fallback:", err.message);
            }
        }

        if (geminiService.isConfigured()) {
            try {
                const rawText = await geminiService.generateText({
                    prompt,
                    systemInstruction: INJURY_REPLY_SYSTEM_INSTRUCTION
                });

                const cleaned = this.cleanJSONString(rawText);
                const parsed = JSON.parse(cleaned);

                return {
                    triageLevel: parsed.triageLevel || "HIGH",
                    injuryTitle: parsed.injuryTitle || "Automated Medical Injury Reply",
                    instructions: Array.isArray(parsed.instructions) && parsed.instructions.length > 0 ? parsed.instructions : [
                        "Apply firm pressure if bleeding.",
                        "Keep patient calm and still.",
                        "Wait for dispatched medical responders."
                    ],
                    doNotDo: Array.isArray(parsed.doNotDo) && parsed.doNotDo.length > 0 ? parsed.doNotDo : [
                        "Do not move the victim needlessly.",
                        "Do not give oral drinks."
                    ],
                    advice: parsed.advice || "Emergency team dispatched. Stay on line.",
                    summary: parsed.summary || "AI injury analysis completed.",
                    generatedAt: new Date().toISOString()
                };
            } catch (err) {
                console.warn("[EmergencyAIService] Gemini AI reply fallback activated:", err.message);
            }
        }

        return this.generateFallbackInjuryReply(description, hasPhoto);
    }

    /**
     * Analyze emergency description via Groq API (or Gemini / fallback)
     */
    static async analyzeEmergency(input) {
        let description = "";
        if (typeof input === "string") {
            description = input;
        } else if (input && typeof input === "object") {
            description = `Description: ${input.description || ""}. Emergency Type hint: ${input.emergencyType || ""}. Victim count hint: ${input.victimCount || 1}.`;
        }

        if (!description || description.trim().length === 0) {
            throw new Error("Cannot run AI analysis on empty emergency description");
        }

        const userPrompt = `Analyze the following emergency report and return the structured JSON:\n"${description}"`;

        if (groqService.isConfigured()) {
            try {
                const rawText = await groqService.generateText({
                    prompt: userPrompt,
                    systemInstruction: SYSTEM_INSTRUCTION
                });

                const cleanedText = this.cleanJSONString(rawText);
                const parsed = JSON.parse(cleanedText);
                return this.validateAndNormalize(parsed);
            } catch (err) {
                console.warn("[EmergencyAIService] Groq AI analysis failed, trying Gemini or fallback:", err.message);
            }
        }

        if (geminiService.isConfigured()) {
            try {
                const rawText = await geminiService.generateText({
                    prompt: userPrompt,
                    systemInstruction: SYSTEM_INSTRUCTION
                });

                const cleanedText = this.cleanJSONString(rawText);
                const parsed = JSON.parse(cleanedText);
                return this.validateAndNormalize(parsed);
            } catch (err) {
                console.warn("[EmergencyAIService] Gemini AI analysis failed:", err.message);
            }
        }

        // Return default basic analysis if AI APIs unavailable
        const descStr = typeof input === "string" ? input : (input?.description || "");
        const hasInjury = /injury|blood|cut|burn|broken|bone|fracture|hurt/i.test(descStr);
        const hasTrapped = /trap|stuck|rubble|collapse|lock/i.test(descStr);

        return {
            emergencyType: typeof input === "object" && input.emergencyType ? input.emergencyType.toLowerCase() : "other",
            victimCount: typeof input === "object" && input.victimCount ? Number(input.victimCount) : 1,
            immediateDanger: true,
            elderly: false,
            child: false,
            mobilityIssue: false,
            injury: hasInjury,
            bleeding: /bleed|blood/i.test(descStr),
            trapped: hasTrapped,
            waterRising: false,
            summary: descStr || "Emergency incident recorded."
        };
    }
}

export default EmergencyAIService;
