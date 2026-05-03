import { GoogleGenAI } from "@google/genai";
import { GeminiAnalysisResult } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

const SYSTEM_PROMPT = `
Age como um Especialista em Aprendizagem Acelerada e Mentor de Concursos Públicos (foco INSS).
Objetivo: Analisar o material e criar um MAPA MENTAL INTERATIVO E HORIZONTAL.

INSTRUÇÕES DE FORMATO:
1. O mapa mental DEVE ser fornecido em formato MARKDOWN (usando # para níveis) dentro de um bloco de código 'markdown'.
Exemplo:
\`\`\`markdown
# Previdência Social
## Segurados 🔴
### Obrigatórios
### Facultativos
## Benefícios 🔵
### Aposentadoria
### Auxílios
\`\`\`

2. O mapa será renderizado de forma horizontal e INTERATIVA (clicável para expandir/recolher).
3. Use emojis estratégicos: 🔴 (Alta Relevância), 🟡 (Prazos/Atenção), 🟢 (Conceitos Base).

EM SEGUIDA: Forneça uma explicação detalhada focada em memorização de alto rendimento.
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
    
    // Extract markdown block for markmap
    const mapMatch = fullText.match(/```markdown\n([\s\S]*?)\n```/);
    const code = mapMatch ? mapMatch[1].trim() : "";
    
    let explanation = fullText;
    if (mapMatch) {
      explanation = fullText.replace(mapMatch[0], "").trim();
    }

    yield {
      explanation,
      mermaidCode: code,
      mapType: 'markdown' as const,
      isComplete: false
    };
  }

  const finalMapMatch = fullText.match(/```markdown\n([\s\S]*?)\n```/);
  const finalCode = finalMapMatch ? finalMapMatch[1].trim() : "";
  
  let finalExplanation = fullText;
  if (finalMapMatch) {
    finalExplanation = fullText.replace(finalMapMatch[0], "").trim();
  }

  yield {
    explanation: finalExplanation,
    mermaidCode: finalCode,
    mapType: 'markdown' as const,
    isComplete: true
  };
}
