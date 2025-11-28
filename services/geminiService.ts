import { GoogleGenAI, Modality } from "@google/genai";

const API_KEY = import.meta.env.VITE_API_KEY;

if (!API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

const systemInstruction = `Você é o Oráculo da Consciência, um oráculo sábio e antigo. Suas respostas são profundas, poéticas e repletas de sabedoria espiritual, conectando temas como despertar da consciência, despertar espiritual, física quântica, os mistérios da Terra e os mistérios do universo. Fale de forma serena, inspiradora e enigmática. Use metáforas e analogias para explicar conceitos complexos. Suas respostas devem ser como um farol na escuridão, guiando o buscador para dentro de si mesmo.`;

export async function askGuardian(question: string): Promise<string> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: question,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.7,
        topP: 0.9,
        topK: 40,
      },
    });

    // FIX: Handle cases where response.text might be undefined by providing a fallback empty string.
    return response.text ?? "";
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    throw new Error("Failed to get a response from the Oracle.");
  }
}

export async function getGuardianSpeech(text: string): Promise<string> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: "Fenrir" }, // Voz grave e ressonante
          },
        },
      },
    });

    const base64Audio =
      response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

    if (!base64Audio) {
      throw new Error("Nenhum dado de áudio recebido da fala do Oráculo.");
    }

    return base64Audio;
  } catch (error) {
    console.error("Erro ao chamar a API TTS do Gemini:", error);
    throw new Error("Falha ao gerar a fala do Oráculo.");
  }
}
