'use client';

import { useState, useMemo } from 'react';
import { InfoPanel } from '../../../components/InfoPanel';
import { mod, modInverse, addPoints, Point } from '../../../lib/math';

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

  const [selected, setSelected] = useState<Point[]>(() => [points[3], points[20]]);
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
  const examples = [
    { label: 'Double a point', points: [points[40], points[40]] },
    { label: 'Change both inputs', points: [points[58], points[60]] },
  ];
  const additionDetail = useMemo(() => {
    if (selected.length !== 2) return null;
    const [pointP, pointQ] = selected;

    if (pointP.x === pointQ.x && pointP.y === mod(-pointQ.y, P)) {
      return { slope: null, formula: 'P and Q are inverses, so P + Q = 𝒪.' };
    }

    const doubling = pointP.x === pointQ.x && pointP.y === pointQ.y;
    const numerator = doubling ? 3 * pointP.x ** 2 + A : pointQ.y - pointP.y;
    const denominator = doubling ? 2 * pointP.y : pointQ.x - pointP.x;
    const slope = mod(numerator * modInverse(denominator, P), P);
    return {
      slope,
      formula: doubling
        ? `m = (3xₚ² + ${A}) / (2yₚ) = ${slope} mod ${P}`
        : `m = (yᵩ − yₚ) / (xᵩ − xₚ) = ${slope} mod ${P}`,
    };
  }, [selected]);

  const modularConstruction = useMemo(() => {
    if (selected.length !== 2 || result === null || additionDetail?.slope === null || !additionDetail) {
      return null;
    }

    const intercept = mod(selected[0].y - additionDetail.slope * selected[0].x, P);
    const thirdIntersection = { x: result.x, y: mod(-result.y, P) };
    const residues = Array.from({ length: P }, (_, x) => ({
      x,
      y: mod(additionDetail.slope * x + intercept, P),
    }));

    return { residues, thirdIntersection };
  }, [additionDetail, result, selected]);

  const selectedMarkers = selected.length === 2 && selected[0].x === selected[1].x && selected[0].y === selected[1].y
    ? [{ point: selected[0], label: 'P = Q' }]
    : selected.map((point, index) => ({ point, label: index === 0 ? 'P' : 'Q' }));

  return (
    <div className="flex-1 flex flex-col items-center justify-start px-4 py-8 pb-24 md:px-12 md:py-12 md:pb-24 relative">
      <div className="w-full max-w-5xl flex flex-col items-center gap-6 md:gap-8">
        <header className="max-w-xl text-center space-y-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-accent">Finite field addition</p>
          <h2 className="font-serif text-2xl tracking-wide text-white">Follow a modular line to its exact sum.</h2>
          <p className="font-sans text-sm leading-relaxed text-ink-muted">
            Every pale point satisfies y² = x³ + 7 modulo 97. P and Q determine a field line. Its third curve point becomes their sum after the y-coordinate is negated.
          </p>
        </header>

        <div className="grid w-full max-w-2xl grid-cols-3 border-y border-white/15 font-mono text-[10px] uppercase tracking-widest">
          {[
            { label: '1. P', point: selected[0] },
            { label: '2. Q', point: selected[1] },
            { label: '3. P + Q', point: result },
          ].map((entry) => (
            <div key={entry.label} className="min-h-20 border-r border-white/15 px-3 py-4 last:border-r-0 sm:px-5">
              <p className="text-ink-muted">{entry.label}</p>
              <p className={`mt-2 text-xs sm:text-sm ${entry.point ? 'text-white' : 'text-ink-muted opacity-45'}`}>
                {entry.point ? `(${entry.point.x}, ${entry.point.y})` : 'awaiting point'}
              </p>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap justify-center gap-2 font-mono text-[9px] uppercase tracking-widest">
          <span className="flex min-h-11 items-center px-2 text-ink-muted">Other exact constructions</span>
          {examples.map((example, index) => (
            <button
              key={index}
              type="button"
              onClick={() => setSelected(example.points)}
              className="min-h-11 border border-white/20 px-4 text-ink-muted transition-colors hover:border-white/60 hover:text-white"
            >
              {example.label}: ({example.points[0].x}, {example.points[0].y}) + ({example.points[1].x}, {example.points[1].y})
            </button>
          ))}
        </div>

        <svg
          viewBox={`-3 -3 ${P + 6} ${P + 6}`}
          className="w-full max-w-2xl aspect-square bg-[#0a0a0a] border border-white/10 cursor-crosshair"
          shapeRendering="crispEdges"
          role="application"
          tabIndex={0}
          aria-label={`Finite field curve plot with ${points.length} points. Active point ${activePoint.x}, ${activePoint.y}. Use arrow keys to move and Enter or Space to select.`}
          onClick={selectNearestPoint}
          onKeyDown={handlePlotKeyDown}
        >
          <title>Points satisfying y squared equals x cubed plus seven modulo 97</title>
          <defs>
            <pattern id="field-grid" width="10" height="10" patternUnits="userSpaceOnUse">
              <path d="M 10 0 L 0 0 0 10" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="0.18" />
            </pattern>
          </defs>
          <rect x="0" y="0" width={P} height={P} fill="url(#field-grid)" pointerEvents="none" />
          {modularConstruction?.residues.map((pt) => (
            <rect
              key={`residue-${pt.x}`}
              x={pt.x - 0.45}
              y={P - 1 - pt.y - 0.45}
              width={0.9}
              height={0.9}
              fill="#3b82f6"
              opacity="0.42"
              pointerEvents="none"
            />
          ))}
          {points.map((pt, i) => (
            <rect
              key={i}
              x={pt.x - 0.5}
              y={P - 1 - pt.y - 0.5}
              width={1.2}
              height={1.2}
              pointerEvents="none"
              className="fill-[#D4D4D4] opacity-35"
            />
          ))}
          {selectedMarkers.map(({ point, label }) => (
            <g key={`${label}-${point.x}-${point.y}`} pointerEvents="none">
              <rect
                x={point.x - 1.25}
                y={P - 1 - point.y - 1.25}
                width={2.5}
                height={2.5}
                fill="#ffffff"
              />
              <text
                x={point.x + 2.5}
                y={P - 1 - point.y - 2.5}
                fill="#ffffff"
                fontSize="4"
                fontFamily="ui-monospace, monospace"
                letterSpacing="0.4"
              >
                {label}
              </text>
            </g>
          ))}
          {modularConstruction && (
            <g pointerEvents="none">
              <circle
                cx={modularConstruction.thirdIntersection.x}
                cy={P - 1 - modularConstruction.thirdIntersection.y}
                r="2.1"
                fill="#0a0a0a"
                stroke="#3b82f6"
                strokeWidth="0.7"
              />
              <text
                x={modularConstruction.thirdIntersection.x + 2.7}
                y={P - 1 - modularConstruction.thirdIntersection.y + 4.2}
                fill="#93c5fd"
                fontSize="4"
                fontFamily="ui-monospace, monospace"
                letterSpacing="0.4"
              >
                C
              </text>
            </g>
          )}
          {result && (
            <g pointerEvents="none">
              <rect
                x={result.x - 1.35}
                y={P - 1 - result.y - 1.35}
                width="2.7"
                height="2.7"
                fill="#3b82f6"
              />
              <text
                x={result.x + 2.5}
                y={P - 1 - result.y - 2.5}
                fill="#93c5fd"
                fontSize="4"
                fontFamily="ui-monospace, monospace"
                letterSpacing="0.4"
              >
                R
              </text>
            </g>
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

        <div className="w-full max-w-2xl min-h-16 border-b border-white/10 pb-5 text-center font-mono text-[10px] uppercase tracking-widest text-ink-muted" aria-live="polite">
          <p>
            {selected.length === 0 && 'Choose P on the field, then choose Q.'}
            {selected.length === 1 && `P = (${selected[0].x}, ${selected[0].y}). Choose Q.`}
            {selected.length === 2 && result !== null && (
              <span className="text-white">({selected[0].x}, {selected[0].y}) + ({selected[1].x}, {selected[1].y}) = <span className="text-accent">({result.x}, {result.y})</span></span>
            )}
            {selected.length === 2 && result === null && <span className="text-accent">P + Q = 𝒪, the point at infinity.</span>}
          </p>
          {additionDetail && <p className="mt-3 text-[9px] text-ink-muted">{additionDetail.formula}</p>}
          {modularConstruction && (
            <p className="mx-auto mt-3 max-w-xl font-sans text-xs normal-case tracking-normal text-ink-muted">
              Blue residues satisfy the modular line through P and Q. C is its third curve point. Negating C&apos;s y-coordinate gives R = P + Q.
            </p>
          )}
          <div className="mt-3 flex items-center justify-center gap-5">
            <span>Field cursor ({activePoint.x}, {activePoint.y})</span>
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
        proposition="Over a finite field, this curve is a set of points, but its addition law remains exact."
        technicalRecord={{
          algorithm: "Curve analogue over F₉₇",
          seed: "y² ≡ x³ + 7 (mod 97)",
          renderer: "React/SVG finite-field plot"
        }}
      >
        <p>
          Elliptic-curve cryptography uses the addition law of curves over finite fields. Production systems work
          with discrete coordinates modulo a large prime, not the smooth real-number curves used in many introductions.
        </p>
        <p>
          This work uses the same equation form as <strong>secp256k1</strong>, y² = x³ + 7, over F₉₇. The small field
          keeps every valid point visible; it is not a small version of Bitcoin&apos;s group.
        </p>
        <p>
          Select two points to add them modulo 97. Inverse pairs and vertical tangents return the point at infinity,
          the group identity.
        </p>
        </InfoPanel>
    </div>
  );
}
