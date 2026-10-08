"use client";

import React, { useEffect, useRef } from "react";

export function FloatingCoinsBackground() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const { clientX, clientY } = e;
      const xNorm = (clientX / window.innerWidth - 0.5) * 20;
      const yNorm = (clientY / window.innerHeight - 0.5) * 20;
      
      const coins = containerRef.current.querySelectorAll<HTMLElement>(".floating_coin_item");
      coins.forEach((coin, index) => {
        const factor = (index + 1) * 0.4;
        coin.style.transform = `translate3d(${xNorm * factor}px, ${yNorm * factor}px, 0) rotate(${xNorm * 0.5}deg)`;
      });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <div ref={containerRef} className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {/* Giant Macro Polished Coin Backdrop on the Right */}
      <div 
        className="absolute top-[-10%] right-[-15%] sm:right-[-10%] lg:right-[-5%] w-[800px] sm:w-[1000px] lg:w-[1200px] h-[800px] sm:h-[1000px] lg:h-[1200px] opacity-40 lg:opacity-55 mix-blend-lighten transition-transform duration-1000 ease-out"
        style={{
          backgroundImage: "url('/images/luxury-gold-coin.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          maskImage: "radial-gradient(circle at 60% 40%, black 45%, transparent 75%)",
          WebkitMaskImage: "radial-gradient(circle at 60% 40%, black 45%, transparent 75%)",
          filter: "drop-shadow(0 0 60px rgba(220, 80, 40, 0.25))",
        }}
      />

      {/* Floating Dynamic Orbiting Coin 1 (Top Right) */}
      <div 
        className="floating_coin_item absolute top-[18%] right-[22%] w-28 h-28 sm:w-36 sm:h-36 rounded-full shadow-2xl opacity-75 animate-bounce duration-[6000ms] ease-in-out hidden sm:block"
        style={{
          backgroundImage: "url('/images/floating-coin.jpg')",
          backgroundSize: "cover",
          filter: "drop-shadow(0 20px 30px rgba(0,0,0,0.8)) brightness(1.1)",
          animationDuration: "7s",
          animationIterationCount: "infinite",
        }}
      />

      {/* Floating Dynamic Coin 2 (Middle Right) */}
      <div 
        className="floating_coin_item absolute top-[52%] right-[8%] w-24 h-24 sm:w-32 sm:h-32 rounded-full shadow-2xl opacity-65 hidden md:block"
        style={{
          backgroundImage: "url('/images/floating-coin.jpg')",
          backgroundSize: "cover",
          filter: "drop-shadow(0 25px 35px rgba(230,60,30,0.2)) brightness(1.05)",
          animation: "pulse 5s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        }}
      />

      {/* Floating Dynamic Micro Coin 3 (Bottom Center Right) */}
      <div 
        className="floating_coin_item absolute bottom-[15%] right-[28%] w-16 h-16 sm:w-20 sm:h-20 rounded-full shadow-xl opacity-50 hidden lg:block"
        style={{
          backgroundImage: "url('/images/floating-coin.jpg')",
          backgroundSize: "cover",
          filter: "drop-shadow(0 15px 25px rgba(0,0,0,0.9))",
        }}
      />

      {/* Luxury Ambient Glows */}
      <div className="absolute top-[20%] right-[10%] w-[500px] h-[500px] bg-gradient-to-br from-amber-600/10 via-red-600/15 to-transparent blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[10%] left-[5%] w-[400px] h-[400px] bg-gradient-to-tr from-red-950/20 to-transparent blur-[140px] rounded-full pointer-events-none" />
    </div>
  );
}
