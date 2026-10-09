"use client";

import React, { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  z: number; // depth layer 0.2 to 2.0
  size: number;
  vx: number;
  vy: number;
  rot: number;
  rotSpeed: number;
  opacity: number;
  baseOpacity: number;
  pulseSpeed: number;
  colorType: number; // 0: amber, 1: gold, 2: warm orange, 3: bright yellow
}

export function InteractiveSpaceBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const glowRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // Mouse coordinates & physics
    let mouseX = width / 2;
    let mouseY = height / 2;
    let targetMouseX = width / 2;
    let targetMouseY = height / 2;
    let mouseRadius = 180;
    let isHovering = false;

    // Responsive particle count
    const particleCount = Math.min(Math.floor((width * height) / 12000), 120);
    const particles: Particle[] = [];

    const colors = [
      { r: 245, g: 158, b: 11 },  // amber-500
      { r: 251, g: 191, b: 36 },  // amber-400
      { r: 217, g: 119, b: 6 },   // amber-600
      { r: 254, g: 240, b: 138 }, // yellow-200 (sparkle)
    ];

    for (let i = 0; i < particleCount; i++) {
      const z = Math.random() * 1.5 + 0.3; // depth
      const size = (Math.random() > 0.85 ? Math.random() * 8 + 6 : Math.random() * 4 + 2) * z;
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        z,
        size,
        vx: (Math.random() - 0.5) * 0.4 * z,
        vy: -(Math.random() * 0.6 + 0.2) * z, // drift upward
        rot: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.02,
        opacity: Math.random() * 0.6 + 0.2,
        baseOpacity: Math.random() * 0.5 + 0.25,
        pulseSpeed: Math.random() * 0.03 + 0.01,
        colorType: Math.floor(Math.random() * colors.length),
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
      isHovering = true;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        targetMouseX = e.touches[0].clientX;
        targetMouseY = e.touches[0].clientY;
        isHovering = true;
      }
    };

    const handleMouseLeave = () => {
      isHovering = false;
    };

    window.addEventListener("resize", handleResize, { passive: true });
    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: true });
    document.addEventListener("mouseleave", handleMouseLeave);

    let time = 0;

    const render = () => {
      time += 0.02;

      // Smooth mouse lerp
      mouseX += (targetMouseX - mouseX) * 0.08;
      mouseY += (targetMouseY - mouseY) * 0.08;

      // Update interactive glow element position
      if (glowRef.current) {
        glowRef.current.style.transform = `translate3d(${mouseX - 300}px, ${mouseY - 300}px, 0)`;
      }

      ctx.clearRect(0, 0, width, height);

      // Draw subtle dark geometric facets in background
      ctx.save();
      const facetShiftX = (mouseX / width - 0.5) * 20;
      const facetShiftY = (mouseY / height - 0.5) * 20;

      ctx.strokeStyle = "rgba(245, 158, 11, 0.025)";
      ctx.lineWidth = 1;
      
      // Large subtle background geometric diamond / facet outline
      ctx.beginPath();
      ctx.moveTo(width * 0.5 + facetShiftX, height * 0.1 + facetShiftY);
      ctx.lineTo(width * 0.85 + facetShiftX * 1.5, height * 0.45 + facetShiftY * 1.5);
      ctx.lineTo(width * 0.5 + facetShiftX, height * 0.85 + facetShiftY);
      ctx.lineTo(width * 0.15 + facetShiftX * 1.5, height * 0.45 + facetShiftY * 1.5);
      ctx.closePath();
      ctx.stroke();

      // Second nested facet
      ctx.strokeStyle = "rgba(251, 191, 36, 0.015)";
      ctx.beginPath();
      ctx.moveTo(width * 0.5 + facetShiftX * 0.5, height * 0.2 + facetShiftY * 0.5);
      ctx.lineTo(width * 0.75 + facetShiftX, height * 0.5 + facetShiftY);
      ctx.lineTo(width * 0.5 + facetShiftX * 0.5, height * 0.8 + facetShiftY * 0.5);
      ctx.lineTo(width * 0.25 + facetShiftX, height * 0.5 + facetShiftY);
      ctx.closePath();
      ctx.stroke();
      ctx.restore();

      // Render Golden Floating Square Particles
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // Natural motion with sinusoidal drift
        p.x += p.vx + Math.sin(time + p.z * 5) * 0.2;
        p.y += p.vy;
        p.rot += p.rotSpeed;

        // Interactive mouse repulsion/magnetism
        const dx = p.x - mouseX;
        const dy = p.y - mouseY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < mouseRadius && isHovering) {
          const force = (1 - dist / mouseRadius) * 2.5 * p.z;
          const angle = Math.atan2(dy, dx);
          p.x += Math.cos(angle) * force;
          p.y += Math.sin(angle) * force;
        }

        // Screen wrap-around
        if (p.y < -30) {
          p.y = height + 20;
          p.x = Math.random() * width;
        }
        if (p.x < -30) p.x = width + 20;
        if (p.x > width + 30) p.x = -20;

        // Opacity oscillation / pulse
        const currentOpacity =
          p.baseOpacity + Math.sin(time * 3 + i) * 0.15;
        const col = colors[p.colorType];

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);

        // Draw glowing square / cube representation
        const half = p.size / 2;
        
        // Outer glow
        if (p.size > 5) {
          ctx.shadowColor = `rgba(${col.r}, ${col.g}, ${col.b}, 0.8)`;
          ctx.shadowBlur = p.size * 1.5;
        }

        ctx.fillStyle = `rgba(${col.r}, ${col.g}, ${col.b}, ${Math.max(0.1, Math.min(1, currentOpacity))})`;
        ctx.fillRect(-half, -half, p.size, p.size);

        // Subtle highlight edge for 3D look
        if (p.size > 4) {
          ctx.strokeStyle = `rgba(255, 255, 255, ${Math.min(0.7, currentOpacity * 1.2)})`;
          ctx.lineWidth = 0.7;
          ctx.strokeRect(-half, -half, p.size, p.size);
        }

        ctx.restore();
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden bg-black select-none">
      {/* Dynamic Cursor Light Aura (Smooth Lerp Glow) */}
      <div
        ref={glowRef}
        className="absolute top-0 left-0 w-[600px] h-[600px] rounded-full opacity-35 transition-opacity duration-500 ease-out will-change-transform"
        style={{
          background: "radial-gradient(circle, rgba(245, 158, 11, 0.15) 0%, rgba(217, 119, 6, 0.05) 45%, transparent 70%)",
          filter: "blur(40px)",
        }}
      />

      {/* Atmospheric Ambient Corner Radial Shimmers */}
      <div className="absolute -top-32 -right-32 w-[650px] h-[650px] rounded-full bg-gradient-to-br from-amber-500/10 via-orange-600/5 to-transparent blur-[140px]" />
      <div className="absolute -bottom-40 -left-40 w-[650px] h-[650px] rounded-full bg-gradient-to-tr from-amber-600/10 via-amber-950/20 to-transparent blur-[160px]" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] rounded-full bg-radial from-amber-500/[0.03] to-transparent blur-[120px]" />

      {/* Subtle Geometric Obsidian Grid Background Overlay */}
      <div 
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(245, 158, 11, 0.4) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(245, 158, 11, 0.4) 1px, transparent 1px)
          `,
          backgroundSize: "64px 64px",
          maskImage: "radial-gradient(ellipse at center, black 40%, transparent 90%)",
          WebkitMaskImage: "radial-gradient(ellipse at center, black 40%, transparent 90%)",
        }}
      />

      {/* High-Performance Canvas for Floating Golden Pixels/Squares */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block" />
    </div>
  );
}
