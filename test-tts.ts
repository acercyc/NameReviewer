import { GoogleGenAI, Modality } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function test() {
  const names = [
    "Jitka Štollová",
    "Jitka Stollova",
    "Say cheerfully: Jitka Štollová",
    "Pronounce the name: Jitka Štollová"
  ];

  for (const name of names) {
    try {
      console.log(`Testing: ${name}`);
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: name }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Kore' },
            },
          },
        },
      });
      console.log(`Success for: ${name}`);
    } catch (e: any) {
      console.error(`Failed for: ${name}`, e.message);
    }
  }
}

test();
