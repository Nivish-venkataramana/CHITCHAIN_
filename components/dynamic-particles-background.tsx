"use client";

import React, { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

interface Particle {
  x: number;
  y: number;
  size: number;
  vx: number;
  vy: number;
  opacity: number;
  baseOpacity: number;
  pulseSpeed: number;
  color: string;
  isSquare: boolean;
  depth: number;
}

export function DynamicParticlesBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    let mouseX = width / 2;
    let mouseY = height / 2;
    let targetMouseX = mouseX;
    let targetMouseY = mouseY;

    const colors = [
      "rgba(245, 158, 11, ", // amber-500
      "rgba(234, 88, 12, ",  // orange-600
      "rgba(251, 191, 36, ", // amber-400
      "rgba(217, 119, 6, ",  // amber-600
    ];

    const particleCount = 70;
    const particles: Particle[] = [];

    for (let i = 0; i < particleCount; i++) {
      const baseOpacity = Math.random() * 0.65 + 0.25;
      const isSquare = Math.random() > 0.45;
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: isSquare ? Math.random() * 4.5 + 2 : Math.random() * 3 + 1.5,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4 - 0.15,
        opacity: baseOpacity,
        baseOpacity,
        pulseSpeed: Math.random() * 0.02 + 0.008,
        color: colors[Math.floor(Math.random() * colors.length)],
        isSquare,
        depth: Math.random() * 0.8 + 0.4,
      });
    }

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    const handleMouseMove = (e: MouseEvent) => {
      targetMouseX = e.clientX;
      targetMouseY = e.clientY;
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("mousemove", handleMouseMove, { passive: true });

    let time = 0;

    const render = () => {
      time += 0.015;
      // Smooth mouse lerp
      mouseX += (targetMouseX - mouseX) * 0.05;
      mouseY += (targetMouseY - mouseY) * 0.05;

      const normMouseX = (mouseX / width - 0.5) * 25;
      const normMouseY = (mouseY / height - 0.5) * 25;

      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        p.x += p.vx + (p.depth * 0.05);
        p.y += p.vy;

        // Wrap around boundaries
        if (p.x < -20) p.x = width + 20;
        if (p.x > width + 20) p.x = -20;
        if (p.y < -20) p.y = height + 20;
        if (p.y > height + 20) p.y = -20;

        // Subtle pulsing glow
        const currentOpacity = p.baseOpacity + Math.sin(time * 2 + i) * 0.2;
        const clampedOpacity = Math.max(0.1, Math.min(0.95, currentOpacity));

        const renderX = p.x - normMouseX * p.depth;
        const renderY = p.y - normMouseY * p.depth;

        ctx.fillStyle = `${p.color}${clampedOpacity})`;
        ctx.shadowColor = "rgba(245, 158, 11, 0.8)";
        ctx.shadowBlur = p.size * 2.2;

        if (p.isSquare) {
          ctx.fillRect(renderX, renderY, p.size, p.size);
        } else {
          ctx.beginPath();
          ctx.arc(renderX, renderY, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, [pathname]);

  // If on 3D monolith intro page, it has its own 3D scene particles
  if (pathname === "/") return null;

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-[1] w-full h-full overflow-hidden will-change-transform"
      style={{ opacity: 0.85 }}
    />
  );
}
