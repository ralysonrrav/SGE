import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { Subject } from "../types.ts"; // Lembre-se da extensão .ts se necessário

export const generateStudyCycle = async (
  board: string,
  examDate: string,
  hoursPerDay: number,
  subjects: Subject[]
) => {
  // Inicialização correta usando a variável de ambiente configurada na Vercel
  const genAI = new GoogleGenerativeAI(import.meta.env.VITE_API_KEY);
  
  // Resumo das disciplinas para o prompt
  const subjectsSummary = subjects.map(s => `${s.name} (${s.topics.length} tópicos)`).join(", ");
  
  const prompt = `
    Aja como um especialista em concursos públicos. Crie um cronograma de estudos para a banca examinadora "${board}".
    A data da prova é ${examDate}. O aluno tem ${hoursPerDay} horas disponíveis por dia.
    As disciplinas são: ${subjectsSummary}.
    
    Aplique o Teorema de Pareto (80/20): identifique quais disciplinas costumam ser mais cobradas pela banca "${board}" e dedique mais tempo a elas.
    
    Retorne um JSON seguindo esta estrutura exata:
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
    // Configuração do modelo com Schema de Resposta para garantir o JSON correto
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            schedule: {
              type: SchemaType.ARRAY,
              items: {
                type: SchemaType.OBJECT,
                properties: {
                  day: { type: SchemaType.STRING },
                  sessions: {
                    type: SchemaType.ARRAY,
                    items: {
                      type: SchemaType.OBJECT,
                      properties: {
                        subjectName: { type: SchemaType.STRING },
                        duration: { type: SchemaType.NUMBER },
                        focus: { type: SchemaType.STRING }
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

    // Chamada corrigida para o SDK v1+
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text(); // O método .text() é assíncrono agora

    if (!text) {
      throw new Error("Resposta vazia da API do Gemini");
    }

    return JSON.parse(text.trim());
  } catch (error) {
    console.error("Erro detalhado na geração do ciclo:", error);
    throw error;
  }
};