import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { parseDocx, shuffleQuestions, type ShuffledQuestion, type ShuffleMode } from "@/lib/docxParser";
import { generateShuffledDocx, downloadAnswerKey } from "@/lib/docxGenerator";
import FileUpload from "@/components/shared/FileUpload";
import { Button } from "@/components/ui/button";
import { Download, FileText, Key } from "lucide-react";
import { toast } from "sonner";

export default function ShufflePage() {
  const [loading, setLoading] = useState(false);
  const [shuffled, setShuffled] = useState<ShuffledQuestion[] | null>(null);
  const [countMode, setCountMode] = useState<"50" | "all">("all");
  const [shuffleMode, setShuffleMode] = useState<ShuffleMode>("options-only");
  const [parsedCount, setParsedCount] = useState(0);

  const handleFile = useCallback(async (file: File) => {
    setLoading(true);
    try {
      const questions = await parseDocx(file);
      setParsedCount(questions.length);
      if (questions.length < 5) {
        toast.error("Kifayət qədər sual tapılmadı (minimum 5).");
        setLoading(false);
        return;
      }
      const count = countMode === "50" ? Math.min(50, questions.length) : undefined;
      const result = shuffleQuestions(questions, count, shuffleMode);
      setShuffled(result);
      toast.success(`${result.length} sual qarışdırıldı!`);
    } catch {
      toast.error("Fayl oxunarkən xəta baş verdi.");
    } finally {
      setLoading(false);
    }
  }, [countMode, shuffleMode]);

  return (
    <div className="container max-w-2xl py-12">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold text-foreground mb-2">Sualları Qarışdır</h1>
        <p className="text-muted-foreground mb-8">
          Word faylından sualları qarışdır, cavab açarı yarat və yüklə.
        </p>

        {/* Count mode - SWAPPED: Bütün suallar first */}
        <div className="space-y-3 mb-6">
          <p className="text-sm font-medium text-foreground">Sual sayı:</p>
          <div className="flex gap-2">
            <button
              onClick={() => setCountMode("all")}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                countMode === "all"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              Bütün suallar
            </button>
            <button
              onClick={() => setCountMode("50")}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                countMode === "50"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              50 təsadüfi sual
            </button>
          </div>
        </div>

        {/* Shuffle mode - SWAPPED: Yalnız Variantlar first */}
        <div className="space-y-3 mb-6">
          <p className="text-sm font-medium text-foreground">Qarışdırma rejimi:</p>
          <div className="flex gap-2">
            <button
              onClick={() => setShuffleMode("options-only")}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                shuffleMode === "options-only"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              Yalnız Variantlar
            </button>
            <button
              onClick={() => setShuffleMode("questions-and-options")}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                shuffleMode === "questions-and-options"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              Suallar + Variantlar
            </button>
          </div>
        </div>

        <FileUpload onFileSelect={handleFile} />

        {loading && (
          <p className="text-sm text-muted-foreground mt-4 animate-pulse">Suallar analiz edilir...</p>
        )}

        {shuffled && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-8 space-y-4"
          >
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-sm text-foreground">
                <span className="font-semibold">{shuffled.length}</span> sual qarışdırıldı ({parsedCount} toplam)
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Button
                onClick={() => generateShuffledDocx(shuffled)}
                className="gradient-cherry text-primary-foreground shadow-cherry hover:opacity-90"
              >
                <FileText className="h-4 w-4 mr-2" />
                Qarışdırılmış Suallar (.docx)
              </Button>
              <Button
                variant="outline"
                onClick={() => downloadAnswerKey(shuffled)}
              >
                <Key className="h-4 w-4 mr-2" />
                Cavab Açarı (.txt)
              </Button>
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
