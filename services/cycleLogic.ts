
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

export const gerarCiclos = (subjects: CycleSubject[], perCycle: number): Ciclo[] => {
  if (!subjects.length) return [];
  
  const cycles: Ciclo[] = [];
  
  for (let i = 1; i <= 4; i++) {
    const selected: Array<Partial<CycleSubject> & { instanceId: string }> = [];
    
    // Lógica de distribuição: seleciona matérias de forma rotativa para cada ciclo
    for (let j = 0; j < perCycle; j++) {
      const index = ( (i - 1) * 2 + j ) % subjects.length;
      const sub = subjects[index];
      selected.push({
        ...sub,
        instanceId: `${sub.id}-c${i}-${j}-${Date.now()}`
      });
    }

    cycles.push({
      id: i,
      materias: selected,
      tempoTotal: selected.reduce((acc, s) => acc + (s.tempoEstudo || 0), 0)
    });
  }
  
  return cycles;
};
