import { GoogleGenAI, Type } from "@google/genai";

let aiInstance: GoogleGenAI | null = null;

function getAi() {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not defined. Please set it in your environment variables.");
    }
    aiInstance = new GoogleGenAI({ apiKey });
  }
  return aiInstance;
}

export async function generateProductDetails(name: string) {
  const ai = getAi();
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Gere detalhes para um vestido de quadrilha junina chamado "${name}". 
    O conteúdo deve ser criativo e focado em Icó, Ceará (Nordeste do Brasil).
    Retorne um objeto JSON com as seguintes propriedades:
    - description: Uma descrição encantadora e poética do vestido.
    - measurements: Sugestões de medidas padrão (ex: Busto 90, Cintura 70).
    - recommendations: Dicas de uso e conservação.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          description: { type: Type.STRING },
          measurements: { type: Type.STRING },
          recommendations: { type: Type.STRING },
        },
        required: ["description", "measurements", "recommendations"],
      },
    },
  });

  return JSON.parse(response.text);
}
