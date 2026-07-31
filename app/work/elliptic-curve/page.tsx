'use client';

import { useState, useMemo } from 'react';
import { InfoPanel } from '../../../components/InfoPanel';
import { mod, addPoints, Point } from '../../../lib/math';

// Using a small prime field for visual legibility
const P = 97;
const A = 0;
const B = 7;

export default function EllipticCurve() {
  const points = useMemo(() => {
    const pts: Point[] = [];
    for (let x = 0; x < P; x++) {
      const rhs = mod(x ** 3 + A * x + B, P);
      for (let y = 0; y < P; y++) {
        if (mod(y ** 2, P) === rhs) {
          pts.push({ x, y });
        }
      }
    }
    return pts;
  }, []);

  const [selected, setSelected] = useState<Point[]>([]);
  const [activePointIndex, setActivePointIndex] = useState(0);

  const handlePointClick = (pt: Point) => {
    if (selected.length === 2) {
      setSelected([pt]);
    } else {
      setSelected([...selected, pt]);
    }
  };

  const result = useMemo(() => {
    if (selected.length === 2) {
      return addPoints(selected[0], selected[1], A, P);
    }
    return null;
  }, [selected]);

  const selectNearestPoint = (event: React.MouseEvent<SVGSVGElement>) => {
    const matrix = event.currentTarget.getScreenCTM();
    if (!matrix) return;

    const cursor = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
    const fieldX = cursor.x;
    const fieldY = P - 1 - cursor.y;
    let nearestIndex = 0;
    let nearestDistance = Number.POSITIVE_INFINITY;

    points.forEach((point, index) => {
      const distance = (point.x - fieldX) ** 2 + (point.y - fieldY) ** 2;
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = index;
      }
    });

    setActivePointIndex(nearestIndex);
    handlePointClick(points[nearestIndex]);
  };

  const moveActivePoint = (horizontal: number, vertical: number) => {
    const active = points[activePointIndex];
    let nextIndex = activePointIndex;
    let nextScore = Number.POSITIVE_INFINITY;

    points.forEach((point, index) => {
      if (index === activePointIndex) return;
      const dx = point.x - active.x;
      const dy = point.y - active.y;
      const direction = dx * horizontal + dy * vertical;
      if (direction <= 0) return;

      const perpendicular = Math.abs(dx * vertical - dy * horizontal);
      const score = direction + perpendicular * 2;
      if (score < nextScore) {
        nextScore = score;
        nextIndex = index;
      }
    });

    setActivePointIndex(nextIndex);
  };

  const handlePlotKeyDown = (event: React.KeyboardEvent<SVGSVGElement>) => {
    if (event.key === 'ArrowLeft') moveActivePoint(-1, 0);
    else if (event.key === 'ArrowRight') moveActivePoint(1, 0);
    else if (event.key === 'ArrowUp') moveActivePoint(0, 1);
    else if (event.key === 'ArrowDown') moveActivePoint(0, -1);
    else if (event.key === 'Home') setActivePointIndex(0);
    else if (event.key === 'End') setActivePointIndex(points.length - 1);
    else if (event.key === 'Enter' || event.key === ' ') {
      handlePointClick(points[activePointIndex]);
    } else {
      return;
    }
    event.preventDefault();
  };

  const activePoint = points[activePointIndex];

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-10 pb-24 md:p-12 md:pb-24 relative">
      
      <div className="w-full max-w-2xl flex flex-col items-center gap-7 md:gap-10">
        <div className="text-center space-y-2">
          <h2 className="font-mono text-xs tracking-widest opacity-50 uppercase">
            y² ≡ x³ + 7 (mod 97)
          </h2>
          <p className="min-h-5 font-sans text-sm text-ink-muted" aria-live="polite">
            {selected.length === 0 && 'Select two points to perform addition'}
            {selected.length === 1 && 'Select a second point'}
            {selected.length === 2 && result !== null && (
              <span className="text-accent font-mono text-xs">
                ({selected[0].x}, {selected[0].y}) + ({selected[1].x}, {selected[1].y}) = ({result.x}, {result.y})
              </span>
            )}
            {selected.length === 2 && result === null && (
              <span className="text-accent font-mono text-xs">
                ({selected[0].x}, {selected[0].y}) + ({selected[1].x}, {selected[1].y}) = 𝒪 (point at infinity)
              </span>
            )}
          </p>
        </div>

        <svg
          viewBox={`-3 -3 ${P + 6} ${P + 6}`}
          className="w-full aspect-square bg-[#0a0a0a] border border-white/5 cursor-crosshair"
          shapeRendering="crispEdges"
          role="application"
          tabIndex={0}
          aria-label={`Finite field curve plot with ${points.length} points. Active point ${activePoint.x}, ${activePoint.y}. Use arrow keys to move and Enter or Space to select.`}
          onClick={selectNearestPoint}
          onKeyDown={handlePlotKeyDown}
        >
          <title>Points satisfying y squared equals x cubed plus seven modulo 97</title>
          {points.map((pt, i) => {
            const isSelected = selected.some(s => s.x === pt.x && s.y === pt.y);
            const isResult = result && result.x === pt.x && result.y === pt.y;
            
            return (
              <rect
                key={i}
                x={pt.x - 0.5}
                y={P - 1 - pt.y - 0.5}
                width={1.2}
                height={1.2}
                pointerEvents="none"
                className={`transition-colors duration-300 ${
                  isSelected ? 'fill-white' : 
                  isResult ? 'fill-[#3B82F6]' : 
                  'fill-[#D4D4D4] opacity-25'
                }`}
              />
            );
          })}
          {result && (
            <circle
              cx={result.x}
              cy={P - 1 - result.y}
              r="2"
              fill="none"
              stroke="#3b82f6"
              strokeWidth="0.5"
              pointerEvents="none"
            />
          )}
          <circle
            cx={activePoint.x}
            cy={P - 1 - activePoint.y}
            r="2.4"
            fill="none"
            stroke="#d4d4d4"
            strokeWidth="0.35"
            strokeDasharray="0.75 0.75"
            pointerEvents="none"
          />
        </svg>

        <div className="flex min-h-11 items-center gap-5 font-mono text-[10px] uppercase tracking-widest text-ink-muted">
          <span>Cursor ({activePoint.x}, {activePoint.y})</span>
          {selected.length > 0 && (
            <button
              type="button"
              onClick={() => setSelected([])}
              className="min-h-11 border-l border-white/15 pl-5 text-ink-muted transition-colors hover:text-white"
            >
              Clear selection
            </button>
          )}
        </div>
      </div>

      <InfoPanel
        references={[
  {
    title: "Elliptic Curve Cryptography",
    url: "https://en.wikipedia.org/wiki/Elliptic_curve_cryptography",
    summary: "Public-key cryptography based on the algebraic structure of elliptic curves over finite fields."
  },
  {
    title: "Bitcoin Core (secp256k1)",
    url: "https://github.com/bitcoin-core/secp256k1",
    summary: "Optimized C library for EC operations on curve secp256k1, used in Bitcoin."
  }
]} 
        title="Elliptic Curve"
        year={2026}
        process="Point Addition over a Finite Field"
        proposition="A continuous geometric curve shatters into a scatter plot when constrained to modular arithmetic, yet retains perfect algebraic structure."
        technicalRecord={{
          algorithm: "Curve analogue over F₉₇",
          seed: "y² ≡ x³ + 7 (mod 97)",
          renderer: "React/SVG finite-field plot"
        }}
      >
        <p>
          Elliptic Curve Cryptography (ECC) relies on the algebraic structure of elliptic curves over finite fields. 
          While textbook explanations often show smooth, continuous curves over real numbers, actual cryptographic implementations 
          operate over discrete, finite sets of integers (modulo a large prime).
        </p>
        <p>
          This visualization uses the same curve equation form as <strong>secp256k1</strong>, but over the small prime field 97 
          so every valid point remains visible. It is an educational analogue, not a scaled instance of Bitcoin&apos;s curve.
        </p>
        <p>
          Despite this visual discontinuity, the algebraic rules of point addition still apply exactly. Select two points and the 
          application computes their sum modulo 97. Inverse pairs resolve explicitly to the point at infinity, the identity element 
          of the curve group.
        </p>
        </InfoPanel>
    </div>
  );
}
