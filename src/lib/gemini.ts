import { GoogleGenAI, Modality } from "@google/genai";

export async function transcribeAudio(base64Audio: string, mimeType: string): Promise<string | undefined> {
  try {
    const ai = new GoogleGenAI({ apiKey: (import.meta as any).env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          parts: [
            {
              inlineData: {
                data: base64Audio,
                mimeType: mimeType,
              },
            },
            {
              text: "Transcribe the spoken name in this audio. Only output the name itself, nothing else.",
            },
          ],
        },
      ],
    });
    return response.text?.trim();
  } catch (error) {
    console.error("Error transcribing audio:", error);
    return undefined;
  }
}

export async function generatePronunciation(name: string): Promise<string | undefined> {
  try {
    const ai = new GoogleGenAI({ apiKey: (import.meta as any).env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY });
    
    // First, get a phonetic spelling or simplified version of the name
    const phoneticResponse = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Provide a phonetic spelling of the name "${name}" using standard English alphabet characters so a text-to-speech engine can pronounce it correctly. Only output the phonetic spelling, nothing else. Do not include any punctuation or explanation. For example, for "Jitka Štollová", output "Yitka Shtollova".`,
    });
    
    const phoneticName = phoneticResponse.text?.trim() || name;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `Say clearly: ${phoneticName}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });

    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  } catch (error) {
    console.error("Error generating pronunciation:", error);
    return undefined;
  }
}
