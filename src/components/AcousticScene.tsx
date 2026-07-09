import React, { useRef, useEffect, useState } from 'react';
import { SoundPosition, EarLevels } from '../types';
import { AudioEngine } from '../audioEngine';
import { Compass } from 'lucide-react';

interface AcousticSceneProps {
  position: SoundPosition;
  onChangePosition: (pos: SoundPosition) => void;
  audioEngine: AudioEngine;
  isPlaying: boolean;
  isDarkMode: boolean;
}

export const AcousticScene: React.FC<AcousticSceneProps> = ({
  position,
  onChangePosition,
  audioEngine,
  isPlaying,
  isDarkMode,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [dimensions, setDimensions] = useState({ width: 380, height: 380 });

  // Handle Resize of canvas container
  useEffect(() => {
    if (!containerRef.current) return;
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width } = entry.contentRect;
        // Keep it square
        const size = Math.max(280, Math.min(width, 420));
        setDimensions({ width: size, height: size });
      }
    });

    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  // Main Canvas Animation loop for 60fps oscilloscope rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    const render = () => {
      // Clear with background color
      ctx.clearRect(0, 0, dimensions.width, dimensions.height);

      // Themes config
      const colors = {
        gridLines: isDarkMode ? 'rgba(125, 211, 252, 0.12)' : 'rgba(79, 70, 229, 0.08)',
        gridSubLines: isDarkMode ? 'rgba(125, 211, 252, 0.04)' : 'rgba(79, 70, 229, 0.03)',
        axes: isDarkMode ? 'rgba(255, 255, 255, 0.18)' : 'rgba(100, 116, 139, 0.15)',
        text: isDarkMode ? '#94a3b8' : '#64748b',
        head: isDarkMode ? '#1e293b' : '#cbd5e1',
        headOutline: isDarkMode ? '#475569' : '#94a3b8',
        headphones: isDarkMode ? '#38bdf8' : '#4f46e5',
        source: isDarkMode ? '#06b6d4' : '#2563eb',
        sourceOuter: isDarkMode ? 'rgba(6, 182, 212, 0.15)' : 'rgba(37, 99, 235, 0.12)',
        waveformL: isDarkMode ? '#06b6d4' : '#4f46e5',
        waveformR: isDarkMode ? '#10b981' : '#0d9488',
        directionIndicator: isDarkMode ? '#f43f5e' : '#e11d48',
      };

      const centerX = dimensions.width / 2;
      const centerY = dimensions.height / 2;
      const radiusX = dimensions.width / 2;
      const radiusY = dimensions.height / 2;

      // 1. Draw Concentric Sonar Circles
      ctx.strokeStyle = colors.gridLines;
      ctx.lineWidth = 1;
      for (let i = 1; i <= 5; i++) {
        ctx.beginPath();
        ctx.arc(centerX, centerY, (i / 5) * (dimensions.width / 2 - 20), 0, Math.PI * 2);
        ctx.stroke();

        // Add subtle labels for distance
        ctx.fillStyle = colors.text;
        ctx.font = '10px "JetBrains Mono", monospace';
        ctx.fillText(`${i}m`, centerX + (i / 5) * (dimensions.width / 2 - 20) - 8, centerY - 4);
      }

      // 2. Draw Cross Axes
      ctx.strokeStyle = colors.axes;
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      // X-Axis
      ctx.beginPath();
      ctx.moveTo(10, centerY);
      ctx.lineTo(dimensions.width - 10, centerY);
      ctx.stroke();
      // Z-Axis
      ctx.beginPath();
      ctx.moveTo(centerX, 10);
      ctx.lineTo(centerX, dimensions.height - 10);
      ctx.stroke();
      ctx.setLineDash([]);

      // Axis labels
      ctx.fillStyle = colors.text;
      ctx.font = '9px "Inter", sans-serif';
      ctx.fillText('GAUCHE (-)', 12, centerY - 8);
      ctx.fillText('DROITE (+)', dimensions.width - 65, centerY - 8);
      ctx.fillText('AVANT (+)', centerX - 24, 20);
      ctx.fillText('ARRIÈRE (-)', centerX - 28, dimensions.height - 12);

      // 3. Draw Listener's Head
      const headRadius = 24;
      ctx.beginPath();
      ctx.arc(centerX, centerY, headRadius, 0, Math.PI * 2);
      ctx.fillStyle = colors.head;
      ctx.fill();
      ctx.strokeStyle = colors.headOutline;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Nose to indicate direction (looking forward towards top of canvas!)
      ctx.beginPath();
      ctx.moveTo(centerX - 4, centerY - headRadius + 2);
      ctx.lineTo(centerX, centerY - headRadius - 6);
      ctx.lineTo(centerX + 4, centerY - headRadius + 2);
      ctx.closePath();
      ctx.fillStyle = colors.headOutline;
      ctx.fill();

      // Fetch waveforms and levels from audio engine
      const levels = audioEngine.getLevels();
      const waveforms = audioEngine.getWaveforms();

      // 4. Draw Headphones with real-time waveform oscilloscopes!
      const headphoneW = 8;
      const headphoneH = 20;
      const leftEarX = centerX - headRadius - headphoneW / 2;
      const rightEarX = centerX + headRadius + headphoneW / 2;

      // Draw Headphone Band
      ctx.beginPath();
      ctx.arc(centerX, centerY, headRadius + 1, Math.PI, 0, false);
      ctx.strokeStyle = colors.headphones;
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Left Earphone
      ctx.fillStyle = colors.headphones;
      ctx.beginPath();
      ctx.roundRect(leftEarX - headphoneW / 2, centerY - headphoneH / 2, headphoneW, headphoneH, 4);
      ctx.fill();

      // Right Earphone
      ctx.beginPath();
      ctx.roundRect(rightEarX - headphoneW / 2, centerY - headphoneH / 2, headphoneW, headphoneH, 4);
      ctx.fill();

      // Left and Right Oscilloscope Waves!
      // We draw them flowing outwards from the headphones
      if (isPlaying) {
        // Draw Left Oscilloscope
        ctx.strokeStyle = colors.waveformL;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        const leftWave = waveforms.left;
        const waveLenL = leftWave.length;
        const maxWaveHeight = 16;

        for (let i = 0; i < waveLenL; i++) {
          const progress = i / (waveLenL - 1);
          // Flow outwards (leftwards)
          const wx = leftEarX - 6 - progress * 35;
          // Offset inside the sample values (amplitude is generally -1..1)
          const sample = waveLenL > 0 ? leftWave[i] : 0;
          const wy = centerY + sample * maxWaveHeight;

          if (i === 0) ctx.moveTo(wx, wy);
          else ctx.lineTo(wx, wy);
        }
        ctx.stroke();

        // Draw Right Oscilloscope
        ctx.strokeStyle = colors.waveformR;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        const rightWave = waveforms.right;
        const waveLenR = rightWave.length;

        for (let i = 0; i < waveLenR; i++) {
          const progress = i / (waveLenR - 1);
          // Flow outwards (rightwards)
          const wx = rightEarX + 6 + progress * 35;
          const sample = waveLenR > 0 ? rightWave[i] : 0;
          const wy = centerY + sample * maxWaveHeight;

          if (i === 0) ctx.moveTo(wx, wy);
          else ctx.lineTo(wx, wy);
        }
        ctx.stroke();

        // Draw pulsating volumetric arcs for extra juicy spatial feeling
        ctx.strokeStyle = `rgba(6, 182, 212, ${levels.left * 0.4})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(centerX - headRadius - 6, centerY, 8 + levels.left * 15, Math.PI * 0.7, Math.PI * 1.3);
        ctx.stroke();

        ctx.strokeStyle = `rgba(16, 185, 129, ${levels.right * 0.4})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(centerX + headRadius + 6, centerY, 8 + levels.right * 15, -Math.PI * 0.3, Math.PI * 0.3);
        ctx.stroke();
      } else {
        // Draw idle straight line
        ctx.strokeStyle = isDarkMode ? 'rgba(148, 163, 184, 0.2)' : 'rgba(100, 116, 139, 0.2)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(leftEarX - 6, centerY);
        ctx.lineTo(leftEarX - 35, centerY);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(rightEarX + 6, centerY);
        ctx.lineTo(rightEarX + 35, centerY);
        ctx.stroke();
      }

      // 5. Draw Sound Source Dot (Coordinates scaled)
      // Map [-5, 5] position coordinates to canvas pixels
      const margin = 20;
      const usableHalfW = dimensions.width / 2 - margin;
      const usableHalfH = dimensions.height / 2 - margin;

      const sourceCanvasX = centerX + (position.x / 5) * usableHalfW;
      // Note: +Z is Front (top of canvas), so subtract position.z from centerY
      const sourceCanvasY = centerY - (position.z / 5) * usableHalfH;

      // Draw distance vector line
      ctx.strokeStyle = isDarkMode ? 'rgba(56, 189, 248, 0.18)' : 'rgba(79, 70, 229, 0.15)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(sourceCanvasX, sourceCanvasY);
      ctx.stroke();

      // Draw elevation (Y) visualization bar under the source
      // If elevation is non-zero, draw a small vertical scale bar next to the source
      const elevH = (position.y / 5) * 20;
      ctx.strokeStyle = position.y >= 0 ? '#10b981' : '#ef4444';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(sourceCanvasX + 14, sourceCanvasY);
      ctx.lineTo(sourceCanvasX + 14, sourceCanvasY - elevH);
      ctx.stroke();

      // Little dot at top of elevation bar
      ctx.fillStyle = position.y >= 0 ? '#10b981' : '#ef4444';
      ctx.beginPath();
      ctx.arc(sourceCanvasX + 14, sourceCanvasY - elevH, 2, 0, Math.PI * 2);
      ctx.fill();

      // Draw multiple glowing outer ripples emitting from sound source
      const timeMs = Date.now();
      const pulse1 = (timeMs % 1200) / 1200;
      const pulse2 = ((timeMs + 600) % 1200) / 1200;

      if (isPlaying) {
        ctx.strokeStyle = `rgba(6, 182, 212, ${0.4 * (1 - pulse1)})`;
        ctx.beginPath();
        ctx.arc(sourceCanvasX, sourceCanvasY, 8 + pulse1 * 22, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = `rgba(6, 182, 212, ${0.4 * (1 - pulse2)})`;
        ctx.beginPath();
        ctx.arc(sourceCanvasX, sourceCanvasY, 8 + pulse2 * 22, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Draw sound source solid core
      const gradient = ctx.createRadialGradient(
        sourceCanvasX,
        sourceCanvasY,
        1,
        sourceCanvasX,
        sourceCanvasY,
        10
      );
      gradient.addColorStop(0, '#ffffff');
      gradient.addColorStop(0.3, colors.source);
      gradient.addColorStop(1, isDarkMode ? 'rgba(6,182,212,0)' : 'rgba(37,99,235,0)');

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(sourceCanvasX, sourceCanvasY, 11, 0, Math.PI * 2);
      ctx.fill();

      // Draw border ring around the dot core
      ctx.strokeStyle = colors.source;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(sourceCanvasX, sourceCanvasY, 7, 0, Math.PI * 2);
      ctx.stroke();

      // Draw small Speaker Icon indicator inside sound source
      ctx.fillStyle = '#ffffff';
      ctx.font = '8px "Inter"';
      ctx.fillText('🔊', sourceCanvasX - 4.5, sourceCanvasY + 3);

      // Label beside sound source showing Elevation height indicator
      ctx.fillStyle = colors.text;
      ctx.font = '9px "JetBrains Mono", monospace';
      ctx.fillText(`Y: ${position.y > 0 ? '+' : ''}${position.y.toFixed(1)}`, sourceCanvasX + 22, sourceCanvasY + 4);

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [dimensions, position, isPlaying, isDarkMode, audioEngine]);

  return (
    <div id="acoustic-scene-card" className="flex flex-col bg-white/40 dark:bg-white/5 backdrop-blur-md rounded-3xl border border-slate-200/40 dark:border-white/10 p-5 shadow-xl transition-all duration-300">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-500">
            <Compass className="w-5 h-5 animate-spin-slow" />
          </div>
          <h2 className="font-display font-semibold text-base text-slate-800 dark:text-slate-100 uppercase tracking-wider">
            Scène Acoustique 2D
          </h2>
        </div>
      </div>

      {/* Radar Canvas Container */}
      <div 
        ref={containerRef}
        className="relative flex justify-center items-center py-2 flex-grow min-h-[300px]"
      >
        <canvas
          id="acoustic-radar-canvas"
          ref={canvasRef}
          width={dimensions.width}
          height={dimensions.height}
          className="rounded-2xl bg-slate-500/5 dark:bg-black/20 shadow-inner border border-slate-200/30 dark:border-white/5 cursor-default transition-transform duration-100"
        />
      </div>

    </div>
  );
};
