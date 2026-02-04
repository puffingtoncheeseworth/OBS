import { GoogleGenAI } from "@google/genai";

const getAiClient = () => {
  if (!process.env.API_KEY) {
    throw new Error("API Key not found");
  }
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

export const generateSmartPhrase = async (description: string): Promise<string> => {
  try {
    const ai = getAiClient();
    const model = "gemini-3-flash-preview";
    
    const prompt = `
      You are an expert medical scribe and EHR specialist. 
      Create a text template/phrase based on the following description: "${description}".
      
      Rules:
      1. Use '***' (three asterisks) as placeholders for variable information (e.g., [Name], [Age], [Findings]).
      2. Keep the tone professional and clinical.
      3. Return ONLY the text content. Do not include quotes or markdown blocks.
      4. If it's a list, use plain text formatting (dashes or numbers).
    `;

    const response = await ai.models.generateContent({
      model,
      contents: prompt,
    });

    return response.text?.trim() || "";
  } catch (error) {
    console.error("Gemini generation failed:", error);
    throw new Error("Failed to generate smart phrase. Please check your API key.");
  }
};