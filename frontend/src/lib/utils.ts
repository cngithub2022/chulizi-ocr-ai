import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getBackendUrl(): string {
  // Unified port: both dev and production use 8000
  return "http://127.0.0.1:8000";
}

export function confidenceColor(confidence: number): string {
  if (confidence >= 0.9) return "#22c55e";
  if (confidence >= 0.7) return "#84cc16";
  if (confidence >= 0.5) return "#eab308";
  if (confidence >= 0.3) return "#f97316";
  return "#ef4444";
}

export function confidenceOpacity(confidence: number): number {
  return Math.max(0.3, Math.min(0.8, confidence));
}
