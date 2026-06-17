'use client';
import { useEffect, useRef, useState } from 'react';
import type { NetworkData, NetworkNode, NetworkEdge } from '@/services/insights/insightsV2Service';

interface Props { data: NetworkData }

interface SimNode extends NetworkNode {
  x: number; y: number; vx: number; vy: number;
}

const REPULSION  = 4000;
const ATTRACTION = 0.006;
const DAMPING    = 0.82;
const REST_LEN   = 100;

export default function NetworkGraph({ data }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef  = useRef<number>(0);
  const nodesRef  = useRef<SimNode[]>([]);
  const [hovered, setHovered] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; node: SimNode } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !data.nodes.length) return;

    const W = canvas.offsetWidth;
    const H = canvas.offsetHeight;
    canvas.width  = W * devicePixelRatio;
    canvas.height = H * devicePixelRatio;
    const ctx = canvas.getContext('2d')!;
    ctx.scale(devicePixelRatio, devicePixelRatio);

    // Initialise nodes at random positions
    nodesRef.current = data.nodes.map(n => ({
      ...n,
      x:  W / 2 + (Math.random() - 0.5) * W * 0.6,
      y:  H / 2 + (Math.random() - 0.5) * H * 0.6,
      vx: 0, vy: 0,
    }));
    const nodes = nodesRef.current;
    const edges = data.edges;

    let tick = 0;
    function simulate() {
      tick++;
      const dampFactor = tick < 120 ? DAMPING : 0.6; // settle faster after convergence

      // Repulsion
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[j].x - nodes[i].x;
          const dy = nodes[j].y - nodes[i].y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = REPULSION / (dist * dist);
          const fx = force * (dx / dist);
          const fy = force * (dy / dist);
          nodes[i].vx -= fx; nodes[i].vy -= fy;
          nodes[j].vx += fx; nodes[j].vy += fy;
        }
      }

      // Attraction along edges
      for (const edge of edges) {
        const a = nodes.find(n => n.id === edge.source);
        const b = nodes.find(n => n.id === edge.target);
        if (!a || !b) continue;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = (dist - REST_LEN) * ATTRACTION * edge.weight;
        const fx = force * (dx / dist);
        const fy = force * (dy / dist);
        a.vx += fx; a.vy += fy;
        b.vx -= fx; b.vy -= fy;
      }

      // Center gravity
      for (const n of nodes) {
        n.vx += (W / 2 - n.x) * 0.003;
        n.vy += (H / 2 - n.y) * 0.003;
      }

      // Update positions with damping + bounds
      for (const n of nodes) {
        n.vx *= dampFactor; n.vy *= dampFactor;
        n.x = Math.max(n.size, Math.min(W - n.size, n.x + n.vx));
        n.y = Math.max(n.size, Math.min(H - n.size, n.y + n.vy));
      }
    }

    function draw() {
      ctx.clearRect(0, 0, W, H);

      // Draw edges
      for (const edge of edges) {
        const a = nodes.find(n => n.id === edge.source);
        const b = nodes.find(n => n.id === edge.target);
        if (!a || !b) continue;

        const isActive = hovered === a.id || hovered === b.id;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.strokeStyle = isActive ? 'rgba(26,26,26,0.35)' : 'rgba(180,170,160,0.25)';
        ctx.lineWidth = isActive ? 1.5 : 0.8;
        ctx.stroke();

        // Animated particle along edge
        const t = ((Date.now() / 2200 + edges.indexOf(edge) * 0.17) % 1);
        const px = a.x + (b.x - a.x) * t;
        const py = a.y + (b.y - a.y) * t;
        ctx.beginPath();
        ctx.arc(px, py, 2, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(181,169,154,0.7)';
        ctx.fill();
      }

      // Draw nodes
      for (const n of nodes) {
        const r = n.size;
        const isHov = hovered === n.id;

        // Glow for lead nodes or hovered
        if (n.type === 'lead' || isHov) {
          ctx.beginPath();
          ctx.arc(n.x, n.y, r * 1.8, 0, Math.PI * 2);
          const g = ctx.createRadialGradient(n.x, n.y, r * 0.5, n.x, n.y, r * 1.8);
          g.addColorStop(0, `${n.color}30`);
          g.addColorStop(1, 'transparent');
          ctx.fillStyle = g;
          ctx.fill();
        }

        // Node body
        ctx.beginPath();
        ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
        ctx.fillStyle = isHov ? n.color : n.color + 'dd';
        ctx.fill();

        // Label
        const fontSize = n.type === 'category' ? 10 : 9;
        ctx.font = `${isHov ? 'bold' : '500'} ${fontSize}px system-ui`;
        ctx.fillStyle = n.type === 'category' ? 'white' : '#3A3530';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        if (n.type !== 'lead') {
          ctx.fillText(n.label, n.x, n.y);
        }

        // Count badge for categories
        if (n.type === 'category' && n.count > 0) {
          ctx.font = '8px system-ui';
          ctx.fillStyle = 'rgba(255,255,255,0.6)';
          ctx.fillText(`${n.count}`, n.x, n.y + fontSize + 2);
        }
      }
    }

    let running = true;
    function loop() {
      if (!running) return;
      simulate();
      draw();
      frameRef.current = requestAnimationFrame(loop);
    }
    loop();

    // Mouse hover
    const handleMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const found = nodesRef.current.find(n => {
        const dx = n.x - mx; const dy = n.y - my;
        return Math.sqrt(dx * dx + dy * dy) <= n.size + 4;
      });
      setHovered(found?.id ?? null);
      setTooltip(found ? { x: mx, y: my, node: found } : null);
    };
    canvas.addEventListener('mousemove', handleMove);

    return () => {
      running = false;
      cancelAnimationFrame(frameRef.current);
      canvas.removeEventListener('mousemove', handleMove);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  if (!data.nodes.length) return (
    <div className="flex items-center justify-center h-full text-bega-text-3 text-[12px]">
      Network will populate as queries and leads accumulate.
    </div>
  );

  return (
    <div className="relative w-full h-full">
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-crosshair"
        style={{ background: 'transparent' }}
      />
      {tooltip && (
        <div
          className="absolute pointer-events-none bg-bega-black text-white text-[11px] px-2.5 py-1.5 rounded-lg shadow-xl"
          style={{ left: tooltip.x + 12, top: tooltip.y - 16 }}
        >
          <span className="font-semibold">{tooltip.node.label}</span>
          {tooltip.node.count > 0 && (
            <span className="text-white/60 ml-1.5">· {tooltip.node.count} {tooltip.node.type === 'lead' ? 'lead' : 'queries'}</span>
          )}
        </div>
      )}
      <div className="absolute bottom-3 right-3 flex flex-col gap-1.5">
        {[
          { color: '#1A1A1A', label: 'Category' },
          { color: '#5A5750', label: 'Topic' },
          { color: '#B5A99A', label: 'Lead' },
        ].map(l => (
          <div key={l.label} className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: l.color }} />
            <span className="text-[9px] text-bega-text-3">{l.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
