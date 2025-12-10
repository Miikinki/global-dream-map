import { GoogleGenAI, Type, Schema } from "@google/genai";
import { DreamCategory, AnalysisResult } from '../types';

// Fallback logic for simulation if API fails or key is missing
const simulateAnalysis = (text: string): AnalysisResult => {
  const lower = text.toLowerCase();
  let category = DreamCategory.MUNDANE;

  if (lower.includes('control') || lower.includes('knew i was dreaming') || lower.includes('changed') || lower.includes('aware')) {
    category = DreamCategory.LUCID;
  } else if (lower.includes('late') || lower.includes('test') || lower.includes('exam') || lower.includes('naked') || lower.includes('teeth') || lower.includes('forgot')) {
    category = DreamCategory.STRESS;
  } else if (lower.includes('fly') || lower.includes('superpower') || lower.includes('explore') || lower.includes('quest') || lower.includes('travel') || lower.includes('space')) {
    category = DreamCategory.ADVENTURE;
  } else if (lower.includes('blood') || lower.includes('chase') || lower.includes('monster') || lower.includes('scared') || lower.includes('die') || lower.includes('murder')) {
    category = DreamCategory.NIGHTMARE;
  } else if (lower.includes('floating') || lower.includes('magic') || lower.includes('weird') || lower.includes('impossible') || lower.includes('melting')) {
    category = DreamCategory.SURREAL;
  } else if (lower.includes('love') || lower.includes('kiss') || lower.includes('date') || lower.includes('partner') || lower.includes('marriage')) {
    category = DreamCategory.ROMANTIC;
  } else if (lower.includes('future') || lower.includes('god') || lower.includes('voice') || lower.includes('light') || lower.includes('predict')) {
    category = DreamCategory.PROPHETIC;
  }

  return {
    category,
    summary: text.slice(0, 50) + (text.length > 50 ? '...' : ''),
    interpretation: "The void has received your transmission. The patterns suggest a reflection of your inner state.",
  };
};

export const analyzeDream = async (dreamText: string): Promise<AnalysisResult> => {
  const apiKey = process.env.API_KEY;

  if (!apiKey) {
    console.warn("No API Key found. Using simulated analysis.");
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    return simulateAnalysis(dreamText);
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    
    const schema: Schema = {
      type: Type.OBJECT,
      properties: {
        category: {
          type: Type.STRING,
          enum: Object.values(DreamCategory),
          description: "The category that best fits the dream."
        },
        summary: {
          type: Type.STRING,
          description: "A very short, 1-sentence summary of the dream."
        },
        interpretation: {
          type: Type.STRING,
          description: "A short, mystical, sci-fi style interpretation of what this dream might mean for the dreamer."
        }
      },
      required: ["category", "summary", "interpretation"],
    };

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Analyze the following dream text. Classify it into one of the allowed categories. 
      
      Categories:
      - Nightmare: Fear, danger, monsters.
      - Stress: Anxiety, being late, failing tests, losing teeth.
      - Lucid: Awareness of dreaming, controlling the dream.
      - Adventure: Exploration, flying, quests, superpowers.
      - Surreal: Bizarre, logic-defying visuals.
      - Romantic: Love, relationships.
      - Prophetic: Deep intuition, spiritual visions.
      - Mundane: Normal daily life.

      Provide a concise summary and a mysterious, ethereal interpretation.
      
      Dream Text: "${dreamText}"`,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature: 0.7, // slightly creative
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from Gemini");

    const result = JSON.parse(text) as AnalysisResult;
    return result;

  } catch (error) {
    console.error("Gemini analysis failed:", error);
    return simulateAnalysis(dreamText);
  }
};

export const translateDream = async (text: string, interpretation: string, targetLang: string) => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) return null;

  try {
    const ai = new GoogleGenAI({ apiKey });
    
    const schema: Schema = {
      type: Type.OBJECT,
      properties: {
        translatedText: { type: Type.STRING },
        translatedInterpretation: { type: Type.STRING },
      },
      required: ["translatedText", "translatedInterpretation"],
    };

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Translate the following dream text and interpretation into ${targetLang}. 
      Maintain the mystical, sci-fi tone for the interpretation.
      
      Dream Text: "${text}"
      Interpretation: "${interpretation}"`,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
      }
    });

    if (!response.text) return null;
    return JSON.parse(response.text) as { translatedText: string, translatedInterpretation: string };
  } catch (e) {
    console.error("Translation failed", e);
    return null;
  }
};