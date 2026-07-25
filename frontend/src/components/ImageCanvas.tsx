import { useState } from "react";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { confidenceColor } from "@/lib/utils";
import { useI18n } from "@/i18n";
import type { OCRLine } from "@/hooks/useOcr";

interface ImageCanvasProps {
  imageUrl: string;
  lines: OCRLine[];
  viewMode: "original" | "boxes" | "text" | "heatmap";
  activeBoxIndex: number | null;
  onBoxHover: (index: number | null) => void;
}

export default function ImageCanvas({
  imageUrl,
  lines,
  viewMode,
  activeBoxIndex,
  onBoxHover,
}: ImageCanvasProps) {
  const { t } = useI18n();
  const [imgSize, setImgSize] = useState({ w: 1, h: 1 });

  return (
    <TransformWrapper
      initialScale={1}
      minScale={0.5}
      maxScale={5}
      centerOnInit
      wheel={{ step: 0.15 }}
      pinch={{ step: 3 }}
    >
      {() => (
        <TransformComponent
          wrapperClass="!w-full !h-full"
          contentClass="!w-full !h-full flex items-center justify-center"
        >
          <div className="relative inline-block">
            <img
              src={imageUrl}
              alt="OCR input"
              onLoad={(e) => {
                const img = e.currentTarget;
                setImgSize({ w: img.naturalWidth, h: img.naturalHeight });
              }}
              className="max-h-[70vh] object-contain rounded-lg shadow-md"
              draggable={false}
            />

            {/* SVG overlay */}
            {(viewMode === "boxes" || viewMode === "text" || viewMode === "heatmap") && (
              <svg
                className="absolute inset-0 w-full h-full pointer-events-none"
                style={{ objectFit: "contain" }}
                viewBox={`0 0 ${imgSize.w} ${imgSize.h}`}
                preserveAspectRatio="xMidYMid meet"
              >
                <defs>
                  <filter id="glow">
                    <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                    <feMerge>
                      <feMergeNode in="coloredBlur"/>
                      <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                  </filter>
                </defs>
                {lines.map((line, i) => {
                  const [x1, y1] = line.box[0];
                  const [x2, y2] = line.box[1];
                  const [x3, y3] = line.box[2];
                  const [x4, y4] = line.box[3];

                  const isActive = activeBoxIndex === i;
                  const color = confidenceColor(line.confidence);

                  // Non-active: subtle translucent fill, thin semi-transparent stroke
                  // Active: bright fill, thick solid stroke + glow

                  return (
                    <g
                      key={i}
                      className="detection-box"
                      onMouseEnter={() => onBoxHover(i)}
                      onMouseLeave={() => onBoxHover(null)}
                      style={{ pointerEvents: "auto", cursor: "pointer" }}
                    >
                      {/* Shadow polygon underneath (for active state) */}
                      {isActive && (
                        <polygon
                          points={`${x1},${y1} ${x2},${y2} ${x3},${y3} ${x4},${y4}`}
                          fill="rgba(59, 130, 246, 0.25)"
                          stroke="#3b82f6"
                          strokeWidth={4}
                          filter="url(#glow)"
                          rx={2}
                        />
                      )}

                      {/* Main polygon */}
                      <polygon
                        points={`${x1},${y1} ${x2},${y2} ${x3},${y3} ${x4},${y4}`}
                        fill={
                          isActive
                            ? "rgba(59, 130, 246, 0.18)"
                            : viewMode === "heatmap"
                              ? color
                              : "rgba(59, 130, 246, 0.06)"
                        }
                        stroke={isActive ? "#3b82f6" : color}
                        strokeWidth={isActive ? 4 : 1.5}
                        strokeOpacity={isActive ? 1 : 0.6}
                        rx={2}
                        className="transition-all duration-150"
                      />

                      {/* Text label */}
                      {viewMode === "text" && (
                        <text
                          x={x1} y={y1 - 6}
                          fill={isActive ? "#3b82f6" : color}
                          fontSize={Math.max(13, imgSize.w / 75)}
                          fontWeight={isActive ? "bold" : "normal"}
                          className="select-none"
                        >
                          {line.text.length > 20
                            ? line.text.slice(0, 20) + "..."
                            : line.text}
                        </text>
                      )}
                    </g>
                  );
                })}
              </svg>
            )}

            {/* Confidence legend */}
            {viewMode === "heatmap" && lines.length > 0 && (
              <div className="absolute bottom-3 right-3 bg-card/90 backdrop-blur-sm rounded-lg px-3 py-2 text-xs shadow-lg border border-border">
                <span className="text-muted-foreground">{t.canvas.confidence}</span>
                <div className="w-32 h-2 rounded-full mt-1"
                  style={{ background: "linear-gradient(to right, #ef4444, #f97316, #eab308, #84cc16, #22c55e)" }} />
                <div className="flex justify-between text-[10px] text-muted-foreground mt-0.5">
                  <span>0</span><span>0.5</span><span>1.0</span>
                </div>
              </div>
            )}
          </div>
        </TransformComponent>
      )}
    </TransformWrapper>
  );
}
