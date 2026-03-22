import { useState, useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Ticket, Clock, Send, RotateCcw, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

interface OpenQuestion { originalIndex: number; text: string; }
interface SavedExam { id: string; name: string; question_count: number; questions_data: OpenQuestion[]; }

type Phase = "select" | "exam" | "grading" | "results";

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
          <Button onClick={onConfirm} className="flex-1 rounded-xl gradient-cherry text-white font-bold">Bəli, təhvil ver</Button>
        </div>
      </motion.div>
    </div>
  );
}

export default function TicketPage() {
  const { user } = useAuth();
  const [phase, setPhase] = useState<Phase>("select");
  const [exams, setExams] = useState<SavedExam[]>([]);
  const [questions, setQuestions] = useState<OpenQuestion[]>([]);
  const [answers, setAnswers] = useState<string[]>(["", "", "", "", ""]);
  const [timeLeft, setTimeLeft] = useState(10800);
  const [scores, setScores] = useState<number[]>([]);
  const [feedback, setFeedback] = useState<string[]>([]);
  const [totalScore, setTotalScore] = useState(0);
  const [showConfirm, setShowConfirm] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("group_exams" as any)
      .select("id, name, question_count, questions_data")
      .eq("exam_type", "ticket")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (data) setExams(data as unknown as SavedExam[]);
      });
  }, [user]);

  const startExam = (exam: SavedExam) => {
    const allQ = exam.questions_data;
    const shuffled = [...allQ].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, Math.min(5, shuffled.length));
    setQuestions(selected);
    setAnswers(new Array(selected.length).fill(""));
    setTimeLeft(10800);
    setPhase("exam");

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          doSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const doSubmit = useCallback(async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setPhase("grading");

    try {
      const { data, error } = await supabase.functions.invoke("grade-ticket", {
        body: {
          questions: questions.map((q) => q.text),
          answers: answers,
        },
      });

      if (error) throw error;

      const gradeScores: number[] = data.scores || [];
      const gradeFeedback: string[] = data.feedback || [];
      const total = gradeScores.reduce((a, b) => a + b, 0);

      setScores(gradeScores);
      setFeedback(gradeFeedback);
      setTotalScore(total);
      setPhase("results");

      if (user) {
        await supabase.from("exam_results" as any).insert([{
          user_id: user.id,
          exam_name: `Bilet İmtahanı - ${new Date().toLocaleDateString("az-AZ")}`,
          exam_type: "ticket",
          total_questions: questions.length,
          correct_count: 0,
          wrong_count: 0,
          unanswered_count: answers.filter((a) => !a.trim()).length,
          percentage: (total / 50) * 100,
          score: total,
          is_official: true,
          answers_data: questions.map((q, i) => ({
            question: q.text,
            answer: answers[i],
            score: gradeScores[i] || 0,
            feedback: gradeFeedback[i] || "",
          })),
        }]);
      }

      toast.success("İmtahan qiymətləndirildi!");
    } catch (err) {
      console.error(err);
      toast.error("Qiymətləndirmə zamanı xəta baş verdi.");
      setPhase("exam");
    }
  }, [questions, answers, user]);

  const handleSubmitClick = () => {
    setShowConfirm(true);
  };

  const reset = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setPhase("select");
    setQuestions([]);
    setAnswers(["", "", "", "", ""]);
    setScores([]);
    setFeedback([]);
    setTotalScore(0);
    setTimeLeft(10800);
  };

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  // ─── Select Phase ───
  if (phase === "select") {
    return (
      <div className="container max-w-2xl py-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-bold text-foreground mb-2">Bilet İmtahanı</h1>
          <p className="text-muted-foreground mb-8">Qrupunuza təyin edilmiş yazılı imtahan seçin. 5 təsadüfi sual, 3 saat vaxt.</p>

          {exams.length === 0 ? (
            <div className="p-6 rounded-2xl border border-border bg-muted/20 text-center">
              <p className="text-sm text-muted-foreground">Qrupunuza bilet imtahanı təyin edilməyib.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {exams.map((exam) => (
                <button key={exam.id} onClick={() => startExam(exam)}
                  className="w-full flex items-center gap-3 p-4 rounded-2xl border border-border bg-card hover:border-primary/30 hover:shadow-sm transition-all text-left">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-cherry">
                    <Ticket className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{exam.name}</p>
                    <p className="text-xs text-muted-foreground">{exam.question_count} sual • 5 təsadüfi seçiləcək</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    );
  }

  // ─── Grading Phase ───
  if (phase === "grading") {
    return (
      <div className="container max-w-2xl py-20 text-center">
        <Loader2 className="h-12 w-12 text-primary mx-auto animate-spin mb-4" />
        <h2 className="text-xl font-bold text-foreground">Cavablarınız qiymətləndirilir...</h2>
        <p className="text-sm text-muted-foreground mt-2">AI hər sualı 10 bal üzərindən qiymətləndirir</p>
      </div>
    );
  }

  // ─── Results Phase ───
  if (phase === "results") {
    return (
      <div className="container max-w-2xl py-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-bold text-foreground mb-6">Bilet Nəticəsi</h1>

          <div className="rounded-2xl border border-border bg-card p-6 mb-6 shadow-sm text-center">
            <p className="text-5xl font-bold text-primary mb-2">{totalScore}<span className="text-2xl text-muted-foreground">/50</span></p>
            <Progress value={(totalScore / 50) * 100} className="h-3 mt-4" />
          </div>

          <div className="space-y-4">
            {questions.map((q, i) => (
              <div key={i} className="rounded-2xl border border-border bg-card p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-muted-foreground uppercase">Sual {i + 1}</span>
                  <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                    scores[i] >= 7 ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" :
                    scores[i] >= 4 ? "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300" :
                    "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
                  }`}>
                    {scores[i]}/10
                  </span>
                </div>
                <p className="text-sm font-medium text-foreground mb-2">{q.text}</p>
                <div className="text-xs text-muted-foreground bg-muted/50 rounded-xl p-3 mb-2">
                  <span className="font-bold">Sizin cavab:</span> {answers[i] || "Boş"}
                </div>
                {feedback[i] && (
                  <div className="text-xs text-foreground bg-primary/5 rounded-xl p-3 border border-primary/10">
                    <span className="font-bold text-primary">AI Rəyi:</span> {feedback[i]}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="flex gap-4 mt-8">
            <Button onClick={reset} variant="outline" className="flex-1 h-12 rounded-xl">
              <RotateCcw className="h-4 w-4 mr-2" /> Yenidən
            </Button>
            <Button onClick={() => window.location.href = '/'} className="flex-1 h-12 rounded-xl gradient-cherry text-white font-bold">
              Ana Səhifə
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  // ─── Exam Phase ───
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const isTimeLow = timeLeft <= 300;

  return (
    <div className="container max-w-3xl py-4">
      <ConfirmModal
        open={showConfirm}
        title="İmtahanı təhvil vermək istəyirsiniz?"
        message="Bütün cavablarınız göndəriləcək və AI tərəfindən qiymətləndiriləcək. Davam etmək istəyirsiniz?"
        onConfirm={() => { setShowConfirm(false); doSubmit(); }}
        onCancel={() => setShowConfirm(false)}
      />

      <div className="sticky top-[80px] z-40 bg-background/95 backdrop-blur-sm py-3 border-b border-border/50 mb-6 -mx-4 px-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-muted-foreground">Bilet İmtahanı • {questions.length} sual</p>
          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${
              isTimeLow ? "bg-destructive/10 border-destructive/30" : "bg-primary/10 border-primary/20"
            }`}>
              <Clock className={`h-4 w-4 animate-pulse ${isTimeLow ? "text-destructive" : "text-primary"}`} />
              <span className={`tabular-nums font-bold ${isTimeLow ? "text-destructive" : "text-primary"}`}>
                {Math.floor(minutes / 60)}:{String(minutes % 60).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
              </span>
            </div>
            <Button onClick={handleSubmitClick} size="sm" className="gradient-cherry text-white font-bold">
              <Send className="h-4 w-4 mr-1" /> Təhvil Ver
            </Button>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {questions.map((q, i) => (
          <div key={i} className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl gradient-cherry text-primary-foreground text-sm font-bold">
                {i + 1}
              </span>
              <h2 className="text-base font-semibold text-foreground">{q.text}</h2>
            </div>
            <textarea
              value={answers[i]}
              onChange={(e) => {
                const next = [...answers];
                next[i] = e.target.value;
                setAnswers(next);
              }}
              placeholder="Cavabınızı buraya yazın..."
              rows={6}
              className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 resize-y"
            />
          </div>
        ))}
      </div>

      <div className="mt-8 pb-20">
        <Button onClick={handleSubmitClick} className="w-full h-14 gradient-cherry text-white text-lg font-bold rounded-2xl shadow-lg">
          <Send className="h-5 w-5 mr-2" /> İmtahanı Təhvil Ver
        </Button>
      </div>
    </div>
  );
}
