
import { GoogleGenAI, Type } from "@google/genai";
import { Subject } from "../types";

export const generateStudyCycle = async (
  board: string,
  examDate: string,
  hoursPerDay: number,
  subjects: Subject[]
) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const subjectsSummary = subjects.map(s => `${s.name} (${s.topics.length} tópicos)`).join(", ");
  
  const prompt = `
    Aja como um especialista sênior em concursos públicos brasileiros. 
    Banca: "${board}". Data da Prova: ${examDate}. Horas/Dia: ${hoursPerDay}h líquidas.
    Disciplinas: ${subjectsSummary}.
    
    Diretrizes de Especialista:
    1. Pareto: Priorize disciplinas de maior peso para a banca "${board}".
    2. Intercalação: Sessões de no máximo 90min.
    3. Equilíbrio: Distribua teoria, questões e revisão de mapas mentais.
    4. Ciclo Semanal: Planeje de Segunda a Domingo.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            schedule: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  day: { type: Type.STRING },
                  sessions: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        subjectName: { type: Type.STRING },
                        duration: { type: Type.NUMBER },
                        focus: { type: Type.STRING }
                      },
                      required: ["subjectName", "duration", "focus"]
                    }
                  }
                },
                required: ["day", "sessions"]
              }
            }
          },
          required: ["schedule"]
        },
      },
    });

    return JSON.parse(response.text || "{}");
  } catch (error: any) {
    console.error("Erro Gemini Service:", error);
    throw new Error("Falha na Inteligência de Ciclo.");
  }
};
