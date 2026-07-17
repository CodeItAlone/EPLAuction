"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";

interface SoldCelebrationOverlayProps {
  type: "sold" | "unsold";
  playerName: string;
  teamName?: string;
  price?: number;
  photoUrl?: string;
  onClose: () => void;
}

export default function SoldCelebrationOverlay({
  type,
  playerName,
  teamName,
  price,
  photoUrl,
  onClose,
}: SoldCelebrationOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Auto-dismiss after 2 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 2000);
    return () => clearTimeout(timer);
  }, [onClose]);

  // Confetti Canvas animation logic
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);

    // Particle structure
    interface Particle {
      x: number;
      y: number;
      size: number;
      color: string;
      speedX: number;
      speedY: number;
      rotation: number;
      rotationSpeed: number;
      opacity: number;
    }

    const particles: Particle[] = [];
    const colors =
      type === "sold"
        ? [
            "#F59E0B", // Gold
            "#10B981", // Emerald
            "#3B82F6", // Blue
            "#EC4899", // Pink
            "#8B5CF6", // Purple
            "#14B8A6", // Teal
          ]
        : [
            "#EF4444", // Red
            "#F87171", // Light Red
            "#B91C1C", // Dark Red
            "#4B5563", // Ash
          ];

    // Initialize particles
    const particleCount = type === "sold" ? 180 : 40;
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        // Firing from the sides/center for sold, or falling gently for unsold
        x: type === "sold" ? (Math.random() < 0.5 ? 0 : width) : Math.random() * width,
        y: type === "sold" ? height * 0.7 + Math.random() * 50 : -20 - Math.random() * 100,
        size: Math.random() * 8 + 6,
        color: colors[Math.floor(Math.random() * colors.length)],
        speedX:
          type === "sold"
            ? (Math.random() < 0.5 ? 1 : -1) * (Math.random() * 12 + 8)
            : Math.random() * 2 - 1,
        speedY: type === "sold" ? -(Math.random() * 15 + 10) : Math.random() * 3 + 2,
        rotation: Math.random() * 360,
        rotationSpeed: Math.random() * 10 - 5,
        opacity: 1,
      });
    }

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      particles.forEach((p) => {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.globalAlpha = p.opacity;
        ctx.fillStyle = p.color;

        if (type === "sold") {
          // Draw standard confetti piece (rectangle)
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        } else {
          // Draw circular ash/droplets for unsold
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();

        // Update physics
        p.x += p.speedX;
        p.y += p.speedY;
        p.rotation += p.rotationSpeed;

        if (type === "sold") {
          p.speedY += 0.35; // Gravity
          p.speedX *= 0.98; // Air resistance
        } else {
          // Gentle sway for unsold
          p.speedX += Math.sin(p.y * 0.05) * 0.05;
        }

        // Fade out as it goes out of screen
        if (p.y > height - 100) {
          p.opacity = Math.max(0, p.opacity - 0.02);
        }
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [type]);

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-slate-950/95 p-6 text-center select-none overflow-hidden backdrop-blur-md">
      {/* Background radial accent glow */}
      <div
        className={`absolute inset-0 bg-[radial-gradient(circle_at_center,var(--tw-gradient-stops))] ${
          type === "sold"
            ? "from-emerald-500/20 via-slate-950/60 to-slate-950/90"
            : "from-red-500/10 via-slate-950/60 to-slate-950/90"
        } pointer-events-none`}
      />

      {/* Confetti & Particle Canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none z-10" />

      {/* Inner premium container */}
      <div
        className={`relative z-20 flex flex-col items-center max-w-xl w-full p-8 rounded-3xl border ${
          type === "sold"
            ? "border-emerald-500/30 bg-slate-900/60 shadow-[0_0_80px_rgba(16,185,129,0.15)] animate-scale-up-glow"
            : "border-red-500/20 bg-slate-900/40 shadow-[0_0_50px_rgba(239,68,68,0.08)] animate-slide-down-fade"
        }`}
      >
        {/* Celebration Title */}
        <span
          className={`text-4xl sm:text-6xl font-black uppercase tracking-[0.2em] mb-6 animate-pulse-fast ${
            type === "sold"
              ? "text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-emerald-400 to-yellow-500 drop-shadow-[0_2px_10px_rgba(16,185,129,0.3)]"
              : "text-red-500 drop-shadow-[0_2px_10px_rgba(239,68,68,0.2)]"
          }`}
        >
          {type === "sold" ? "⚡ SOLD OUT ⚡" : "UNSOLD"}
        </span>

        {/* Player Avatar */}
        <div
          className={`relative h-40 w-40 sm:h-48 sm:w-48 overflow-hidden rounded-full border-4 ${
            type === "sold"
              ? "border-yellow-400 shadow-[0_0_40px_rgba(234,179,8,0.4)] animate-avatar-bounce"
              : "border-red-500/40 shadow-[0_0_20px_rgba(239,68,68,0.2)]"
          } bg-slate-950 mb-6 flex items-center justify-center`}
        >
          {photoUrl ? (
            <Image
              src={photoUrl}
              alt={playerName}
              fill
              className="object-cover"
              unoptimized
            />
          ) : (
            <span className="text-7xl">👤</span>
          )}
        </div>

        {/* Player Name */}
        <h2 className="text-3xl sm:text-5xl font-black text-white uppercase tracking-wider mb-2 drop-shadow-md">
          {playerName}
        </h2>

        {/* Sub-details */}
        {type === "sold" ? (
          <div className="flex flex-col items-center animate-fade-in-delayed">
            <p className="text-lg sm:text-xl text-slate-300 font-medium uppercase mb-4 tracking-wide">
              Secured by <span className="text-yellow-400 font-extrabold">{teamName}</span>
            </p>
            <div className="bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black text-3xl sm:text-4xl px-8 py-3 rounded-full shadow-lg tracking-wider border border-emerald-400/20 transform hover:scale-105 transition-transform">
              {price} PTS
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center animate-fade-in-delayed">
            <p className="text-lg sm:text-xl text-slate-400 font-medium uppercase mb-4 tracking-wide">
              Returns to the Auction Pool
            </p>
            <div className="bg-slate-800 text-red-400 font-black text-2xl sm:text-3xl px-8 py-2.5 rounded-full border border-red-500/20 shadow-md">
              PASSED
            </div>
          </div>
        )}
      </div>

      <style jsx global>{`
        @keyframes scale-up-glow {
          0% {
            transform: scale(0.9);
            opacity: 0;
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
        @keyframes slide-down-fade {
          0% {
            transform: translateY(-20px);
            opacity: 0;
          }
          100% {
            transform: translateY(0);
            opacity: 1;
          }
        }
        @keyframes pulse-fast {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.03);
          }
        }
        @keyframes avatar-bounce {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-8px);
          }
        }
        .animate-scale-up-glow {
          animation: scale-up-glow 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
        .animate-slide-down-fade {
          animation: slide-down-fade 0.3s ease-out forwards;
        }
        .animate-pulse-fast {
          animation: pulse-fast 1s ease-in-out infinite;
        }
        .animate-avatar-bounce {
          animation: avatar-bounce 1.5s ease-in-out infinite;
        }
        .animate-fade-in-delayed {
          opacity: 0;
          animation: scale-up-glow 0.3s ease-out 0.2s forwards;
        }
      `}</style>
    </div>
  );
}
