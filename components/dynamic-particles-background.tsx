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
    ];

    const particleCount = 28;
    const particles: Particle[] = [];

    for (let i = 0; i < particleCount; i++) {
      const baseOpacity = Math.random() * 0.45 + 0.15;
      const isSquare = Math.random() > 0.5;
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: isSquare ? Math.random() * 3 + 1.5 : Math.random() * 2.5 + 1,
        vx: (Math.random() - 0.5) * 0.25,
        vy: (Math.random() - 0.5) * 0.25 - 0.1,
        opacity: baseOpacity,
        baseOpacity,
        pulseSpeed: Math.random() * 0.015 + 0.005,
        color: colors[Math.floor(Math.random() * colors.length)],
        isSquare,
        depth: Math.random() * 0.6 + 0.3,
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
      time += 0.012;
      // Smooth mouse lerp
      mouseX += (targetMouseX - mouseX) * 0.04;
      mouseY += (targetMouseY - mouseY) * 0.04;

      const normMouseX = (mouseX / width - 0.5) * 15;
      const normMouseY = (mouseY / height - 0.5) * 15;

      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        p.x += p.vx + (p.depth * 0.03);
        p.y += p.vy;

        // Wrap around boundaries
        if (p.x < -10) p.x = width + 10;
        if (p.x > width + 10) p.x = -10;
        if (p.y < -10) p.y = height + 10;
        if (p.y > height + 10) p.y = -10;

        const currentOpacity = p.baseOpacity + Math.sin(time * 1.5 + i) * 0.15;
        const clampedOpacity = Math.max(0.08, Math.min(0.7, currentOpacity));

        const renderX = p.x - normMouseX * p.depth;
        const renderY = p.y - normMouseY * p.depth;

        ctx.fillStyle = `${p.color}${clampedOpacity})`;

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

  // If on 3D monolith intro page or home page, do not render particle background
  if (pathname === "/" || pathname === "/home") return null;

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-[1] w-full h-full overflow-hidden will-change-transform"
      style={{ opacity: 0.85 }}
    />
  );
}
