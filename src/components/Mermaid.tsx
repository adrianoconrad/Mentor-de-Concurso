import React, { useEffect, useRef } from 'react';
import mermaid from 'mermaid';

mermaid.initialize({
  startOnLoad: true,
  theme: 'base',
  themeVariables: {
    primaryColor: '#e4e3e0',
    primaryTextColor: '#141414',
    primaryBorderColor: '#141414',
    lineColor: '#141414',
    secondaryColor: '#f5f5f5',
    tertiaryColor: '#fff',
  },
  securityLevel: 'loose',
});

interface MermaidProps {
  chart: string;
}

export const Mermaid: React.FC<MermaidProps> = ({ chart }) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current && chart) {
      ref.current.removeAttribute('data-processed');
      mermaid.contentLoaded();
      
      // We need a unique ID for each render
  const id = `mermaid-${Math.random().toString(36).substring(2, 11)}`;
      
      try {
        mermaid.render(id, chart).then(({ svg }) => {
          if (ref.current) {
            ref.current.innerHTML = svg;
            const svgElement = ref.current.querySelector('svg');
            if (svgElement) {
              svgElement.style.maxWidth = '100%';
              svgElement.style.height = 'auto';
              svgElement.style.display = 'block';
              svgElement.style.margin = '0 auto';
            }
          }
        });
      } catch (error) {
        console.error('Mermaid render error:', error);
        if (ref.current) {
          ref.current.innerHTML = '<p class="text-red-500 font-mono text-xs p-4">Erro de sintaxe no mapa mental. Tente refinar seu material.</p>';
        }
      }
    }
  }, [chart]);

  return (
    <div className="mermaid-container w-full overflow-visible transition-all duration-500" ref={ref} />
  );
};
