import { GoogleGenAI } from "@google/genai";
import { GeminiAnalysisResult } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

const SYSTEM_PROMPT = `
Age como o **Study Mentor**, Especialista em Aprendizagem Acelerada e Mentor de Concursos Públicos de Elite.
Seu objetivo é transformar materiais complexos em Mapas Mentais exaustivos e fornecer uma Mentoria de Alto Nível que facilite a compreensão profunda e a memorização.

ESTRUTURA DA RESPOSTA (OBRIGATÓRIA):
1. Primeiro, forneça o MAPA MENTAL em um bloco de código markdown (\`\`\`markdown ... \`\`\`).
2. Logo após o mapa, forneça a seção **MENTORIA STUDY MENTOR**, onde você explicará a matéria de forma exaustiva.

INSTRUÇÕES PARA O MAPA MENTAL:
- PROFUNDIDADE: O mapa deve ser exaustivo, cobrindo TODOS os pontos relevantes do material.
- TOOLTIPS: CADA NÓ do mapa DEVE ser envolto em uma tag <span title="..."> com uma explicação pedagógica curta.
  Exemplo: # <span title="Conjunto de princípios e normas que regem a previdência">Direito Previdenciário</span>
- ESTILO: Use emojis para hierarquia: 🔴 (Prioridade/Alta Relevância), 🟡 (Prazos/Atenção), 🟢 (Conceitos/Base).

INSTRUÇÕES PARA A MENTORIA (APÓS O MAPA):
- ABRANGÊNCIA: Não seja superficial. Explique os conceitos fundamentais do material de forma exaustiva e detalhada.
- EXEMPLOS PRÁTICOS: Use SEMPRE exemplos do cotidiano e situações práticas para ilustrar conceitos abstratos (ex: "Imagine que você é um segurado que..."). Isso é vital para a neurociência da aprendizagem.
- LINGUAGEM: Use uma linguagem clara, mas técnica o suficiente para preparar o aluno para o nível da prova.
- DICAS DE ESTUDO: Inclua gatilhos mentais ou mnemônicos para facilitar a retenção.

Mantenha o foco em alta performance e clareza absoluta.
`;

export async function* analyzeStudyMaterialStream(content: string) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY não configurada.");
  }

  const result = await ai.models.generateContentStream({
    model: "gemini-3-flash-preview",
    contents: [{ parts: [{ text: content }] }],
    config: {
      systemInstruction: SYSTEM_PROMPT,
      temperature: 0.7,
    },
  });

  let fullText = "";
  for await (const chunk of result) {
    const chunkText = chunk.text;
    fullText += chunkText;
    
    // Extract markdown block for markmap (supports ```markdown, ```md, ```markmap, or just ```)
    // We attempt to find the start of a block and capture everything until the end or the current chunk end
    const mapStartMatch = fullText.match(/```(?:markdown|md|markmap)?\s+/i);
    let code = "";
    let explanation = fullText;

    if (mapStartMatch) {
      const startIndex = mapStartMatch.index! + mapStartMatch[0].length;
      const remainingText = fullText.slice(startIndex);
      const mapEndMatch = remainingText.match(/```/);
      
      if (mapEndMatch) {
        code = remainingText.slice(0, mapEndMatch.index).trim();
        explanation = (fullText.slice(0, mapStartMatch.index) + remainingText.slice(mapEndMatch.index + 3)).trim();
      } else {
        // Still streaming the map
        code = remainingText.trim();
        explanation = fullText.slice(0, mapStartMatch.index).trim();
      }
    } else if (fullText.includes('# ')) {
      // Fallback: If no code block yet, but contains markdown headers, 
      // maybe the model is not using blocks. Let's try to see if it's mostly headers.
      // We only do this if it seems like a map is starting (e.g. line starts with #)
      const lines = fullText.split('\n');
      const hasHeaders = lines.some(line => line.trim().startsWith('#'));
      if (hasHeaders) {
        code = fullText.trim();
        explanation = "Gerando mapa mental...";
      }
    }
    
    yield {
      explanation,
      mermaidCode: code,
      mapType: 'markdown' as const,
      isComplete: false
    };
  }

  // Final check for the map
  const finalMapMatch = fullText.match(/```(?:markdown|md|markmap)?\s+([\s\S]*?)(?:```|$)/i);
  let finalCode = finalMapMatch ? finalMapMatch[1].trim() : "";
  
  if (!finalCode && fullText.includes('# ')) {
    // Final fallback
    finalCode = fullText.trim();
  }
  
  let finalExplanation = fullText;
  if (finalMapMatch) {
    finalExplanation = fullText.replace(finalMapMatch[0], "").trim();
  } else if (finalCode === fullText.trim()) {
    finalExplanation = ""; // It was all map
  }

  yield {
    explanation: finalExplanation,
    mermaidCode: finalCode,
    mapType: 'markdown' as const,
    isComplete: true
  };
}
