"use client";

import React, { useEffect, useRef } from "react";

export function FloatingCoinsBackground() {
  const containerRef = useRef<HTMLDivElement>(null);
  const giantCoinRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let animationFrameId: number;
    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;

    const handleMouseMove = (e: MouseEvent) => {
      const { clientX, clientY } = e;
      targetX = (clientX / window.innerWidth - 0.5) * 35;
      targetY = (clientY / window.innerHeight - 0.5) * 35;
    };

    const updatePhysics = () => {
      // Smooth interpolation (lerp) for fluid luxury motion
      currentX += (targetX - currentX) * 0.05;
      currentY += (targetY - currentY) * 0.05;

      if (giantCoinRef.current) {
        giantCoinRef.current.style.transform = `translate3d(${currentX * 0.8}px, ${currentY * 0.8}px, 0) rotate3d(${currentY * 0.05}, ${currentX * 0.05}, 1, ${currentX * 0.2}deg)`;
      }

      if (containerRef.current) {
        const floaters = containerRef.current.querySelectorAll<HTMLElement>(".floating_coin_orbit");
        floaters.forEach((floater, idx) => {
          const depth = (idx + 1) * 0.9;
          floater.style.transform = `translate3d(${-currentX * depth}px, ${-currentY * depth}px, 0)`;
        });
      }

      animationFrameId = requestAnimationFrame(updatePhysics);
    };

    window.addEventListener("mousemove", handleMouseMove);
    animationFrameId = requestAnimationFrame(updatePhysics);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div ref={containerRef} className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      
      {/* Giant Macro 3D Moving Polished Rupee Coin on Right */}
      <div
        ref={giantCoinRef}
        className="absolute top-[-12%] right-[-18%] sm:right-[-12%] lg:right-[-6%] w-[850px] sm:w-[1100px] lg:w-[1300px] h-[850px] sm:h-[1100px] lg:h-[1300px] opacity-45 lg:opacity-65 transition-all duration-300 ease-out will-change-transform"
      >
        <div 
          className="w-full h-full rounded-full animate-giant-coin relative"
          style={{
            backgroundImage: "url('/images/luxury-rupee-coin.jpg')",
            backgroundSize: "cover",
            backgroundPosition: "center",
            maskImage: "radial-gradient(circle at 55% 45%, black 48%, transparent 78%)",
            WebkitMaskImage: "radial-gradient(circle at 55% 45%, black 48%, transparent 78%)",
            filter: "drop-shadow(0 0 80px rgba(230, 90, 30, 0.35)) brightness(1.08)",
          }}
        >
          {/* Moving Specular Glare Shimmer Beam */}
          <div className="absolute inset-0 overflow-hidden rounded-full pointer-events-none opacity-40">
            <div className="w-full h-full bg-gradient-to-r from-transparent via-amber-200/50 to-transparent animate-shimmer" />
          </div>
        </div>
      </div>

      {/* Ambient Radial Lighting Glows */}
      <div className="absolute top-[15%] right-[8%] w-[600px] h-[600px] bg-gradient-to-br from-amber-500/15 via-orange-600/15 to-transparent blur-[140px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[10%] left-[5%] w-[500px] h-[500px] bg-gradient-to-tr from-orange-950/25 to-transparent blur-[160px] rounded-full pointer-events-none" />
    </div>
  );
}
