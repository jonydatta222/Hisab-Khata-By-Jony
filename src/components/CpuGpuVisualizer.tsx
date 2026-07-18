import React, { useEffect, useRef, useState } from 'react';

interface CpuGpuVisualizerProps {
  isBenchmarking: boolean;
  onFpsUpdate?: (fps: number) => void;
  isBangla: boolean;
}

export default function CpuGpuVisualizer({ isBenchmarking, onFpsUpdate, isBangla }: CpuGpuVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(performance.now());
  const frameCountRef = useRef<number>(0);
  const [fpsDisplay, setFpsDisplay] = useState<number>(60);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle resizing fluidly
    const resizeCanvas = () => {
      const parent = canvas.parentElement;
      if (parent) {
        canvas.width = parent.clientWidth * window.devicePixelRatio;
        canvas.height = 180 * window.devicePixelRatio;
        canvas.style.width = '100%';
        canvas.style.height = '180px';
        ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
      }
    };

    resizeCanvas();
    const resizeObserver = new ResizeObserver(() => {
      resizeCanvas();
    });
    if (canvas.parentElement) {
      resizeObserver.observe(canvas.parentElement);
    }

    // Particle class for GPU rendering test
    class Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      color: string;
      alpha: number;

      constructor(w: number, h: number, isBench: boolean) {
        // Particles move from CPU area (left) to GPU area (right)
        this.x = Math.random() * (w * 0.3);
        this.y = Math.random() * h;
        // Faster speed when benchmarking
        this.vx = (Math.random() * 1.5 + 0.8) * (isBench ? 2.5 : 1.0);
        this.vy = (Math.random() * 0.6 - 0.3) * (isBench ? 2.5 : 1.0);
        this.size = Math.random() * 2 + 1;
        this.alpha = Math.random() * 0.5 + 0.3;
        
        // Colors from purple/indigo (CPU) to emerald/teal (GPU)
        const colors = [
          'rgba(139, 92, 246, ', // violet
          'rgba(99, 102, 241, ', // indigo
          'rgba(20, 184, 166, ', // teal
          'rgba(16, 185, 129, '  // emerald
        ];
        this.color = colors[Math.floor(Math.random() * colors.length)];
      }

      update(w: number, h: number, isBench: boolean) {
        this.x += this.vx;
        this.y += this.vy;

        // Wrap around or restart
        if (this.x > w || this.y < 0 || this.y > h) {
          this.x = 0;
          this.y = Math.random() * h;
          this.vx = (Math.random() * 1.5 + 0.8) * (isBench ? 2.5 : 1.0);
          this.vy = (Math.random() * 0.6 - 0.3) * (isBench ? 2.5 : 1.0);
        }
      }

      draw(c: CanvasRenderingContext2D) {
        c.beginPath();
        c.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        c.fillStyle = this.color + this.alpha + ')';
        c.fill();
      }
    }

    // Initialize particles (More particles during benchmark to put actual load on GPU)
    const particleCount = isBenchmarking ? 800 : 150;
    const particles: Particle[] = [];
    const w = canvas.width / window.devicePixelRatio;
    const h = canvas.height / window.devicePixelRatio;

    for (let i = 0; i < particleCount; i++) {
      particles.push(new Particle(w, h, isBenchmarking));
    }

    // 3D Matrix / Lattice rendering variables
    let angleX = 0;
    let angleY = 0;

    // Animation loop
    const render = () => {
      const width = canvas.width / window.devicePixelRatio;
      const height = canvas.height / window.devicePixelRatio;

      // Clear with subtle trail to show motion blur / hardware frame sync
      ctx.fillStyle = 'rgba(15, 23, 42, 0.15)'; // Slate 900
      ctx.fillRect(0, 0, width, height);

      // Draw background grid
      ctx.strokeStyle = 'rgba(51, 65, 85, 0.1)';
      ctx.lineWidth = 0.5;
      const gridSize = 20;
      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // 1. Draw CPU Engine Hub (Left)
      const cpuCenterX = width * 0.18;
      const cpuCenterY = height * 0.5;
      
      // Pulsing glow representing multi-core processing
      const pulseTime = Date.now() * 0.003;
      const pulseRadius = 30 + Math.sin(pulseTime * 2) * 4;
      const cpuGrad = ctx.createRadialGradient(cpuCenterX, cpuCenterY, 5, cpuCenterX, cpuCenterY, pulseRadius + 15);
      cpuGrad.addColorStop(0, 'rgba(124, 58, 237, 0.25)'); // Violet 600
      cpuGrad.addColorStop(1, 'rgba(124, 58, 237, 0)');
      
      ctx.fillStyle = cpuGrad;
      ctx.beginPath();
      ctx.arc(cpuCenterX, cpuCenterY, pulseRadius + 15, 0, Math.PI * 2);
      ctx.fill();

      // CPU central processor circle
      ctx.strokeStyle = '#8b5cf6'; // Violet 500
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cpuCenterX, cpuCenterY, 20, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#1e1b4b'; // Deep Indigo 950
      ctx.fill();

      // Draw Core channels / pins
      ctx.strokeStyle = 'rgba(139, 92, 246, 0.4)';
      ctx.lineWidth = 1;
      for (let j = 0; j < 8; j++) {
        const rad = (j * Math.PI) / 4;
        const startX = cpuCenterX + Math.cos(rad) * 20;
        const startY = cpuCenterY + Math.sin(rad) * 20;
        const endX = cpuCenterX + Math.cos(rad) * (32 + Math.sin(pulseTime + j) * 4);
        const endY = cpuCenterY + Math.sin(rad) * (32 + Math.sin(pulseTime + j) * 4);
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();
        
        ctx.fillStyle = '#a78bfa';
        ctx.beginPath();
        ctx.arc(endX, endY, 2, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = '#ddd6fe';
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('CPU', cpuCenterX, cpuCenterY - 2);
      ctx.fillStyle = '#a78bfa';
      ctx.font = '7px monospace';
      ctx.fillText('THREADS', cpuCenterX, cpuCenterY + 7);

      // 2. Draw GPU Graphics Engine Hub (Right)
      const gpuCenterX = width * 0.82;
      const gpuCenterY = height * 0.5;

      // Rotating 3D wireframe lattice on the GPU side
      const gpuGrad = ctx.createRadialGradient(gpuCenterX, gpuCenterY, 5, gpuCenterX, gpuCenterY, 45);
      gpuGrad.addColorStop(0, 'rgba(20, 184, 166, 0.2)'); // Teal 500
      gpuGrad.addColorStop(1, 'rgba(20, 184, 166, 0)');
      
      ctx.fillStyle = gpuGrad;
      ctx.beginPath();
      ctx.arc(gpuCenterX, gpuCenterY, 45, 0, Math.PI * 2);
      ctx.fill();

      angleX += 0.015;
      angleY += 0.02;

      // Draw 3D Cube nodes & links
      const size = 25;
      const nodes = [
        { x: -size, y: -size, z: -size },
        { x: size, y: -size, z: -size },
        { x: size, y: size, z: -size },
        { x: -size, y: size, z: -size },
        { x: -size, y: -size, z: size },
        { x: size, y: -size, z: size },
        { x: size, y: size, z: size },
        { x: -size, y: size, z: size }
      ];

      // Rotate nodes in 3D
      const projectedNodes = nodes.map(node => {
        // Rotate X
        let y1 = node.y * Math.cos(angleX) - node.z * Math.sin(angleX);
        let z1 = node.y * Math.sin(angleX) + node.z * Math.cos(angleX);
        // Rotate Y
        let x2 = node.x * Math.cos(angleY) + z1 * Math.sin(angleY);
        let z2 = -node.x * Math.sin(angleY) + z1 * Math.cos(angleY);

        // Perspective projection
        const distance = 100;
        const scale = distance / (distance + z2);
        return {
          x: gpuCenterX + x2 * scale,
          y: gpuCenterY + y1 * scale,
          z: z2
        };
      });

      // Draw cube edges
      ctx.strokeStyle = 'rgba(20, 184, 166, 0.5)'; // Teal 500
      ctx.lineWidth = 1;
      const drawEdge = (i: number, j: number) => {
        ctx.beginPath();
        ctx.moveTo(projectedNodes[i].x, projectedNodes[i].y);
        ctx.lineTo(projectedNodes[j].x, projectedNodes[j].y);
        ctx.stroke();
      };

      // Connect vertices
      for (let i = 0; i < 4; i++) {
        drawEdge(i, (i + 1) % 4);
        drawEdge(i + 4, ((i + 1) % 4) + 4);
        drawEdge(i, i + 4);
      }

      // Draw vertices
      projectedNodes.forEach(node => {
        ctx.fillStyle = '#2dd4bf'; // Teal 400
        ctx.beginPath();
        ctx.arc(node.x, node.y, 2.5, 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.fillStyle = '#ccfbf1';
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('GPU', gpuCenterX, gpuCenterY - 2);
      ctx.fillStyle = '#2dd4bf';
      ctx.font = '7px monospace';
      ctx.fillText('COMPOSIT', gpuCenterX, gpuCenterY + 7);

      // 3. Draw streaming particles moving from CPU -> GPU
      particles.forEach(p => {
        p.update(width, height, isBenchmarking);
        p.draw(ctx);
      });

      // 4. Draw central data stream bridge lines
      ctx.strokeStyle = 'rgba(99, 102, 241, 0.15)'; // Indigo 500
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(cpuCenterX + 25, cpuCenterY - 10);
      ctx.lineTo(gpuCenterX - 45, gpuCenterY - 10);
      ctx.moveTo(cpuCenterX + 25, cpuCenterY + 10);
      ctx.lineTo(gpuCenterX - 45, gpuCenterY + 10);
      ctx.stroke();

      // Data packets moving along the central bridge
      const packetSpeed = 0.05;
      const packetCount = 3;
      for (let k = 0; k < packetCount; k++) {
        const offset = ((Date.now() * packetSpeed) % 100) / 100;
        const progress = (offset + k / packetCount) % 1;
        
        const px1 = cpuCenterX + 25 + (gpuCenterX - 45 - (cpuCenterX + 25)) * progress;
        const py1 = cpuCenterY - 10;
        const py2 = cpuCenterY + 10;

        ctx.fillStyle = '#818cf8'; // Indigo 400
        ctx.beginPath();
        ctx.arc(px1, py1, 3.5, 0, Math.PI * 2);
        ctx.arc(px1, py2, 3.5, 0, Math.PI * 2);
        ctx.fill();
        
        // Glow effect
        ctx.shadowColor = '#6366f1';
        ctx.shadowBlur = 4;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(px1, py1, 1.5, 0, Math.PI * 2);
        ctx.arc(px1, py2, 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0; // reset
      }

      // 5. Measure and display FPS
      frameCountRef.current++;
      const now = performance.now();
      const elapsed = now - lastTimeRef.current;
      if (elapsed >= 500) { // Update every 0.5 seconds
        const fps = Math.round((frameCountRef.current * 1000) / elapsed);
        setFpsDisplay(fps);
        if (onFpsUpdate) {
          onFpsUpdate(fps);
        }
        frameCountRef.current = 0;
        lastTimeRef.current = now;
      }

      // Draw FPS indicator top-right of canvas
      ctx.fillStyle = 'rgba(15, 23, 42, 0.6)';
      ctx.fillRect(width - 75, 8, 68, 16);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.strokeRect(width - 75, 8, 68, 16);

      ctx.fillStyle = fpsDisplay >= 50 ? '#10b981' : fpsDisplay >= 30 ? '#f59e0b' : '#ef4444';
      ctx.beginPath();
      ctx.arc(width - 67, 16, 3, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 8px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`FPS: ${fpsDisplay}`, width - 58, 19);

      // Benchmarking label
      if (isBenchmarking) {
        ctx.fillStyle = 'rgba(239, 68, 68, 0.2)';
        ctx.fillRect(8, 8, 140, 18);
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)';
        ctx.strokeRect(8, 8, 140, 18);
        ctx.fillStyle = '#fca5a5';
        ctx.font = 'bold 8px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(isBangla ? '🚨 জিপিইউ বেঞ্চমার্ক টেস্ট...' : '🚨 GPU BENCHMARK ACTIVE...', 14, 20);
      } else {
        ctx.fillStyle = 'rgba(20, 184, 166, 0.15)';
        ctx.fillRect(8, 8, 125, 18);
        ctx.strokeStyle = 'rgba(20, 184, 166, 0.3)';
        ctx.strokeRect(8, 8, 125, 18);
        ctx.fillStyle = '#99f6e4';
        ctx.font = 'bold 8px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(isBangla ? '⚡ কো-প্রসেসর সক্রিয়' : '⚡ CO-PROCESSOR ACTIVE', 14, 20);
      }

      animationRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      resizeObserver.disconnect();
    };
  }, [isBenchmarking, onFpsUpdate, isBangla, fpsDisplay]);

  return (
    <div className="w-full bg-slate-950 rounded-xl overflow-hidden relative border border-slate-800 shadow-inner">
      <canvas ref={canvasRef} className="block w-full h-[180px]" />
    </div>
  );
}
