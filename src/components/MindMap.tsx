import React, { useRef, useEffect } from 'react';
import { Transformer } from 'markmap-lib';
import { Markmap as MarkmapView } from 'markmap-view';
import { Toolbar } from 'markmap-toolbar';
import 'markmap-toolbar/dist/style.css';
import { cn } from '../lib/utils';
import { Message, MapStyle } from '../types';

const transformer = new Transformer();

interface MindMapProps {
  markdown: string;
  style?: MapStyle;
  className?: string;
}

export const MindMap: React.FC<MindMapProps> = ({ markdown, style = 'default', className }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const mmRef = useRef<MarkmapView | null>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    let observer: ResizeObserver | null = null;

    const initOrUpdate = () => {
      if (!svgRef.current) return;
      
      const { clientWidth, clientHeight } = svgRef.current;
      if (clientWidth <= 0 || clientHeight <= 0) return;

      try {
        if (!mmRef.current) {
          mmRef.current = MarkmapView.create(svgRef.current, {
            autoFit: true,
            spacingHorizontal: style === 'handmade' ? 150 : 100,
            spacingVertical: style === 'handmade' ? 80 : 40,
            paddingX: 32,
            duration: 500,
          });

          const container = svgRef.current.parentElement;
          if (container && !container.querySelector('.markmap-toolbar')) {
            const toolbar = new Toolbar();
            toolbar.attach(mmRef.current);
            container.appendChild(toolbar.render());
          }
        } else {
          mmRef.current.setOptions({
            spacingHorizontal: style === 'handmade' ? 150 : 100,
            spacingVertical: style === 'handmade' ? 80 : 40,
          });
        }

        const { root } = transformer.transform(markdown);
        mmRef.current.setData(root);
        mmRef.current.fit();

        // Apply styles to SVG elements
        const svg = svgRef.current;
        const styleClass = style === 'handmade' ? 'font-hand' : 'font-sans';
        
        svg.setAttribute('class', cn('w-full h-full transition-all duration-500', styleClass));

        // Inject dynamic style overrides
        let styleTag = svg.querySelector('style.markmap-custom-styles') as HTMLStyleElement;
        if (!styleTag) {
          styleTag = document.createElement('style');
          styleTag.classList.add('markmap-custom-styles');
          svg.prepend(styleTag);
        }

        const handmadeStyles = `
          .markmap-node-text > div { font-family: "Kalam", cursive !important; font-size: 18px !important; color: #8B4513 !important; font-weight: 700 !important; }
          .markmap-link { stroke-width: 3px !important; stroke-dasharray: 4, 4 !important; stroke: #8B4513 !important; opacity: 0.5; }
          .markmap-node-rect { rx: 15; ry: 15; fill-opacity: 0.05 !important; fill: #8B4513 !important; stroke: #8B4513 !important; stroke-dasharray: 5,5 !important; stroke-width: 2px !important; }
          .markmap-node[data-depth="0"] .markmap-node-text > div { font-size: 32px !important; text-decoration: underline; }
        `;

        styleTag.textContent = style === 'handmade' ? handmadeStyles : '';

        // Force colors update in markmap
        mmRef.current.setOptions({
          color: (node: any) => {
            if (style === 'handmade') return '#8B4513';
            return 'currentColor';
          }
        });
        mmRef.current.setData(root);
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        if (msg.includes('SVGLength') || msg.includes('relative length') || (error instanceof Error && error.name === 'NotSupportedError')) {
          return;
        }
        console.warn('Markmap render deferred:', error);
      }
    };

    observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0 && entry.contentRect.height > 0) {
          initOrUpdate();
        }
      }
    });
    
    observer.observe(svgRef.current);
    
    // Initial attempt
    initOrUpdate();

    return () => {
      observer?.disconnect();
    };
  }, [markdown, style]);

  return (
    <div className={cn("relative w-full h-full min-h-[400px] bg-white/10 backdrop-blur-md rounded-[2.5rem] border border-white/20 overflow-hidden shadow-2xl", className)}>
      <svg 
        ref={svgRef} 
        className="w-full h-full" 
        width="800"
        height="600"
      />
    </div>
  );
};
