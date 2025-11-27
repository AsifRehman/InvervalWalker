import { GoogleGenAI, Type } from "@google/genai";
import { MotivationResponse } from '../types';

let genAI: GoogleGenAI | null = null;

const getAI = () => {
  if (!genAI) {
    genAI = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }
  return genAI;
};

export const getWalkingMotivation = async (context: string): Promise<string> => {
  try {
    const ai = getAI();
    
    // We want a punchy, short quote.
    const prompt = `
      Give me a single, short, powerful motivational sentence for someone currently doing interval walking training. 
      Context: ${context}. 
      Keep it under 20 words. 
      Do not include quotes around the text.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            message: {
              type: Type.STRING,
            }
          }
        }
      }
    });

    // Parse the JSON response
    const jsonResponse = JSON.parse(response.text || '{}') as MotivationResponse;
    return jsonResponse.message || "Keep moving forward!";

  } catch (error) {
    console.error("Error fetching motivation:", error);
    return "You are doing great! Keep it up!";
  }
};
