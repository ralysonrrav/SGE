
import { CycleSubject, Ciclo, NivelConhecimento, PesoDisciplina } from '../types';

export const calcularTempoEstudo = (nivel: NivelConhecimento, peso: PesoDisciplina): number => {
  let base = 60;
  
  switch (nivel) {
    case NivelConhecimento.INICIANTE: base = 90; break;
    case NivelConhecimento.INTERMEDIARIO: base = 60; break;
    case NivelConhecimento.AVANCADO: base = 45; break;
  }
  
  switch (peso) {
    case PesoDisciplina.ALTO: base += 30; break;
    case PesoDisciplina.BAIXO: base -= 15; break;
  }
  
  return base;
};

/**
 * Algoritmo de Geração Estratégica
 * Garante que todas as matérias da lista apareçam pelo menos uma vez
 * antes de iniciar qualquer repetição.
 */
export const gerarCiclos = (subjects: CycleSubject[], perCycle: number, totalCycles: number = 4): Ciclo[] => {
  if (!subjects.length) return [];
  
  const cycles: Ciclo[] = [];
  let subjectPointer = 0; // Ponteiro global para garantir cobertura total
  
  for (let i = 1; i <= totalCycles; i++) {
    const selected: Array<Partial<CycleSubject> & { instanceId: string }> = [];
    
    for (let j = 0; j < perCycle; j++) {
      // Seleciona a matéria baseada no ponteiro global
      const sub = subjects[subjectPointer % subjects.length];
      
      // Criamos um instanceId único que vincula a matéria à sua posição específica no plano
      selected.push({
        ...sub,
        instanceId: `${sub.id}-f${i}-p${j}-${Math.random().toString(36).substr(2, 5)}`
      });
      
      subjectPointer++; // Avança o ponteiro para a próxima matéria da lista
    }

    cycles.push({
      id: i,
      materias: selected,
      tempoTotal: selected.reduce((acc, s) => acc + (s.tempoEstudo || 0), 0)
    });
  }
  
  return cycles;
};
