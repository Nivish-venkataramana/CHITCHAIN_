"use client";

import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { ArrowRight, Shield } from "lucide-react";

interface HubtownIntroProps {
  onEnter: () => void;
  isOpen: boolean;
}

export function HubtownIntro({ onEnter, isOpen }: HubtownIntroProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [isClosing, setIsClosing] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen || !mountRef.current) return;

    const currentMount = mountRef.current;
    let width = currentMount.clientWidth || window.innerWidth;
    let height = currentMount.clientHeight || window.innerHeight;

    // Ultra-optimized pitch-black Three.js Scene matching Next Page bg-black
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    scene.fog = new THREE.FogExp2(0x000000, 0.035);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 80);
    camera.position.set(0, 0.5, 7.5);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
      alpha: false,
      stencil: false,
      depth: true,
      precision: "mediump",
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    currentMount.appendChild(renderer.domElement);

    // Warm Ambient and Directional Lighting matching Next Page Orange-Amber theme
    const ambientLight = new THREE.AmbientLight(0x2a1005, 2.2);
    scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xea580c, 3.2);
    mainLight.position.set(5, 6, 6);
    scene.add(mainLight);

    const rimLight = new THREE.DirectionalLight(0xf59e0b, 1.8);
    rimLight.position.set(-6, -2, 4);
    scene.add(rimLight);

    const backGlow = new THREE.PointLight(0xc2410c, 3.0, 20);
    backGlow.position.set(0, 0, -2);
    scene.add(backGlow);

    // 3D Orange Gold Monolith Group
    const cubeGroup = new THREE.Group();
    cubeGroup.position.set(0, 0.4, 0);
    scene.add(cubeGroup);

    // High performance shared materials
    const goldCopperMat = new THREE.MeshStandardMaterial({
      color: 0xdf5b10,
      emissive: 0x7c2d12,
      emissiveIntensity: 0.3,
      roughness: 0.3,
      metalness: 0.85,
    });

    const coreMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0xfbbf24,
      emissiveIntensity: 1.2,
      roughness: 0.15,
      metalness: 0.75,
    });

    // Inner Energy Core
    const coreGeo = new THREE.BoxGeometry(1.7, 1.7, 1.7);
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    cubeGroup.add(coreMesh);

    // Segmented Box Structure with shared geometries for maximum FPS
    const gridSize = 3;
    const blockSize = 0.94;
    const gap = 0.08;
    const halfGrid = ((gridSize - 1) * (blockSize + gap)) / 2;

    const panelGeo = new THREE.BoxGeometry(blockSize, blockSize, blockSize);
    const wireframeEdges = new THREE.EdgesGeometry(panelGeo);
    const lineMat = new THREE.LineBasicMaterial({
      color: 0xfbbf24,
      transparent: true,
      opacity: 0.45,
    });

    for (let x = 0; x < gridSize; x++) {
      for (let y = 0; y < gridSize; y++) {
        for (let z = 0; z < gridSize; z++) {
          if (x > 0 && x < gridSize - 1 && y > 0 && y < gridSize - 1 && z > 0 && z < gridSize - 1) {
            continue;
          }
          const isOffset = (x + y + z) % 2 === 0;
          const panel = new THREE.Mesh(panelGeo, goldCopperMat);
          const px = x * (blockSize + gap) - halfGrid;
          const py = y * (blockSize + gap) - halfGrid;
          const pz = z * (blockSize + gap) - halfGrid + (isOffset ? 0.06 : -0.03);
          panel.position.set(px, py, pz);
          cubeGroup.add(panel);

          const wireframe = new THREE.LineSegments(wireframeEdges, lineMat);
          wireframe.position.copy(panel.position);
          cubeGroup.add(wireframe);
        }
      }
    }

    // Reflective Base Plane matching page background
    const floorGeo = new THREE.PlaneGeometry(50, 50);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x050505,
      roughness: 0.3,
      metalness: 0.7,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -3.2;
    scene.add(floor);

    // Mountain silhouettes
    const createMountain = (isLeft: boolean) => {
      const geo = new THREE.ConeGeometry(8, 7, 5);
      const mat = new THREE.MeshBasicMaterial({ color: 0x080402 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(isLeft ? -11 : 11, 0.1, -9);
      mesh.rotation.y = isLeft ? 0.4 : -0.4;
      scene.add(mesh);
    };
    createMountain(true);
    createMountain(false);

    // Lightweight Particle Field (Optimized for zero-lag 60/120 FPS)
    const particleCount = 180;
    const particleGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount * 3; i += 3) {
      positions[i] = (Math.random() - 0.5) * 20;
      positions[i + 1] = (Math.random() - 0.5) * 12;
      positions[i + 2] = (Math.random() - 0.5) * 14;
    }
    particleGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));

    const pMat = new THREE.PointsMaterial({
      color: 0xf59e0b,
      size: 0.1,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
    });
    const particleGroup = new THREE.Points(particleGeo, pMat);
    scene.add(particleGroup);

    // Smooth Interaction Physics
    let rotY = 0.5;
    let rotX = 0.25;
    let targetX = 0;
    let targetY = 0.4;
    let isDragging = false;
    let prevX = 0;
    let prevY = 0;

    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      isDragging = true;
      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
      prevX = clientX;
      prevY = clientY;
    };

    const onPointerMove = (e: MouseEvent | TouchEvent) => {
      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

      if (isDragging) {
        const dx = clientX - prevX;
        const dy = clientY - prevY;
        rotY += dx * 0.006;
        rotX += dy * 0.006;
        prevX = clientX;
        prevY = clientY;
      } else {
        const nx = (clientX / window.innerWidth) * 2 - 1;
        const ny = -(clientY / window.innerHeight) * 2 + 1;
        targetX = nx * 0.35;
        targetY = 0.4 + ny * 0.25;
      }
    };

    const onPointerUp = () => {
      isDragging = false;
    };

    window.addEventListener("mousedown", onPointerDown, { passive: true });
    window.addEventListener("mousemove", onPointerMove, { passive: true });
    window.addEventListener("mouseup", onPointerUp, { passive: true });
    window.addEventListener("touchstart", onPointerDown, { passive: true });
    window.addEventListener("touchmove", onPointerMove, { passive: true });
    window.addEventListener("touchend", onPointerUp, { passive: true });

    const handleResize = () => {
      if (!currentMount) return;
      width = currentMount.clientWidth;
      height = currentMount.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    window.addEventListener("resize", handleResize);

    // Butter-smooth 60/120 FPS Animation Loop
    let animId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      // Fluid auto rotation
      if (!isDragging) {
        rotY += 0.005;
        rotX = Math.sin(elapsed * 0.4) * 0.16 + 0.18;
      }

      // Smooth lerp transformations
      cubeGroup.rotation.y += (rotY - cubeGroup.rotation.y) * 0.06;
      cubeGroup.rotation.x += (rotX - cubeGroup.rotation.x) * 0.06;

      const floatY = targetY + Math.sin(elapsed * 1.2) * 0.12;
      cubeGroup.position.x += (targetX - cubeGroup.position.x) * 0.05;
      cubeGroup.position.y += (floatY - cubeGroup.position.y) * 0.05;

      // Core pulse
      const pulse = 1.0 + Math.sin(elapsed * 2.2) * 0.14;
      coreMesh.scale.set(pulse, pulse, pulse);

      // Particle drift
      particleGroup.rotation.y += 0.0006;
      particleGroup.position.y = Math.sin(elapsed * 0.5) * 0.3;

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("mousemove", onPointerMove);
      window.removeEventListener("mouseup", onPointerUp);
      window.removeEventListener("touchstart", onPointerDown);
      window.removeEventListener("touchmove", onPointerMove);
      window.removeEventListener("touchend", onPointerUp);
      window.removeEventListener("resize", handleResize);

      if (currentMount && renderer.domElement) {
        currentMount.removeChild(renderer.domElement);
      }
      renderer.dispose();
      panelGeo.dispose();
      wireframeEdges.dispose();
      lineMat.dispose();
      goldCopperMat.dispose();
      coreMat.dispose();
      coreGeo.dispose();
      floorGeo.dispose();
      floorMat.dispose();
      particleGeo.dispose();
      pMat.dispose();
    };
  }, [isOpen]);

  const handleEnterProtocol = () => {
    setIsClosing(true);
    setTimeout(() => {
      onEnter();
      setIsClosing(false);
    }, 500);
  };

  if (!isOpen) return null;

  return (
    <div
      className={`fixed inset-0 z-50 bg-black text-neutral-100 select-none transition-all duration-500 ease-in-out font-sans ${
        isClosing ? "opacity-0 scale-105 pointer-events-none" : "opacity-100 scale-100"
      }`}
    >
      {/* Hardware Accelerated WebGL Canvas */}
      <div ref={mountRef} className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Clean, Cinematic Overlay */}
      <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-6 sm:p-10">
        
        {/* Top Header Row */}
        <header className="flex items-center justify-between pointer-events-auto">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-amber-500 via-orange-500 to-amber-600 flex items-center justify-center shadow-[0_0_15px_rgba(245,158,11,0.4)]">
              <span className="font-extrabold text-black text-base">₹</span>
            </div>
            <div className="flex flex-col">
              <span className="text-lg sm:text-xl font-bold tracking-[0.14em] bg-gradient-to-r from-white via-amber-100 to-amber-300 bg-clip-text text-transparent uppercase">
                CHITCHAIN
              </span>
              <span className="text-[9px] tracking-[0.2em] uppercase text-amber-500/80 font-mono font-medium">
                BHARAT PROTOCOL
              </span>
            </div>
            <span className="hidden sm:inline-block ml-1.5 px-2.5 py-0.5 text-[10px] uppercase font-mono font-semibold tracking-wider text-amber-300 border border-amber-500/30 rounded-full bg-amber-950/50">
              INDIA V2
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleEnterProtocol}
              className="px-4 py-2 text-xs font-semibold tracking-wide text-neutral-200 hover:text-white bg-neutral-900/90 hover:bg-neutral-800 border border-neutral-800 rounded-full transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
            >
              <Shield className="w-3.5 h-3.5 text-amber-400" />
              <span>LOGIN</span>
            </button>
          </div>
        </header>

        {/* Center Main Content Area */}
        <main className="relative z-20 flex flex-col items-center justify-center text-center max-w-3xl mx-auto my-auto space-y-5 pointer-events-auto px-4">
          
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.08] max-w-2xl uppercase">
            <span className="text-white drop-shadow-[0_2px_15px_rgba(255,255,255,0.25)]">WE BUILD THE </span>
            <span className="bg-gradient-to-r from-amber-300 via-orange-400 to-amber-500 bg-clip-text text-transparent drop-shadow-[0_0_30px_rgba(245,158,11,0.7)]">
              FUTURE OF CHIT FUNDS
            </span>
          </h1>

          <div className="pt-2">
            <button
              onClick={handleEnterProtocol}
              className="group relative px-8 sm:px-10 py-3 sm:py-3.5 rounded-full font-bold text-xs sm:text-sm tracking-wider uppercase text-black bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500 hover:from-amber-300 hover:to-orange-300 border border-amber-300/60 transition-all duration-300 shadow-[0_0_30px_rgba(245,158,11,0.6)] hover:shadow-[0_0_45px_rgba(251,191,36,0.85)] flex items-center gap-2.5 cursor-pointer transform hover:scale-105"
            >
              <span className="text-black/60 font-mono font-bold">::</span>
              <span>EXPLORE OUR PROTOCOL</span>
              <span className="text-black/60 font-mono font-bold">::</span>
            </button>
          </div>
        </main>

        {/* Empty bottom spacer for balanced layout */}
        <div className="h-6" />

      </div>
    </div>
  );
}
