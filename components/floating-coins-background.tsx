"use client";

import React from "react";

export function FloatingCoinsBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 select-none">
      
      {/* Giant Macro 3D Moving Polished Rupee Coin on Right */}
      <div className="absolute top-[-8%] right-[-14%] sm:right-[-8%] lg:right-[-3%] w-[700px] sm:w-[900px] lg:w-[1100px] h-[700px] sm:h-[900px] lg:h-[1100px] opacity-55 lg:opacity-75 will-change-transform pointer-events-none">
        <div 
          className="w-full h-full rounded-full animate-giant-coin relative"
          style={{
            backgroundImage: "url('/images/luxury-rupee-coin.jpg')",
            backgroundSize: "cover",
            backgroundPosition: "center",
            maskImage: "radial-gradient(circle at 55% 45%, black 50%, transparent 78%)",
            WebkitMaskImage: "radial-gradient(circle at 55% 45%, black 50%, transparent 78%)",
            filter: "drop-shadow(0 0 70px rgba(245, 158, 11, 0.4)) brightness(1.06)",
          }}
        >
          {/* Specular Shimmer Beam */}
          <div className="absolute inset-0 overflow-hidden rounded-full pointer-events-none opacity-40">
            <div className="w-full h-full bg-gradient-to-r from-transparent via-amber-200/50 to-transparent animate-shimmer" />
          </div>
        </div>
      </div>

      {/* Ambient Lighting Glows */}
      <div className="absolute top-[12%] right-[10%] w-[500px] h-[500px] bg-gradient-to-br from-amber-500/15 via-orange-600/10 to-transparent blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[5%] left-[5%] w-[450px] h-[450px] bg-gradient-to-tr from-orange-950/20 to-transparent blur-[140px] rounded-full pointer-events-none" />
    </div>
  );
}
