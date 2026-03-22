import { useState, useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { parseDocx, parseOpenQuestions, type ParsedQuestion, type OpenQuestion } from "@/lib/docxParser";
import FileUpload from "@/components/shared/FileUpload";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import {
  Shield, Users, FolderOpen, BarChart3, Plus, Trash2, ChevronRight, ChevronDown,
  Upload, GraduationCap, FileText, MessageSquare, Send, Check, X, Loader2, Lock, AlertTriangle
} from "lucide-react";

type Tab = "monitoring" | "exams" | "groups" | "admins" | "messages" | "users";

interface Admin { id: string; email: string; }
interface Department { id: string; name: string; }
interface Group { id: string; name: string; department_id: string; }
interface Profile { user_id: string; full_name: string; group_id: string; department_id: string; }
interface ExamResult { id: string; exam_name: string; exam_type: string; percentage: number; score: number | null; total_questions: number; correct_count: number; created_at: string; is_official: boolean; }
interface DeletionRequest { id: string; requested_by: string; admin_email: string; admin_id: string; status: string; created_at: string; }
interface ChatMessage { id: string; sender_id: string; receiver_id: string | null; exam_result_id: string | null; content: string; is_from_admin: boolean; read: boolean; created_at: string; }
interface GroupExam { id: string; name: string; group_id: string; exam_type: string; question_count: number; created_at: string; }

/* ─── Admin Management ─── */
function AdminsTab() {
  const { user, isSuperAdmin } = useAuth();
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [deletionRequests, setDeletionRequests] = useState<DeletionRequest[]>([]);
  const [creating, setCreating] = useState(false);

  const load = useCallback(() => {
    supabase.from("admins" as any).select("id, email").order("created_at").then(({ data }) => {
      if (data) setAdmins(data as any);
    });
    supabase.from("admin_deletion_requests" as any).select("*").eq("status", "pending").then(({ data }) => {
      if (data) setDeletionRequests(data as any);
    });
  }, []);

  useEffect(() => { load(); }, [load]);

  const createAdmin = async () => {
    if (!newUsername.trim() || !newPassword.trim()) return;
    setCreating(true);
    const { data, error } = await supabase.functions.invoke("manage-users", {
      body: { action: "create-admin", username: newUsername.trim(), password: newPassword.trim() },
    });
    if (error || data?.error) toast.error(data?.error || "Xəta baş verdi");
    else { toast.success("Admin yaradıldı"); setNewUsername(""); setNewPassword(""); load(); }
    setCreating(false);
  };

  const requestDelete = async (id: string, email: string) => {
    if (email === "atuimtahanportali@atu.edu.az") { toast.error("Super Admin silinə bilməz"); return; }
    if (!user) return;

    if (isSuperAdmin) {
      await supabase.from("admins" as any).delete().eq("id", id);
      toast.success("Admin silindi");
      load();
    } else {
      await supabase.from("admin_deletion_requests" as any).insert([{
        requested_by: user.id, admin_email: email, admin_id: id,
      }]);
      toast.success("Silmə sorğusu Super Adminə göndərildi");
      load();
    }
  };

  const handleDeletionRequest = async (requestId: string, approved: boolean) => {
    const { error } = await supabase.functions.invoke("manage-users", {
      body: { action: "approve-deletion", requestId, approved },
    });
    if (error) toast.error("Xəta baş verdi");
    else toast.success(approved ? "Admin silindi" : "Sorğu rədd edildi");
    load();
  };

  return (
    <div className="space-y-6">
      {isSuperAdmin && deletionRequests.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-bold text-destructive flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" /> Gözləyən silmə sorğuları
          </p>
          {deletionRequests.map((r) => (
            <div key={r.id} className="flex items-center justify-between p-3 rounded-xl border border-destructive/20 bg-destructive/5">
              <span className="text-sm text-foreground">{r.admin_email}</span>
              <div className="flex gap-2">
                <button onClick={() => handleDeletionRequest(r.id, true)} className="p-1.5 rounded-lg bg-green-100 text-green-700 hover:bg-green-200">
                  <Check className="h-4 w-4" />
                </button>
                <button onClick={() => handleDeletionRequest(r.id, false)} className="p-1.5 rounded-lg bg-red-100 text-red-700 hover:bg-red-200">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {isSuperAdmin && (
        <div className="space-y-3 p-4 rounded-xl border border-border bg-muted/20">
          <p className="text-sm font-medium text-foreground flex items-center gap-2">
            <Plus className="h-4 w-4 text-primary" /> Yeni Admin Yarat
          </p>
          <input type="text" value={newUsername} onChange={(e) => setNewUsername(e.target.value)}
            placeholder="İstifadəçi adı" className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none focus:border-primary" />
          <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Şifrə" className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none focus:border-primary" />
          <Button onClick={createAdmin} disabled={creating} className="gradient-cherry text-white rounded-xl w-full">
            {creating ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Plus className="h-4 w-4 mr-1" />} Əlavə Et
          </Button>
        </div>
      )}

      <div className="space-y-2">
        {admins.map((a) => (
          <div key={a.id} className="flex items-center justify-between p-3 rounded-xl border border-border bg-card">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-foreground">{a.email}</span>
              {a.email === "atuimtahanportali@atu.edu.az" && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold">KÖK</span>
              )}
            </div>
            {a.email !== "atuimtahanportali@atu.edu.az" && (
              <button onClick={() => requestDelete(a.id, a.email)} className="text-destructive hover:text-destructive/80 p-1">
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Groups Management ─── */
function GroupsTab() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupExams, setGroupExams] = useState<GroupExam[]>([]);
  const [selectedDept, setSelectedDept] = useState("");
  const [newGroupName, setNewGroupName] = useState("");
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);

  const loadAll = useCallback(() => {
    supabase.from("departments" as any).select("id, name").order("name").then(({ data }) => {
      if (data) setDepartments(data as any);
    });
    supabase.from("groups" as any).select("id, name, department_id").order("name").then(({ data }) => {
      if (data) setGroups(data as any);
    });
    supabase.from("group_exams" as any).select("id, name, group_id, exam_type, question_count, created_at").order("created_at", { ascending: false }).then(({ data }) => {
      if (data) setGroupExams(data as any);
    });
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const addGroup = async () => {
    if (!selectedDept || !newGroupName.trim()) return;
    const { error } = await supabase.from("groups" as any).insert([{ name: newGroupName.trim(), department_id: selectedDept }]);
    if (error) toast.error(error.message);
    else { toast.success("Qrup əlavə edildi"); setNewGroupName(""); loadAll(); }
  };

  const deleteGroup = async (id: string) => {
    await supabase.from("groups" as any).delete().eq("id", id);
    toast.success("Qrup silindi");
    loadAll();
  };

  const deleteExam = async (id: string) => {
    await supabase.from("group_exams" as any).delete().eq("id", id);
    toast.success("İmtahan silindi");
    loadAll();
  };

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <select value={selectedDept} onChange={(e) => setSelectedDept(e.target.value)}
          className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none focus:border-primary">
          <option value="">Fakültə seçin...</option>
          {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <div className="flex gap-2">
          <input type="text" value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)}
            placeholder="Qrup adı (məs: NK-101)" className="flex-1 rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none focus:border-primary" />
          <Button onClick={addGroup} disabled={!selectedDept} className="gradient-cherry text-white rounded-xl px-6">
            <Plus className="h-4 w-4 mr-1" /> Əlavə Et
          </Button>
        </div>
      </div>

      {departments.map((dept) => {
        const deptGroups = groups.filter((g) => g.department_id === dept.id);
        if (deptGroups.length === 0) return null;
        return (
          <div key={dept.id} className="space-y-2">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{dept.name}</p>
            {deptGroups.map((g) => {
              const gExams = groupExams.filter((e) => e.group_id === g.id);
              const isExpanded = expandedGroup === g.id;
              return (
                <div key={g.id} className="rounded-xl border border-border bg-card overflow-hidden">
                  <div className="flex items-center justify-between p-3">
                    <button onClick={() => setExpandedGroup(isExpanded ? null : g.id)} className="flex items-center gap-2 flex-1">
                      {isExpanded ? <ChevronDown className="h-4 w-4 text-primary" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                      <Users className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">{g.name}</span>
                      <span className="text-xs text-muted-foreground">({gExams.length} imtahan)</span>
                    </button>
                    <button onClick={() => deleteGroup(g.id)} className="text-destructive hover:text-destructive/80 p-1">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  {isExpanded && gExams.length > 0 && (
                    <div className="border-t border-border px-3 pb-3 pt-2 space-y-1.5">
                      {gExams.map((ex) => (
                        <div key={ex.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                          <div className="flex items-center gap-2">
                            <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-xs font-medium">{ex.name}</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                              ex.exam_type === "ticket" ? "bg-purple-100 text-purple-700" : "bg-primary/10 text-primary"
                            }`}>{ex.exam_type === "ticket" ? "Bilet" : "Test"}</span>
                          </div>
                          <button onClick={() => deleteExam(ex.id)} className="text-destructive/60 hover:text-destructive p-1">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

/* ─── Exam Upload ─── */
function ExamsTab() {
  const { user } = useAuth();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedDept, setSelectedDept] = useState("");
  const [selectedGroup, setSelectedGroup] = useState("");
  const [examType, setExamType] = useState<"test" | "ticket">("test");
  const [examName, setExamName] = useState("");
  const [parsedQuestions, setParsedQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.from("departments" as any).select("id, name").order("name").then(({ data }) => {
      if (data) setDepartments(data as any);
    });
  }, []);

  useEffect(() => {
    if (!selectedDept) { setGroups([]); return; }
    supabase.from("groups" as any).select("id, name, department_id").eq("department_id", selectedDept).order("name").then(({ data }) => {
      if (data) setGroups(data as any);
    });
  }, [selectedDept]);

  const handleFile = useCallback(async (file: File) => {
    setLoading(true);
    try {
      if (examType === "test") {
        const questions = await parseDocx(file);
        setParsedQuestions(questions);
        if (!examName) setExamName(file.name.replace(/\.docx$/i, "").replace(/\s+/g, "-"));
        toast.success(`${questions.length} test sualı tapıldı`);
      } else {
        const questions = await parseOpenQuestions(file);
        setParsedQuestions(questions);
        if (!examName) setExamName(file.name.replace(/\.docx$/i, "").replace(/\s+/g, "-"));
        toast.success(`${questions.length} açıq sual tapıldı`);
      }
    } catch { toast.error("Fayl oxunarkən xəta"); }
    finally { setLoading(false); }
  }, [examType, examName]);

  const uploadExam = async () => {
    if (!selectedGroup || !examName.trim() || parsedQuestions.length === 0 || !user) return;
    const { error } = await supabase.from("group_exams" as any).insert([{
      group_id: selectedGroup, name: examName.trim(), exam_type: examType,
      question_count: parsedQuestions.length, questions_data: parsedQuestions, uploaded_by: user.id,
    }]);
    if (error) toast.error(error.message);
    else { toast.success("İmtahan qrupa təyin edildi!"); setParsedQuestions([]); setExamName(""); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <Upload className="h-6 w-6 text-primary" />
        <h3 className="text-lg font-bold text-foreground">Fayl Yüklə</h3>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <select value={selectedDept} onChange={(e) => setSelectedDept(e.target.value)}
          className="rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none focus:border-primary">
          <option value="">Fakültə...</option>
          {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <select value={selectedGroup} onChange={(e) => setSelectedGroup(e.target.value)} disabled={!selectedDept}
          className="rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none focus:border-primary disabled:opacity-50">
          <option value="">Qrup...</option>
          {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
      </div>

      <div className="flex gap-2">
        {(["test", "ticket"] as const).map((t) => (
          <button key={t} onClick={() => setExamType(t)}
            className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
              examType === t ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border text-muted-foreground"
            }`}>
            {t === "test" ? "Test İmtahanı" : "Bilet İmtahanı"}
          </button>
        ))}
      </div>

      <input type="text" value={examName} onChange={(e) => setExamName(e.target.value)}
        placeholder="İmtahan adı" className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none focus:border-primary" />

      <FileUpload onFileSelect={handleFile} />

      {parsedQuestions.length > 0 && (
        <div className="p-3 bg-primary/5 rounded-xl border border-primary/10 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            <span className="font-bold text-foreground">{parsedQuestions.length}</span> sual hazırdır
          </p>
          <Button onClick={uploadExam} disabled={!selectedGroup || !examName.trim()} className="gradient-cherry text-white rounded-xl">
            <Upload className="h-4 w-4 mr-1" /> Qrupa Təyin Et
          </Button>
        </div>
      )}
    </div>
  );
}

/* ─── User Import ─── */
function UsersTab() {
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState("");

  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setProgress("Excel oxunur...");

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows: any[] = XLSX.utils.sheet_to_json(sheet);

      if (rows.length === 0) { toast.error("Boş fayl"); setImporting(false); return; }

      // Find username/password columns
      const firstRow = rows[0];
      const keys = Object.keys(firstRow);
      const usernameKey = keys.find(k => /istifadəçi|username|ad/i.test(k)) || keys[0];
      const passwordKey = keys.find(k => /şifrə|password|parol/i.test(k)) || keys[1];

      if (!usernameKey || !passwordKey) {
        toast.error("İstifadəçi adı və Şifrə sütunları tapılmadı");
        setImporting(false);
        return;
      }

      const users = rows.map(r => ({
        username: String(r[usernameKey] || "").trim(),
        password: String(r[passwordKey] || "").trim(),
      })).filter(u => u.username && u.password);

      // Process in batches of 50
      const batchSize = 50;
      let totalCreated = 0, totalSkipped = 0, totalErrors = 0;

      for (let i = 0; i < users.length; i += batchSize) {
        const batch = users.slice(i, i + batchSize);
        setProgress(`${i}/${users.length} istifadəçi emal edilir...`);

        const { data: result, error } = await supabase.functions.invoke("manage-users", {
          body: { action: "import", users: batch },
        });

        if (error) { totalErrors += batch.length; continue; }
        totalCreated += result.created || 0;
        totalSkipped += result.skipped || 0;
        totalErrors += (result.errors || []).length;
      }

      toast.success(`Tamamlandı: ${totalCreated} yaradıldı, ${totalSkipped} keçirildi, ${totalErrors} xəta`);
      setProgress("");
    } catch (err) {
      toast.error("Excel oxunarkən xəta: " + (err as Error).message);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <Upload className="h-6 w-6 text-primary" />
        <h3 className="text-lg font-bold text-foreground">İstifadəçi Bazası Yüklə</h3>
      </div>
      <p className="text-sm text-muted-foreground">
        Excel (.xlsx) faylında "İstifadəçi adı" və "Şifrə" sütunları olmalıdır.
      </p>

      <label className={`flex flex-col items-center justify-center p-8 rounded-2xl border-2 border-dashed cursor-pointer transition-all ${
        importing ? "border-primary/50 bg-primary/5" : "border-border hover:border-primary/30"
      }`}>
        {importing ? (
          <div className="text-center">
            <Loader2 className="h-8 w-8 text-primary mx-auto animate-spin mb-2" />
            <p className="text-sm font-medium text-foreground">{progress}</p>
          </div>
        ) : (
          <>
            <Upload className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm font-medium text-foreground">Excel faylını seçin</p>
            <p className="text-xs text-muted-foreground mt-1">.xlsx formatı</p>
          </>
        )}
        <input type="file" accept=".xlsx,.xls" onChange={handleExcelUpload} disabled={importing} className="hidden" />
      </label>
    </div>
  );
}

/* ─── Monitoring Tree View ─── */
function MonitoringTab() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [expandedDepts, setExpandedDepts] = useState<Set<string>>(new Set());
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [studentResults, setStudentResults] = useState<ExamResult[]>([]);

  useEffect(() => {
    Promise.all([
      supabase.from("departments" as any).select("id, name").order("name"),
      supabase.from("groups" as any).select("id, name, department_id").order("name"),
      supabase.from("profiles").select("user_id, full_name, group_id, department_id" as any),
    ]).then(([dRes, gRes, pRes]) => {
      if (dRes.data) setDepartments(dRes.data as any);
      if (gRes.data) setGroups(gRes.data as any);
      if (pRes.data) setProfiles((pRes.data as any).filter((p: any) => p.group_id));
    });
  }, []);

  const toggleDept = (id: string) => {
    setExpandedDepts((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  };
  const toggleGroup = (id: string) => {
    setExpandedGroups((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  };

  const loadStudentResults = async (userId: string) => {
    setSelectedStudent(userId);
    const { data } = await supabase
      .from("exam_results" as any)
      .select("id, exam_name, exam_type, percentage, score, total_questions, correct_count, created_at, is_official")
      .eq("user_id", userId).eq("is_official", true)
      .order("created_at", { ascending: false });
    if (data) setStudentResults(data as any);
  };

  return (
    <div className="space-y-2">
      {departments.map((dept) => {
        const deptGroups = groups.filter((g) => g.department_id === dept.id);
        const deptStudents = profiles.filter((p) => p.department_id === dept.id);
        const isExpanded = expandedDepts.has(dept.id);
        return (
          <div key={dept.id}>
            <button onClick={() => toggleDept(dept.id)}
              className="w-full flex items-center gap-2 p-3 rounded-xl border border-border bg-card hover:bg-muted/50 transition-colors">
              {isExpanded ? <ChevronDown className="h-4 w-4 text-primary" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
              <GraduationCap className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold text-foreground">{dept.name}</span>
              <span className="text-xs text-muted-foreground ml-auto">{deptStudents.length} tələbə • {deptGroups.length} qrup</span>
            </button>
            {isExpanded && (
              <div className="ml-6 mt-1 space-y-1">
                {deptGroups.map((group) => {
                  const groupStudents = profiles.filter((p) => p.group_id === group.id);
                  const isGroupExpanded = expandedGroups.has(group.id);
                  return (
                    <div key={group.id}>
                      <button onClick={() => toggleGroup(group.id)}
                        className="w-full flex items-center gap-2 p-2.5 rounded-lg border border-border/50 bg-card/50 hover:bg-muted/30 transition-colors">
                        {isGroupExpanded ? <ChevronDown className="h-3.5 w-3.5 text-primary" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
                        <Users className="h-3.5 w-3.5 text-primary" />
                        <span className="text-sm font-medium">{group.name}</span>
                        <span className="text-xs text-muted-foreground ml-auto">{groupStudents.length} tələbə</span>
                      </button>
                      {isGroupExpanded && (
                        <div className="ml-6 mt-1 space-y-1">
                          {groupStudents.length === 0 ? (
                            <p className="text-xs text-muted-foreground p-2">Tələbə yoxdur</p>
                          ) : groupStudents.map((student) => (
                            <div key={student.user_id}>
                              <button onClick={() => loadStudentResults(student.user_id)}
                                className={`w-full flex items-center gap-2 p-2 rounded-lg transition-colors text-left ${
                                  selectedStudent === student.user_id ? "bg-primary/10 border border-primary/20" : "hover:bg-muted/30"
                                }`}>
                                <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                                <span className="text-sm">{student.full_name || "Adsız"}</span>
                              </button>
                              {selectedStudent === student.user_id && (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="ml-6 mt-1 space-y-1 mb-2">
                                  {studentResults.length === 0 ? (
                                    <p className="text-xs text-muted-foreground p-2">Rəsmi nəticə yoxdur</p>
                                  ) : studentResults.map((r) => (
                                    <div key={r.id} className="p-3 rounded-lg border border-border/50 bg-card/30 text-xs space-y-1">
                                      <div className="flex justify-between">
                                        <span className="font-medium">{r.exam_name}</span>
                                        <span className={`px-2 py-0.5 rounded-full font-bold ${
                                          r.exam_type === "ticket" ? "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300" : "bg-primary/10 text-primary"
                                        }`}>
                                          {r.exam_type === "ticket" ? `${r.score}/50 bal` : `${r.percentage}%`}
                                        </span>
                                      </div>
                                      <div className="text-muted-foreground">
                                        {r.exam_type === "test" && `${r.correct_count}/${r.total_questions} düzgün`}
                                        {" • "}{new Date(r.created_at).toLocaleDateString("az-AZ")}
                                      </div>
                                    </div>
                                  ))}
                                </motion.div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ─── Messages Tab ─── */
function MessagesTab() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [replyText, setReplyText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load all messages where receiver is admin or no receiver
    supabase.from("messages" as any)
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (data) setMessages(data as any);
      });

    const channel = supabase.channel("admin-messages")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) => {
        setMessages((prev) => [payload.new as any, ...prev]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // Group messages by exam_result_id
  const chatGroups = messages.reduce((acc, m) => {
    const key = m.exam_result_id || "general";
    if (!acc[key]) acc[key] = [];
    acc[key].push(m);
    return acc;
  }, {} as Record<string, ChatMessage[]>);

  const loadChat = (examResultId: string) => {
    setSelectedChat(examResultId);
    const msgs = chatGroups[examResultId] || [];
    setChatMessages(msgs.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()));
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const sendReply = async () => {
    if (!replyText.trim() || !user || !selectedChat) return;
    const targetMsg = chatGroups[selectedChat]?.find(m => !m.is_from_admin);
    await supabase.from("messages" as any).insert([{
      sender_id: user.id,
      receiver_id: targetMsg?.sender_id || null,
      exam_result_id: selectedChat === "general" ? null : selectedChat,
      content: replyText.trim(),
      is_from_admin: true,
    }]);
    setReplyText("");
  };

  return (
    <div className="space-y-4">
      {Object.keys(chatGroups).length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">Hələ mesaj yoxdur</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {Object.entries(chatGroups).map(([key, msgs]) => {
              const lastMsg = msgs[0];
              const unread = msgs.filter(m => !m.is_from_admin && !m.read).length;
              return (
                <button key={key} onClick={() => loadChat(key)}
                  className={`w-full text-left p-3 rounded-xl border transition-all ${
                    selectedChat === key ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"
                  }`}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground truncate">{key === "general" ? "Ümumi" : `İmtahan #${key.slice(0, 8)}`}</span>
                    {unread > 0 && <span className="text-[10px] px-2 py-0.5 rounded-full bg-destructive text-white font-bold">{unread}</span>}
                  </div>
                  <p className="text-xs text-muted-foreground truncate mt-1">{lastMsg.content}</p>
                </button>
              );
            })}
          </div>

          {selectedChat && (
            <div className="rounded-xl border border-border p-3">
              <div className="max-h-64 overflow-y-auto space-y-2 mb-3">
                {chatMessages.map((m) => (
                  <div key={m.id} className={`text-xs p-2 rounded-lg max-w-[85%] ${
                    m.is_from_admin ? "bg-primary/10 ml-auto" : "bg-muted"
                  }`}>
                    <p className="font-medium text-[10px] text-muted-foreground mb-0.5">
                      {m.is_from_admin ? "Siz (Admin)" : "Tələbə"}
                    </p>
                    <p className="text-foreground">{m.content}</p>
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>
              <div className="flex gap-2">
                <input type="text" value={replyText} onChange={(e) => setReplyText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendReply()}
                  placeholder="Cavab yazın..." className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-xs outline-none focus:border-primary" />
                <Button onClick={sendReply} size="sm" className="gradient-cherry text-white rounded-lg px-3">
                  <Send className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Admin Page ─── */
export default function AdminPage() {
  const [tab, setTab] = useState<Tab>("monitoring");
  const { isAdmin, isSuperAdmin } = useAuth();

  if (!isAdmin) {
    return (
      <div className="container py-20 text-center">
        <Shield className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-foreground">Giriş Qadağandır</h1>
        <p className="text-muted-foreground mt-2">Bu səhifəyə yalnız adminlər daxil ola bilər.</p>
      </div>
    );
  }

  const tabs: { key: Tab; label: string; icon: typeof Shield; superOnly?: boolean }[] = [
    { key: "monitoring", label: "Monitorinq", icon: BarChart3 },
    { key: "exams", label: "İmtahan Yüklə", icon: FolderOpen },
    { key: "groups", label: "Qruplar", icon: Users },
    { key: "messages", label: "Mesajlar", icon: MessageSquare },
    { key: "admins", label: "Adminlər", icon: Shield },
    ...(isSuperAdmin ? [{ key: "users" as Tab, label: "İstifadəçilər", icon: Upload, superOnly: true }] : []),
  ];

  return (
    <div className="container max-w-4xl py-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold text-foreground mb-2">Admin Paneli</h1>
        <p className="text-muted-foreground mb-8">Universitet İdarəetmə və Monitorinq Sistemi</p>

        <div className="flex gap-1 mb-8 p-1 rounded-2xl bg-muted/50 border border-border overflow-x-auto">
          {tabs.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex items-center justify-center gap-2 px-3 py-3 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                tab === t.key ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}>
              <t.icon className="h-4 w-4" />
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          ))}
        </div>

        <div className="rounded-2xl border border-border bg-card p-6">
          {tab === "monitoring" && <MonitoringTab />}
          {tab === "exams" && <ExamsTab />}
          {tab === "groups" && <GroupsTab />}
          {tab === "messages" && <MessagesTab />}
          {tab === "admins" && <AdminsTab />}
          {tab === "users" && <UsersTab />}
        </div>
      </motion.div>
    </div>
  );
}
