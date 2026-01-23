
import { GoogleGenAI, Type } from "@google/genai";
import { Subject } from "../types";

export const generateStudyCycle = async (
  board: string,
  examDate: string,
  hoursPerDay: number,
  subjects: Subject[]
) => {
  // Fixed: Always use the named parameter for apiKey initialization.
  const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_API_KEY });
  
  const subjectsSummary = subjects.map(s => `${s.name} (${s.topics.length} tópicos)`).join(", ");
  
  const prompt = `
    Aja como um especialista em concursos públicos. Crie um cronograma de estudos para a banca examinadora "${board}".
    A data da prova é ${examDate}. O aluno tem ${hoursPerDay} horas disponíveis por dia.
    As disciplinas são: ${subjectsSummary}.
    
    Aplique o Teorema de Pareto (80/20): identifique quais disciplinas costumam ser mais cobradas pela banca "${board}" e dedique mais tempo a elas.
    
    Retorne um JSON seguindo esta estrutura:
    {
      "schedule": [
        {
          "day": "Segunda-feira",
          "sessions": [
            { "subjectName": "Nome da Disciplina", "duration": 60, "focus": "Teoria/Questões" }
          ]
        }
      ]
    }
    Gere para uma semana típica (7 dias).
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash",
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
          }
        }
      }
    });

    // Fixed: Accessed .text property directly and handled potential undefined value.
    const jsonStr = response.text;
    if (!jsonStr) {
      throw new Error("Empty response from Gemini API");
    }
    return JSON.parse(jsonStr.trim());
  } catch (error) {
    console.error("Erro na geração do ciclo:", error);
    throw error;
  }
};
