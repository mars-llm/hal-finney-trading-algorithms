export function mod(n: number, m: number): number {
  return ((n % m) + m) % m;
}

export function modInverse(a: number, m: number): number {
  a = mod(a, m);
  if (a === 0) throw new Error('Divide by zero');
  const m0 = m;
  let x0 = 0;
  let x1 = 1;
  while (a > 1) {
    const q = Math.floor(a / m);
    let t = m;
    m = a % m;
    a = t;
    t = x0;
    x0 = x1 - q * x0;
    x1 = t;
  }
  if (x1 < 0) x1 += m0;
  return x1;
}

export type Point = { x: number; y: number };

export function addPoints(P: Point, Q: Point, a: number, p: number): Point | null {
  // Simplified point addition for finite field F_p
  // Assumes neither P nor Q are the point at infinity for this visual MVP
  if (P.x === Q.x && P.y === mod(-Q.y, p)) return null; // Point at infinity
  
  let m: number;
  if (P.x === Q.x && P.y === Q.y) {
    m = mod((3 * Math.pow(P.x, 2) + a) * modInverse(2 * P.y, p), p);
  } else {
    m = mod((Q.y - P.y) * modInverse(Q.x - P.x, p), p);
  }
  
  const x = mod(Math.pow(m, 2) - P.x - Q.x, p);
  const y = mod(m * (P.x - x) - P.y, p);
  return { x, y };
}
