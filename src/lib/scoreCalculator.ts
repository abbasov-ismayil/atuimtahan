export interface MeshgeleInput {
  a: number; // 1st colloquium (max 10)
  b: number; // 2nd colloquium (max 10)
  c: number; // 3rd colloquium (max 10)
  d: number; // 1st independent work (max 5)
  e: number; // 2nd independent work (max 5)
  meshgeleOrta: number; // exercise average (max 10)
  l: number; // total class hours
  m: number; // absences
}

export interface LabInput {
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  f: number; // total lab count
  g: number; // submitted labs
  l: number;
  m: number;
}

export interface ScoreResult {
  total: number;
  breakdown: { label: string; value: number; max: number }[];
  blocked: boolean;
  blockReason?: string;
  absenceLimit: number;
}

export function calculateMeshgele(input: MeshgeleInput): ScoreResult {
  const { a, b, c, d, e, meshgeleOrta, l, m } = input;

  const h = ((a + b + c) / 3) * 1.8; // Colloquium: max 18
  const i = d + e; // Independent work: max 10
  const p = meshgeleOrta * 1.2; // Exercise: max 12
  const n = m * 2;
  const o = (n / l) * 10;
  const q = Math.max(0, 10 - o); // Attendance: max 10
  const k = h + i + p + q;
  const qLimit = Math.floor(l / 4 / 2);

  return {
    total: Math.min(50, Math.max(0, k)),
    breakdown: [
      { label: "Kollekvium", value: Number(h.toFixed(2)), max: 18 },
      { label: "Sərbəst işlər", value: i, max: 10 },
      { label: "Məşğələ", value: Number(p.toFixed(2)), max: 12 },
      { label: "Davamiyyət", value: Number(q.toFixed(2)), max: 10 },
    ],
    blocked: m > qLimit,
    blockReason:
      m > qLimit
        ? `Qayıb sayınız (${m}) icazə verilən limitdən (${qLimit}) çoxdur. İmtahana buraxılmırsınız!`
        : undefined,
    absenceLimit: qLimit,
  };
}

export function calculateLab(input: LabInput): ScoreResult {
  const { a, b, c, d, e, f, g, l, m } = input;

  const h = ((a + b + c) / 3) * 1.8;
  const i = d + e;
  const j = (g / f) * 12; // Lab: max 12
  const n = m * 2;
  const o = (n / l) * 10;
  const p = Math.max(0, 10 - o);
  const k = h + i + j + p;
  const qLimit = Math.floor(l / 4 / 2);

  return {
    total: Math.min(50, Math.max(0, k)),
    breakdown: [
      { label: "Kollekvium", value: Number(h.toFixed(2)), max: 18 },
      { label: "Sərbəst işlər", value: i, max: 10 },
      { label: "Laboratoriya", value: Number(j.toFixed(2)), max: 12 },
      { label: "Davamiyyət", value: Number(p.toFixed(2)), max: 10 },
    ],
    blocked: m > qLimit,
    blockReason:
      m > qLimit
        ? `Qayıb sayınız (${m}) icazə verilən limitdən (${qLimit}) çoxdur. İmtahana buraxılmırsınız!`
        : undefined,
    absenceLimit: qLimit,
  };
}
