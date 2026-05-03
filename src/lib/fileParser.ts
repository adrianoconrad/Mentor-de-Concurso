import * as pdfjsLib from 'pdfjs-dist';

// For Vite, we can import the worker URL directly from the package
// Alternatively, use unpkg which has better coverage for recent versions
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

export async function extractTextFromPDF(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = '';

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item: any) => item.str)
      .join(' ');
    fullText += pageText + '\n';
  }

  return fullText;
}

export async function extractTextFromFile(file: File): Promise<string> {
  const fileType = file.type;

  if (fileType === 'application/pdf') {
    return await extractTextFromPDF(file);
  } else if (fileType === 'text/plain' || file.name.endsWith('.md') || file.name.endsWith('.txt')) {
    return await file.text();
  } else {
    throw new Error('Formato de arquivo não suportado. Use PDF, TXT ou Markdown.');
  }
}
