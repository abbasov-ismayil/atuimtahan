import { useState, useCallback, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { FileText, MessageSquare, Send, ChevronDown, ChevronRight } from "lucide-react";
import { toast } from "sonner";

interface ExamResult {
  id: string;
  exam_name: string;
  exam_type: string;
  percentage: number;
  score: number | null;
  total_questions: number;
  correct_count: number;
  created_at: string;
  is_official: boolean;
}

interface Message {
  id: string;
  sender_id: string;
  content: string;
  is_from_admin: boolean;
  created_at: string;
}

function ChatPanel({ examResultId, userId }: { examResultId: string; userId: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMsg, setNewMsg] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadMessages = useCallback(async () => {
    const { data } = await supabase
      .from("messages" as any)
      .select("id, sender_id, content, is_from_admin, created_at")
      .eq("exam_result_id", examResultId)
      .order("created_at", { ascending: true });
    if (data) setMessages(data as any);
  }, [examResultId]);

  useEffect(() => {
    loadMessages();

    // Real-time subscription
    const channel = supabase
      .channel(`chat-${examResultId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `exam_result_id=eq.${examResultId}`,
      }, (payload) => {
        setMessages((prev) => [...prev, payload.new as any]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [examResultId, loadMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!newMsg.trim()) return;
    setSending(true);
    const { error } = await supabase.from("messages" as any).insert([{
      sender_id: userId,
      exam_result_id: examResultId,
      content: newMsg.trim(),
      is_from_admin: false,
    }]);
    if (error) toast.error("Mesaj göndərilmədi");
    else setNewMsg("");
    setSending(false);
  };

  return (
    <div className="mt-3 rounded-xl border border-border bg-muted/20 p-3">
      <div className="max-h-48 overflow-y-auto space-y-2 mb-3">
        {messages.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">Hələ mesaj yoxdur</p>
        ) : (
          messages.map((m) => (
            <div key={m.id} className={`text-xs p-2 rounded-lg max-w-[80%] ${
              m.is_from_admin
                ? "bg-primary/10 text-foreground ml-0"
                : "bg-accent text-foreground ml-auto"
            }`}>
              <p className="font-medium text-[10px] text-muted-foreground mb-0.5">
                {m.is_from_admin ? "Admin" : "Siz"} • {new Date(m.created_at).toLocaleTimeString("az-AZ", { hour: "2-digit", minute: "2-digit" })}
              </p>
              <p>{m.content}</p>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={newMsg}
          onChange={(e) => setNewMsg(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          placeholder="Mesajınızı yazın..."
          className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-xs outline-none focus:border-primary"
        />
        <Button onClick={sendMessage} disabled={sending || !newMsg.trim()} size="sm" className="gradient-cherry text-white rounded-lg px-3">
          <Send className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

export default function MyExamsPage() {
  const { user } = useAuth();
  const [results, setResults] = useState<ExamResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedExam, setExpandedExam] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const fetchResults = async () => {
      const { data } = await supabase
        .from("exam_results" as any)
        .select("id, exam_name, exam_type, percentage, score, total_questions, correct_count, created_at, is_official")
        .eq("user_id", user.id)
        .eq("is_official", true)
        .order("created_at", { ascending: false });
      if (data) setResults(data as any);
      setLoading(false);
    };
    fetchResults();
  }, [user]);

  return (
    <div className="container max-w-2xl py-12">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold text-foreground mb-2">İmtahanlarım</h1>
        <p className="text-muted-foreground mb-8">
          Rəsmi test və bilet imtahanlarınızın nəticələrini izləyin.
        </p>

        {loading ? (
          <p className="text-sm text-muted-foreground">Yüklənir...</p>
        ) : results.length === 0 ? (
          <div className="p-6 rounded-2xl border border-border bg-muted/20 text-center">
            <p className="text-sm text-muted-foreground">Hələ rəsmi imtahan nəticəniz yoxdur.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {results.map((r) => (
              <div key={r.id} className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-sm font-medium text-foreground">{r.exam_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {r.exam_type === "ticket" ? `${r.score}/50 bal` : `${r.correct_count}/${r.total_questions} düzgün • ${r.percentage}%`}
                        {" · "}{new Date(r.created_at).toLocaleDateString("az-AZ")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                      r.exam_type === "ticket"
                        ? "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300"
                        : "bg-primary/10 text-primary"
                    }`}>
                      {r.exam_type === "ticket" ? "Bilet" : "Test"}
                    </span>
                    <button
                      onClick={() => setExpandedExam(expandedExam === r.id ? null : r.id)}
                      className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 font-medium"
                    >
                      <MessageSquare className="h-3.5 w-3.5" />
                      {expandedExam === r.id ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>

                {expandedExam === r.id && user && (
                  <div className="px-4 pb-4">
                    <ChatPanel examResultId={r.id} userId={user.id} />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
