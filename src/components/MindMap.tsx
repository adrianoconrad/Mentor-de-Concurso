import React, { useRef, useEffect } from 'react';
import { Transformer } from 'markmap-lib';
import { Markmap as MarkmapView } from 'markmap-view';
import { cn } from '../lib/utils';
import { Message, MapStyle } from '../types';
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';

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
            initialExpandLevel: 1,
            spacingHorizontal: style === 'handmade' ? 150 : 100,
            spacingVertical: style === 'handmade' ? 80 : 40,
            paddingX: 32,
            duration: 500,
          });
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

        // Add gradients to SVG defs
        let defs = svg.querySelector('defs');
        if (!defs) {
          defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
          svg.prepend(defs);
        }
        defs.innerHTML = `
          <linearGradient id="grad-level-1" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#5b21b6" />
            <stop offset="100%" stop-color="#2563eb" />
          </linearGradient>
          <linearGradient id="grad-level-2" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#2563eb" />
            <stop offset="100%" stop-color="#10b981" />
          </linearGradient>
        `;

        const handmadeStyles = `
          .markmap-node-text > div { font-family: "Kalam", cursive !important; font-size: 18px !important; color: #8B4513 !important; font-weight: 700 !important; }
          .markmap-link { stroke-width: 3px !important; stroke-dasharray: 4, 4 !important; stroke: #8B4513 !important; opacity: 0.5; }
          .markmap-node-rect { rx: 15; ry: 15; fill-opacity: 0.05 !important; fill: #8B4513 !important; stroke: #8B4513 !important; stroke-dasharray: 5,5 !important; stroke-width: 2px !important; }
          .markmap-node[data-depth="0"] .markmap-node-text > div { font-size: 32px !important; text-decoration: underline; }
          span[title] { border-bottom: 1px dashed rgba(139, 69, 19, 0.4); cursor: help; }
        `;

        const defaultStyles = `
          .markmap-node-text > div {
            padding: 12px 28px !important;
            border-radius: 999px !important;
            font-weight: 700 !important;
            transition: all 0.4s cubic-bezier(0.23, 1, 0.32, 1) !important;
            line-height: 1.4 !important;
            text-align: center !important;
            min-width: 140px !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            border: 1px solid rgba(255, 255, 255, 0.3) !important;
            text-shadow: 0 2px 4px rgba(0,0,0,0.3) !important;
          }

          /* Level 0 - Centro (Roxo Profundo Glass Orb) */
          .markmap-node[data-depth="0"] .markmap-node-text > div {
            background: radial-gradient(circle at 30% 30%, #a78bfa 0%, #5b21b6 50%, #4c1d95 100%) !important;
            color: #ffffff !important;
            font-size: 24px !important;
            box-shadow: 
              inset 0 4px 6px -1px rgba(255,255,255,0.4),
              0 0 20px rgba(139, 92, 246, 0.4),
              0 25px 50px -12px rgba(0, 0, 0, 0.5) !important;
            border: 2px solid rgba(255, 255, 255, 0.4) !important;
          }

          /* Level 1 - Ramos Principais (Azul Cobalto) */
          .markmap-node[data-depth="1"] .markmap-node-text > div {
            background: radial-gradient(circle at 30% 30%, #60a5fa 0%, #2563eb 50%, #1e40af 100%) !important;
            color: white !important;
            font-size: 16px !important;
            box-shadow: 
              inset 0 2px 4px rgba(255,255,255,0.3),
              0 0 15px rgba(59, 130, 246, 0.3),
              0 15px 25px -5px rgba(0, 0, 0, 0.3) !important;
          }

          /* Level 2+ - Detalhes (Verde Esmeralda) */
          .markmap-node[data-depth="2"] .markmap-node-text > div,
          .markmap-node[data-depth="3"] .markmap-node-text > div,
          .markmap-node[data-depth="4"] .markmap-node-text > div,
          .markmap-node[data-depth="5"] .markmap-node-text > div {
            background: radial-gradient(circle at 30% 30%, #34d399 0%, #10b981 50%, #065f46 100%) !important;
            color: white !important;
            font-size: 13px !important;
            box-shadow: 
              inset 0 2px 4px rgba(255,255,255,0.2),
              0 0 10px rgba(16, 185, 129, 0.2),
              0 4px 6px -1px rgba(0, 0, 0, 0.2) !important;
          }

          /* Hover State - Glow Intensified */
          .markmap-node:hover .markmap-node-text > div {
            transform: scale(1.1) translateY(-5px) !important;
            filter: brightness(1.2) contrast(1.1) !important;
            z-index: 50 !important;
            box-shadow: 
              inset 0 4px 8px rgba(255,255,255,0.5),
              0 20px 40px rgba(0,0,0,0.4),
              0 0 30px currentColor !important;
          }

          /* Mentoria Explanation Link Styling */
          span[title] { 
            border-bottom: none !important; 
            cursor: help !important;
          }

          /* Organic Filaments (Links) */
          .markmap-link {
            stroke: #64748b !important;
            stroke-width: 5px !important;
            stroke-opacity: 0.25 !important;
            transition: all 0.5s ease-in-out !important;
            stroke-linecap: round !important;
            filter: drop-shadow(0 0 4px rgba(255,255,255,0.2));
          }

          /* Pulse points at junctions */
          .markmap-node-circle {
            fill: #ffffff !important;
            stroke: rgba(255,255,255,0.5) !important;
            stroke-width: 2px !important;
            r: 5 !important;
            filter: drop-shadow(0 0 8px rgba(255,255,255,0.8));
            animation: pulse-glow 2s infinite cubic-bezier(0.4, 0, 0.6, 1);
          }

          @keyframes pulse-glow {
            from { transform: scale(0.8); opacity: 0.5; filter: blur(1px); }
            to { transform: scale(1.3); opacity: 1; filter: blur(2px); }
          }

          /* Glow around whole structure */
          .markmap-node, .markmap-link {
            filter: drop-shadow(0 0 2px rgba(255,255,255,0.1));
          }

          .markmap-node:hover + .markmap-link {
            stroke-opacity: 0.8 !important;
            stroke-width: 6px !important;
            stroke: #6366f1 !important; /* Indigo glow for link on hover */
          }
        `;

        styleTag.textContent = style === 'handmade' ? handmadeStyles : defaultStyles;

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

  const handleZoomIn = () => mmRef.current?.rescale(1.2);
  const handleZoomOut = () => mmRef.current?.rescale(0.8);
  const handleFit = () => mmRef.current?.fit();

  return (
    <div className={cn("relative w-full h-full min-h-[440px] bg-[#f9fafb] rounded-[2.5rem] border border-gray-200/50 overflow-hidden shadow-2xl", className)}>
      {/* Paper Texture Overlay */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[url('https://www.transparenttextures.com/patterns/clean-gray-paper.png')] z-10" />
      
      {/* Soft Ambient Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-200/20 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-200/20 blur-[120px] rounded-full pointer-events-none" />
      {!markdown ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center space-y-4 opacity-40">
          <div className="w-12 h-12 border-4 border-[#4A5D23] border-t-transparent rounded-full animate-spin" />
          <p className="font-mono text-[10px] font-black uppercase tracking-[0.4em]">Aguardando estrutura...</p>
        </div>
      ) : (
        <div className="absolute bottom-6 right-6 flex flex-col gap-2 z-20">
          <button 
            onClick={handleZoomIn}
            className="p-3 bg-white/40 backdrop-blur-xl border border-white/40 rounded-2xl text-[#4A5D23] hover:bg-white/60 transition-all shadow-xl"
            title="Ampliar"
          >
            <ZoomIn size={18} />
          </button>
          <button 
            onClick={handleZoomOut}
            className="p-3 bg-white/40 backdrop-blur-xl border border-white/40 rounded-2xl text-[#4A5D23] hover:bg-white/60 transition-all shadow-xl"
            title="Reduzir"
          >
            <ZoomOut size={18} />
          </button>
          <button 
            onClick={handleFit}
            className="p-3 bg-[#4A5D23] text-white rounded-2xl hover:scale-105 transition-all shadow-xl"
            title="Ajustar à Tela"
          >
            <Maximize2 size={18} />
          </button>
        </div>
      )}
      <svg 
        ref={svgRef} 
        className={cn("w-full h-full", !markdown && "opacity-0")}
        width="800"
        height="600"
      />
    </div>
  );
};
