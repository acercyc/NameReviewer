import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
dotenv.config();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function test() {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: "Extract the names and photo URLs of all current fellows listed on https://www.helsinki.fi/en/helsinki-collegium-advanced-studies/people/current-fellows",
    config: {
      tools: [{urlContext: {}}],
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            photoUrl: { type: Type.STRING }
          }
        }
      }
    },
  });
  console.log(response.text);
}

test();
