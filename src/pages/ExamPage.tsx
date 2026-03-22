import { useState, useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { parseDocx, shuffleQuestions, type ShuffledQuestion, type ParsedQuestion } from "@/lib/docxParser";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Clock, CheckCircle2, XCircle, RotateCcw, FileText, Search, MinusCircle, AlertTriangle } from "lucide-react";
import { useExamStore, type ExamMode } from "@/stores/examStore";
import { toast } from "sonner";

interface SavedExam {
  id: string;
  name: string;
  question_count: number;
  questions_data: ParsedQuestion[];
}

/* ─── Searchable Dropdown ─── */
function ExamDropdown({ exams, selectedId, onSelect }: {
  exams: SavedExam[]; selectedId: string | null; onSelect: (exam: SavedExam) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = exams.filter((e) =>
    e.name.toLowerCase().includes(query.toLowerCase())
  );

  const selectedExam = exams.find((e) => e.id === selectedId);

  return (
    <div ref={ref} className="relative">
      <div
        onClick={() => setOpen(!open)}
        className={`rounded-xl border p-3 cursor-pointer flex items-center gap-2 transition-all ${
          selectedId ? "border-primary bg-accent ring-1 ring-primary/20" : "border-border hover:border-primary/30"
        }`}
      >
        <Search className="h-4 w-4 text-muted-foreground shrink-0" />
        {selectedExam ? (
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">{selectedExam.name}</p>
            <p className="text-xs text-muted-foreground">{selectedExam.question_count} sual</p>
          </div>
        ) : (
          <span className="text-sm text-muted-foreground">İmtahan seçin...</span>
        )}
      </div>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-xl border border-border bg-card shadow-lg max-h-60 overflow-hidden">
          <div className="p-2 border-b border-border">
            <input
              autoFocus
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Axtarış..."
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          <div className="overflow-y-auto max-h-44">
            {filtered.length === 0 ? (
              <p className="p-3 text-sm text-muted-foreground text-center">Nəticə tapılmadı</p>
            ) : (
              filtered.map((exam) => (
                <button
                  key={exam.id}
                  onClick={() => { onSelect(exam); setOpen(false); setQuery(""); }}
                  className={`w-full text-left px-3 py-2.5 flex items-center gap-2 hover:bg-muted transition-colors ${
                    selectedId === exam.id ? "bg-accent" : ""
                  }`}
                >
                  <FileText className="h-4 w-4 text-primary shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-foreground">{exam.name}</p>
                    <p className="text-xs text-muted-foreground">{exam.question_count} sual</p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Confirmation Modal ─── */
function ConfirmModal({ open, onConfirm, onCancel, title, message }: {
  open: boolean; onConfirm: () => void; onCancel: () => void; title: string; message: string;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="bg-card border border-border rounded-2xl p-6 max-w-sm w-full mx-4 shadow-xl">
        <div className="flex items-center gap-3 mb-4">
          <AlertTriangle className="h-6 w-6 text-destructive" />
          <h3 className="text-lg font-bold text-foreground">{title}</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-6">{message}</p>
        <div className="flex gap-3">
          <Button onClick={onCancel} variant="outline" className="flex-1 rounded-xl">Xeyr, davam et</Button>
          <Button onClick={onConfirm} className="flex-1 rounded-xl gradient-cherry text-white font-bold">Bəli, bitir</Button>
        </div>
      </motion.div>
    </div>
  );
}

/* ─── Setup Screen ─── */
function ExamSetup({ parsedCount, loading, onStart, onLoadSaved }: {
  parsedCount: number; loading: boolean; onStart: () => void;
  onLoadSaved: (questions: ParsedQuestion[], official: boolean) => void;
}) {
  const store = useExamStore();
  const { user } = useAuth();
  const [savedExams, setSavedExams] = useState<SavedExam[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("group_exams" as any)
      .select("id, name, question_count, questions_data")
      .eq("exam_type", "test")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (data) setSavedExams(data as unknown as SavedExam[]);
      });
  }, [user]);

  const loadSavedExam = (exam: SavedExam) => {
    setSelectedExamId(exam.id);
    store.setExamName(exam.name);
    onLoadSaved(exam.questions_data, true);
    toast.success(`"${exam.name}" yükləndi (${exam.question_count} sual)`);
  };

  return (
    <div className="container max-w-2xl py-12">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold text-foreground mb-2">Özünü İmtahan Et</h1>
        <p className="text-muted-foreground mb-8">Qrupunuza təyin edilmiş imtahanı seçin.</p>

        {savedExams.length > 0 ? (
          <div className="space-y-3 mb-8">
            <p className="text-sm font-medium text-foreground">Təyin Edilmiş İmtahanlar:</p>
            <ExamDropdown exams={savedExams} selectedId={selectedExamId} onSelect={loadSavedExam} />
          </div>
        ) : (
          <div className="p-6 rounded-2xl border border-border bg-muted/20 text-center mb-8">
            <p className="text-sm text-muted-foreground">Qrupunuza hələ imtahan təyin edilməyib.</p>
          </div>
        )}

        {/* Mode selection - SWAPPED: Bütün suallar first, then 50 */}
        <div className="space-y-8">
          <div className="space-y-3">
            <p className="text-sm font-medium text-foreground">İmtahan rejimini seçin:</p>
            <div className="grid gap-2 sm:grid-cols-3">
              {([
                { key: "all", label: "Bütün suallar", desc: "Taymer yoxdur • Məşq" },
                { key: "random50", label: "50 təsadüfi sual", desc: "60 dəqiqə taymer • Rəsmi" },
                { key: "range", label: "Aralıqdan seçim", desc: "Xüsusi aralıq • Məşq" },
              ] as const).map((m) => (
                <button
                  key={m.key}
                  onClick={() => store.setMode(m.key)}
                  className={`rounded-xl border p-4 text-left transition-all ${
                    store.mode === m.key
                      ? "border-primary bg-accent ring-2 ring-primary/20"
                      : "border-border hover:border-primary/30"
                  }`}
                >
                  <p className="text-sm font-medium text-foreground">{m.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{m.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {store.mode === "range" && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
              className="space-y-6 rounded-2xl border border-border/50 p-6 bg-muted/20">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Başlanğıc</label>
                  <input type="number" value={store.rangeStart}
                    onChange={(e) => store.setRange(Number(e.target.value), store.rangeEnd)}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Son</label>
                  <input type="number" value={store.rangeEnd}
                    onChange={(e) => store.setRange(store.rangeStart, Number(e.target.value))}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none" />
                </div>
              </div>
              <div className="space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">İşləmə tərzi:</p>
                <div className="flex gap-2 flex-wrap">
                  {([
                    { key: "sequential", label: "Ardıcıl" },
                    { key: "random", label: "Qarışıq" },
                    { key: "random50", label: "50 Təsadüfi" },
                  ] as const).map((o) => (
                    <button key={o.key}
                      onClick={() => store.setRangeOrder(o.key)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                        store.rangeOrder === o.key
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background border-border text-muted-foreground hover:bg-muted/50"
                      }`}>{o.label}</button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          <Button onClick={onStart}
            disabled={!store.mode || parsedCount === 0 || loading}
            className={`w-full h-14 text-lg font-bold shadow-lg transition-all rounded-2xl ${
              !store.mode || parsedCount === 0
                ? "bg-muted text-muted-foreground cursor-not-allowed opacity-50"
                : "gradient-cherry text-primary-foreground hover:opacity-90"
            }`}>
            {loading ? "Yüklənir..." : "İmtahana Başla"}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

/* ─── Results Screen ─── */
function ExamResults() {
  const store = useExamStore();
  const { user } = useAuth();
  const [showDetails, setShowDetails] = useState(false);

  const total = store.questions.length;
  const correct = store.questions.filter((q) => store.answers[q.index] === q.correctLetter).length;
  const unanswered = store.questions.filter((q) => !store.answers[q.index]).length;
  const wrong = total - correct - unanswered;
  const percent = (correct / total) * 100;

  useEffect(() => {
    if (!user) return;
    const saveResult = async () => {
      if (store.isOfficial) {
        await supabase.from("exam_results" as any).insert([{
          user_id: user.id,
          exam_name: store.examName || `İmtahan - ${new Date().toLocaleDateString("az-AZ")}`,
          exam_type: "test",
          total_questions: total,
          correct_count: correct,
          wrong_count: wrong,
          unanswered_count: unanswered,
          percentage: Math.round(percent * 100) / 100,
          is_official: true,
        }]);
      }
      await supabase.from("exam_history").insert([{
        user_id: user.id,
        exam_name: store.examName || `İmtahan - ${new Date().toLocaleDateString("az-AZ")}`,
        total_questions: total,
        correct_count: correct,
        wrong_count: wrong,
        unanswered_count: unanswered,
        percentage: Math.round(percent * 100) / 100,
      }]);

      const { data: allHistory } = await supabase
        .from("exam_history")
        .select("id, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (allHistory && allHistory.length > 10) {
        const toDelete = allHistory.slice(10).map((h) => h.id);
        await supabase.from("exam_history").delete().in("id", toDelete);
      }
    };
    saveResult();
  }, [user]);

  return (
    <div className="container max-w-2xl py-12">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold text-foreground mb-6">İmtahan Nəticəsi</h1>

        {store.isOfficial && (
          <div className="mb-4 p-3 rounded-xl bg-primary/10 border border-primary/20 text-sm font-medium text-primary flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            Bu rəsmi imtahan nəticəsidir və monitorinq sisteminə qeyd edildi.
          </div>
        )}

        <div className="rounded-2xl border border-border bg-card p-6 mb-6 shadow-sm">
          <div className="grid grid-cols-4 gap-4 text-center mb-6">
            <div><p className="text-2xl font-bold text-green-600">{correct}</p><p className="text-xs text-muted-foreground">Düzgün</p></div>
            <div><p className="text-2xl font-bold text-red-600">{wrong}</p><p className="text-xs text-muted-foreground">Səhv</p></div>
            <div><p className="text-2xl font-bold text-orange-500">{unanswered}</p><p className="text-xs text-muted-foreground">Boş</p></div>
            <div><p className="text-2xl font-bold text-foreground">{percent.toFixed(1)}%</p><p className="text-xs text-muted-foreground">Nəticə</p></div>
          </div>
          <Progress value={percent} className="h-2" />
        </div>

        <div className="mb-6">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="w-full flex items-center justify-between p-4 rounded-xl border border-primary/20 bg-primary/5 hover:bg-primary/10 transition-all"
          >
            <div className="flex items-center gap-3 text-primary">
              <Search className="h-5 w-5" />
              <span className="font-semibold text-sm uppercase tracking-wide">
                {showDetails ? "Detalları Gizlət" : "Bütün Cavabları Göstər"}
              </span>
            </div>
          </button>
        </div>

        {showDetails && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="space-y-4 overflow-hidden">
            {store.questions.map((q) => {
              const userAns = store.answers[q.index];
              const isCorrect = userAns === q.correctLetter;
              const isUnanswered = !userAns;

              let borderClass = "border-destructive/30 bg-destructive/5";
              let Icon = XCircle;
              let iconClass = "text-destructive";

              if (isCorrect) {
                borderClass = "border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-900/20";
                Icon = CheckCircle2;
                iconClass = "text-green-600";
              } else if (isUnanswered) {
                borderClass = "border-orange-200 bg-orange-50/50 dark:border-orange-800 dark:bg-orange-900/20";
                Icon = MinusCircle;
                iconClass = "text-orange-500";
              }

              const userAnswerText = userAns ? q.options[userAns.charCodeAt(0) - 65] || "" : "";

              return (
                <div key={q.index} className={`rounded-xl border p-4 shadow-sm ${borderClass}`}>
                  <div className="flex items-start gap-3">
                    <Icon className={`h-5 w-5 shrink-0 mt-0.5 ${iconClass}`} />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-foreground leading-relaxed whitespace-pre-wrap">
                        {q.index}) {q.text}
                      </p>
                      <div className="text-xs mt-2 pt-2 border-t border-border/50 space-y-1">
                        <p className="text-muted-foreground">
                          <span className="font-bold">Sizin cavabınız:</span> {isUnanswered ? "⚠️ Cavab verilməyib" : `${userAns}) ${userAnswerText}`}
                        </p>
                        <p className="text-green-700 dark:text-green-400">
                          <span className="font-bold">Doğru cavab:</span> {q.correctLetter}) {q.correctText}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </motion.div>
        )}

        <div className="flex gap-4 mt-8">
          <Button onClick={() => store.reset()} variant="outline" className="flex-1 h-12 rounded-xl">
            <RotateCcw className="h-4 w-4 mr-2" /> Yenidən Başla
          </Button>
          <Button onClick={() => window.location.href = '/'} className="flex-1 h-12 rounded-xl gradient-cherry text-white font-bold shadow-md">
            Ana Səhifə
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

/* ─── Active Exam ─── */
function ActiveExam() {
  const store = useExamStore();
  const totalQ = store.questions.length;
  const hasTimer = store.mode === "random50" || (store.mode === "range" && store.rangeOrder === "random50");
  const questionRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    if (!store.isRunning || !hasTimer) return;
    if (store.timeLeft <= 0) { store.finish(); return; }
    const interval = setInterval(() => store.tick(), 1000);
    return () => clearInterval(interval);
  }, [store.isRunning, store.timeLeft, hasTimer, store]);

  const answeredCount = Object.keys(store.answers).length;
  const isTimeLow = hasTimer && store.timeLeft <= 300; // 5 minutes

  return (
    <div className="container max-w-3xl py-4">
      <ConfirmModal
        open={showConfirm}
        title="İmtahanı bitirmək istəyirsiniz?"
        message={`${totalQ - answeredCount} sual hələ cavablanmayıb. İmtahanı bitirmək istədiyinizə əminsiniz?`}
        onConfirm={() => { setShowConfirm(false); store.finish(); }}
        onCancel={() => setShowConfirm(false)}
      />

      <div className="sticky top-[80px] z-40 bg-background/95 backdrop-blur-sm py-3 border-b border-border/50 mb-6 shadow-sm -mx-4 px-4">
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm font-medium text-muted-foreground">
            {answeredCount} / {totalQ} cavablandı
          </div>

          {hasTimer && (
            <div className={`flex items-center gap-2 px-3 py-1 rounded-lg border ${
              isTimeLow
                ? "bg-destructive/10 border-destructive/30"
                : "bg-primary/10 border-primary/20"
            }`}>
              <Clock className={`h-4 w-4 animate-pulse ${isTimeLow ? "text-destructive" : "text-primary"}`} />
              <span className={`tabular-nums font-bold text-base ${isTimeLow ? "text-destructive" : "text-primary"}`}>
                {Math.floor(store.timeLeft / 60)}:{String(store.timeLeft % 60).padStart(2, "0")}
              </span>
            </div>
          )}

          <Button onClick={() => setShowConfirm(true)} size="sm" className="gradient-cherry text-white font-bold px-4 h-9">
            Bitir
          </Button>
        </div>
        <Progress value={(answeredCount / totalQ) * 100} className="h-1.5" />
      </div>

      <div className="space-y-6">
        {store.questions.map((q, idx) => (
          <div key={q.index} ref={(el) => { questionRefs.current[idx] = el; }}
            className="rounded-2xl border border-border bg-card p-6 scroll-mt-32 shadow-sm">
            <h2 className="text-base font-semibold text-foreground mb-4 whitespace-pre-wrap">{q.index}) {q.text}</h2>
            <div className="space-y-2">
              {q.options.map((opt, j) => {
                const letter = String.fromCharCode(65 + j);
                const selected = store.answers[q.index] === letter;
                return (
                  <button key={j} onClick={() => store.setAnswer(q.index, letter)}
                    className={`w-full text-left rounded-xl border p-3.5 transition-all flex items-center ${
                      selected ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border hover:border-primary/40 hover:bg-muted/50"
                    }`}>
                    <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold mr-3 shrink-0 ${
                      selected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground border"
                    }`}>{letter}</span>
                    <span className="text-sm text-foreground">{opt}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-12 pb-20" />
    </div>
  );
}

/* ─── Main Page ─── */
export default function ExamPage() {
  const store = useExamStore();
  const [parsedCount, setParsedCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const handleLoadSaved = useCallback((questions: ParsedQuestion[], official: boolean) => {
    (window as any).__parsedQuestions = questions;
    setParsedCount(questions.length);
    store.setIsOfficial(official && store.mode === "random50");
  }, [store]);

  const startExam = useCallback(() => {
    const raw = (window as any).__parsedQuestions;
    if (!raw) return;
    let questions: ShuffledQuestion[];
    const mode = store.mode;

    store.setIsOfficial(mode === "random50");

    if (mode === "random50") {
      questions = shuffleQuestions(raw, Math.min(50, raw.length));
      store.setTimeLeft(3600);
    } else if (mode === "all") {
      // "Bütün suallar" - only shuffle options, keep question order
      questions = shuffleQuestions(raw, undefined, "options-only");
      store.setTimeLeft(0);
    } else {
      const sliced = raw.slice(store.rangeStart - 1, store.rangeEnd);
      if (store.rangeOrder === "random50") {
        questions = shuffleQuestions(sliced, Math.min(50, sliced.length));
        store.setTimeLeft(3600);
      } else if (store.rangeOrder === "random") {
        questions = shuffleQuestions(sliced);
        store.setTimeLeft(0);
      } else {
        questions = shuffleQuestions(sliced, undefined, "options-only");
        store.setTimeLeft(0);
      }
    }
    store.setQuestions(questions);
    store.start();
  }, [store]);

  if (!store.isRunning && !store.isFinished) {
    return <ExamSetup parsedCount={parsedCount} loading={loading} onStart={startExam} onLoadSaved={handleLoadSaved} />;
  }
  if (store.isFinished) return <ExamResults />;
  return <ActiveExam />;
}
