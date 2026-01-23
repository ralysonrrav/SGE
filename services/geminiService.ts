
import { GoogleGenAI, Type } from "@google/genai";
import { Subject } from "../types";

export const generateStudyCycle = async (
  board: string,
  examDate: string,
  hoursPerDay: number,
  subjects: Subject[]
) => {
  // Inicializa o cliente seguindo estritamente as diretrizes da documentação
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });
  
  const subjectsSummary = subjects.map(s => `${s.name} (${s.topics.length} tópicos)`).join(", ");
  
  const prompt = `
    Aja como um especialista sênior em concursos públicos brasileiros. 
    Crie um cronograma de estudos estratégico para a banca examinadora "${board}".
    A data da prova é ${examDate}. O aluno tem ${hoursPerDay} horas líquidas disponíveis por dia.
    As disciplinas cadastradas são: ${subjectsSummary}.
    
    Diretrizes Pedagógicas:
    1. Aplique o Teorema de Pareto (80/20): Priorize disciplinas com maior peso histórico para a banca "${board}".
    2. Intercalação: Não estude a mesma matéria por mais de 90 minutos seguidos.
    3. Equilíbrio: Distribua as matérias ao longo dos 7 dias da semana.
    4. Foco: Defina se o foco da sessão deve ser Teoria, Questões ou Revisão de Mapas.
    5. O JSON deve conter uma lista 'schedule' com 'day' e 'sessions'.
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

    // Acessa .text como propriedade (conforme documentação atualizada)
    const text = response.text;
    if (!text) {
      throw new Error("A IA não retornou um cronograma válido.");
    }

    return JSON.parse(text);
  } catch (error: any) {
    console.error("Erro na integração com Gemini:", error);
    throw new Error(error.message || "Falha ao processar inteligência do ciclo.");
  }
};
