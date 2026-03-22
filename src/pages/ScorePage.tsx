import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { calculateMeshgele, calculateLab, type ScoreResult } from "@/lib/scoreCalculator";
import { Calculator, AlertTriangle, CheckCircle2 } from "lucide-react";

type SubjectType = "meshgele" | "lab";

function NumberInput({ label, value, onChange, max, step = 1, min = 0, placeholder = "" }: {
  label: string; value: string; onChange: (v: string) => void; max: number; step?: number; min?: number; placeholder?: string;
}) {
  return (
    <div>
      <label className="text-sm font-medium text-foreground">{label}</label>
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none transition"
      />
    </div>
  );
}

export default function ScorePage() {
  const [type, setType] = useState<SubjectType>("meshgele");
  const [result, setResult] = useState<ScoreResult | null>(null);

  // All fields as strings, default empty
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [c, setC] = useState("");
  const [d, setD] = useState("");
  const [e, setE] = useState("");
  const [meshgeleOrta, setMeshgeleOrta] = useState("");
  const [l, setL] = useState("30");
  const [m, setM] = useState("");
  const [f, setF] = useState("10");
  const [g, setG] = useState("");

  const calculate = () => {
    const num = (v: string) => v === "" ? 0 : Number(v);
    if (type === "meshgele") {
      setResult(calculateMeshgele({
        a: num(a), b: num(b), c: num(c), d: num(d), e: num(e),
        meshgeleOrta: num(meshgeleOrta), l: num(l), m: num(m)
      }));
    } else {
      setResult(calculateLab({
        a: num(a), b: num(b), c: num(c), d: num(d), e: num(e),
        f: num(f), g: num(g), l: num(l), m: num(m)
      }));
    }
  };

  return (
    <div className="container max-w-2xl py-12">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold text-foreground mb-2">Bal Hesabla</h1>
        <p className="text-muted-foreground mb-8">Məşğələ və ya laboratoriya fənni üzrə imtahan öncəsi balınızı hesablayın.</p>

        <div className="flex gap-2 mb-6">
          <button
            onClick={() => { setType("meshgele"); setResult(null); }}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
              type === "meshgele" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            }`}
          >
            Məşğələ
          </button>
          <button
            onClick={() => { setType("lab"); setResult(null); }}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
              type === "lab" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            }`}
          >
            Laboratoriya
          </button>
        </div>

        {/* Max score table */}
        <div className="rounded-xl border border-border bg-muted/50 p-4 mb-6">
          <h4 className="text-sm font-semibold text-foreground mb-3">Maksimum ballar</h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Kollekvium</span><span className="font-medium text-foreground">18</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Sərbəst işlər</span><span className="font-medium text-foreground">10</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">{type === "meshgele" ? "Məşğələ" : "Laboratoriya"}</span><span className="font-medium text-foreground">12</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Davamiyyət</span><span className="font-medium text-foreground">10</span></div>
            <div className="flex justify-between col-span-2 border-t border-border pt-2 mt-1">
              <span className="font-semibold text-foreground">Ümumi maksimum</span>
              <span className="font-bold text-foreground">50</span>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Kollekviumlar</h3>
          <div className="grid grid-cols-3 gap-4">
            <NumberInput label="1-ci kollekvium" value={a} onChange={setA} max={10} placeholder="" />
            <NumberInput label="2-ci kollekvium" value={b} onChange={setB} max={10} placeholder="" />
            <NumberInput label="3-cü kollekvium" value={c} onChange={setC} max={10} placeholder="" />
          </div>

          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider pt-2">Sərbəst İşlər</h3>
          <div className="grid grid-cols-2 gap-4">
            <NumberInput label="1-ci sərbəst iş" value={d} onChange={setD} max={5} placeholder="" />
            <NumberInput label="2-ci sərbəst iş" value={e} onChange={setE} max={5} placeholder="" />
          </div>

          {type === "meshgele" && (
            <>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider pt-2">Məşğələ</h3>
              <NumberInput label="Məşğələ orta balı (maks 10)" value={meshgeleOrta} onChange={setMeshgeleOrta} max={10} step={0.1} placeholder="" />
            </>
          )}

          {type === "lab" && (
            <>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider pt-2">Laboratoriya</h3>
              <div className="grid grid-cols-2 gap-4">
                <NumberInput label="Ümumi lab sayı" value={f} onChange={setF} max={50} min={1} placeholder="" />
                <NumberInput label="Təhvil verilən lab" value={g} onChange={setG} max={Number(f) || 50} placeholder="" />
              </div>
            </>
          )}

          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider pt-2">Davamiyyət</h3>
          <div className="grid grid-cols-2 gap-4">
            <NumberInput label="Dərs saatı" value={l} onChange={setL} max={200} min={1} placeholder="" />
            <NumberInput label="Qayıb sayı" value={m} onChange={setM} max={Number(l) || 200} placeholder="" />
          </div>

          <Button onClick={calculate} className="w-full gradient-cherry text-primary-foreground shadow-cherry hover:opacity-90 mt-2">
            <Calculator className="h-4 w-4 mr-2" />
            Hesabla
          </Button>
        </div>

        {result && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6"
          >
            {result.blocked ? (
              <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-5 flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-destructive">İmtahana buraxılmırsınız!</p>
                  <p className="text-xs text-destructive/80 mt-1">{result.blockReason}</p>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-6 w-6 text-green-600" />
                  <div>
                    <p className="text-2xl font-bold text-foreground">{result.total.toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">İmtahan öncəsi ümumi bal (maks 50)</p>
                  </div>
                </div>
                <Progress value={(result.total / 50) * 100} className="h-2" />

                <div className="space-y-2 pt-2">
                  {result.breakdown.map((item) => (
                    <div key={item.label} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{item.label}</span>
                      <span className="font-medium text-foreground">{item.value} / {item.max}</span>
                    </div>
                  ))}
                </div>

                <p className="text-xs text-muted-foreground pt-2">
                  İcazə verilən maks. qayıb: {result.absenceLimit} · Sizin qayıb: {m || 0}
                </p>
              </div>
            )}
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
