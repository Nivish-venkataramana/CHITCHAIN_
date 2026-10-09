"use client";

import React, { useEffect, useRef } from "react";

interface Coin3D {
  x: number;
  y: number;
  z: number; // depth layer 0.3 to 1.8
  radius: number;
  thickness: number;
  vx: number;
  vy: number;
  rotX: number;
  rotY: number;
  rotZ: number;
  rotSpeedX: number;
  rotSpeedY: number;
  rotSpeedZ: number;
  opacity: number;
  baseOpacity: number;
}

export function FloatingCoinsBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

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
    let targetMouseX = width / 2;
    let targetMouseY = height / 2;

    const coinCount = Math.min(Math.floor((width * height) / 38000), 24);
    const coins: Coin3D[] = [];

    for (let i = 0; i < coinCount; i++) {
      const z = Math.random() * 1.2 + 0.4;
      const radius = (Math.random() * 14 + 16) * z;
      coins.push({
        x: Math.random() * width,
        y: Math.random() * height,
        z,
        radius,
        thickness: Math.max(3, radius * 0.18),
        vx: (Math.random() - 0.5) * 0.35 * z,
        vy: -(Math.random() * 0.45 + 0.15) * z,
        rotX: Math.random() * Math.PI * 2,
        rotY: Math.random() * Math.PI * 2,
        rotZ: Math.random() * Math.PI * 2,
        rotSpeedX: (Math.random() - 0.5) * 0.02,
        rotSpeedY: (Math.random() * 0.025 + 0.015) * (Math.random() > 0.5 ? 1 : -1),
        rotSpeedZ: (Math.random() - 0.5) * 0.01,
        opacity: Math.random() * 0.4 + 0.25,
        baseOpacity: Math.random() * 0.35 + 0.2,
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

    window.addEventListener("resize", handleResize, { passive: true });
    window.addEventListener("mousemove", handleMouseMove, { passive: true });

    let time = 0;

    const render = () => {
      time += 0.015;
      mouseX += (targetMouseX - mouseX) * 0.05;
      mouseY += (targetMouseY - mouseY) * 0.05;

      ctx.clearRect(0, 0, width, height);

      // Sort coins by depth Z for correct perspective layering
      coins.sort((a, b) => a.z - b.z);

      for (let i = 0; i < coins.length; i++) {
        const coin = coins[i];

        // Motion physics
        coin.x += coin.vx + Math.sin(time + coin.z * 3) * 0.25;
        coin.y += coin.vy;
        coin.rotX += coin.rotSpeedX;
        coin.rotY += coin.rotSpeedY;
        coin.rotZ += coin.rotSpeedZ;

        // Screen boundary wrapping
        if (coin.y < -coin.radius * 2) {
          coin.y = height + coin.radius * 2;
          coin.x = Math.random() * width;
        }
        if (coin.x < -coin.radius * 2) coin.x = width + coin.radius * 2;
        if (coin.x > width + coin.radius * 2) coin.x = -coin.radius * 2;

        const currentOpacity = Math.max(
          0.08,
          Math.min(0.65, coin.baseOpacity + Math.sin(time * 2 + i) * 0.08)
        );

        ctx.save();
        ctx.translate(coin.x, coin.y);

        // 3D Coin Projection
        const cosY = Math.cos(coin.rotY);
        const sinY = Math.sin(coin.rotY);
        const cosX = Math.cos(coin.rotX);

        const rx = coin.radius;
        const ry = Math.max(1.5, Math.abs(cosY) * coin.radius);
        const isFacingFront = cosY >= 0;

        // 3D Rim Extrusion (neutral silver / slate metallic)
        const rimOffset = sinY * coin.thickness;
        const rimSegments = 12;

        ctx.globalAlpha = currentOpacity;

        // Draw metallic rim when coin is tilted
        if (Math.abs(sinY) > 0.05) {
          const rimGrad = ctx.createLinearGradient(
            -rx,
            -ry,
            rx,
            ry + rimOffset
          );
          rimGrad.addColorStop(0, "rgba(90, 95, 105, 0.4)");
          rimGrad.addColorStop(0.3, "rgba(200, 205, 215, 0.6)");
          rimGrad.addColorStop(0.7, "rgba(70, 75, 85, 0.35)");
          rimGrad.addColorStop(1, "rgba(160, 165, 175, 0.5)");

          ctx.fillStyle = rimGrad;
          ctx.beginPath();

          for (let s = 0; s <= rimSegments; s++) {
            const angle = Math.PI * (s / rimSegments) + (isFacingFront ? Math.PI : 0);
            const px = Math.cos(angle) * rx;
            const py = Math.sin(angle) * ry;
            if (s === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }

          for (let s = rimSegments; s >= 0; s--) {
            const angle = Math.PI * (s / rimSegments) + (isFacingFront ? Math.PI : 0);
            const px = Math.cos(angle) * rx;
            const py = Math.sin(angle) * ry + rimOffset;
            ctx.lineTo(px, py);
          }

          ctx.closePath();
          ctx.fill();

          ctx.strokeStyle = "rgba(220, 225, 235, 0.25)";
          ctx.lineWidth = 0.6;
          ctx.stroke();
        }

        // Draw Coin Face (Front / Back disk in neutral chrome/monochrome gradient)
        ctx.save();
        if (!isFacingFront) {
          ctx.translate(0, rimOffset);
        }

        // Face Gradient (Neutral Silver / Slate / Chrome)
        const faceGrad = ctx.createLinearGradient(
          -rx * 0.8,
          -ry * 0.8,
          rx * 0.8,
          ry * 0.8
        );
        faceGrad.addColorStop(0, "rgba(230, 235, 245, 0.45)");
        faceGrad.addColorStop(0.35, "rgba(160, 165, 175, 0.25)");
        faceGrad.addColorStop(0.7, "rgba(75, 80, 90, 0.2)");
        faceGrad.addColorStop(1, "rgba(200, 205, 215, 0.35)");

        ctx.fillStyle = faceGrad;
        ctx.beginPath();
        ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
        ctx.fill();

        // Outer Metallic Rim Border
        ctx.strokeStyle = "rgba(240, 245, 255, 0.4)";
        ctx.lineWidth = 1;
        ctx.stroke();

        // Inner Embossed Ring
        if (rx > 10 && ry > 3) {
          ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
          ctx.lineWidth = 0.7;
          ctx.beginPath();
          ctx.ellipse(0, 0, rx * 0.75, ry * 0.75, 0, 0, Math.PI * 2);
          ctx.stroke();

          // Center Neutral Hex / Emblem
          if (rx > 15 && ry > 5) {
            ctx.fillStyle = "rgba(220, 225, 235, 0.3)";
            ctx.beginPath();
            ctx.ellipse(0, 0, rx * 0.25, ry * 0.25, 0, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        ctx.restore();
        ctx.restore();
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden bg-black select-none">
      {/* Subtle Monochrome Ambient Vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.03)_0%,transparent_70%)]" />
      <div className="absolute -top-32 -right-32 w-[600px] h-[600px] rounded-full bg-white/[0.02] blur-[140px]" />
      <div className="absolute -bottom-40 -left-40 w-[600px] h-[600px] rounded-full bg-white/[0.02] blur-[160px]" />

      {/* 3D Neutral Coin Animation Canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block" />
    </div>
  );
}
