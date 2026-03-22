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
  Upload, GraduationCap, FileText, MessageSquare, Send, Check, X, Loader2, Lock, AlertTriangle,
  RefreshCw, Key
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

/* ─── Confirmation Modal ─── */
function ConfirmModal({ open, title, message, onConfirm, onCancel, destructive }: {
  open: boolean; title: string; message: string; onConfirm: () => void; onCancel: () => void; destructive?: boolean;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="bg-card border border-border rounded-2xl p-6 max-w-sm w-full mx-4 shadow-xl">
        <div className="flex items-center gap-3 mb-4">
          <AlertTriangle className={`h-6 w-6 ${destructive ? "text-destructive" : "text-primary"}`} />
          <h3 className="text-lg font-bold text-foreground">{title}</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-6">{message}</p>
        <div className="flex gap-3">
          <Button onClick={onCancel} variant="outline" className="flex-1 rounded-xl">Xeyr</Button>
          <Button onClick={onConfirm} className={`flex-1 rounded-xl font-bold ${destructive ? "bg-destructive text-white hover:bg-destructive/90" : "gradient-cherry text-white"}`}>Bəli</Button>
        </div>
      </motion.div>
    </div>
  );
}

/* ─── Admin Management ─── */
function AdminsTab() {
  const { user, isSuperAdmin } = useAuth();
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [deletionRequests, setDeletionRequests] = useState<DeletionRequest[]>([]);
  const [creating, setCreating] = useState(false);
  const [changingPw, setChangingPw] = useState(false);
  const [newPw, setNewPw] = useState("");
  const [showPwForm, setShowPwForm] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; email: string } | null>(null);

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
    if (!newUsername.trim() || !newPassword.trim()) {
      toast.error("İstifadəçi adı və şifrə daxil edin");
      return;
    }
    setCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke("manage-users", {
        body: { action: "create-admin", username: newUsername.trim(), password: newPassword.trim() },
      });
      if (error) {
        toast.error("Xəta baş verdi: " + error.message);
      } else if (data?.error) {
        // Handle duplicate admin re-creation
        if (data.error.includes("already been registered") || data.error.includes("already exists")) {
          toast.error("Bu istifadəçi artıq mövcuddur. Fərqli ad istifadə edin.");
        } else {
          toast.error(data.error);
        }
      } else {
        toast.success("Admin yaradıldı");
        setNewUsername("");
        setNewPassword("");
        load();
      }
    } catch (e) {
      toast.error("Xəta: " + (e as Error).message);
    }
    setCreating(false);
  };

  const changeMyPassword = async () => {
    if (!newPw.trim() || newPw.length < 6) { toast.error("Şifrə minimum 6 simvol olmalıdır"); return; }
    setChangingPw(true);
    const { error } = await supabase.functions.invoke("manage-users", {
      body: { action: "change-password", newPassword: newPw.trim() },
    });
    if (error) toast.error("Xəta baş verdi");
    else { toast.success("Şifrə dəyişdirildi"); setNewPw(""); setShowPwForm(false); }
    setChangingPw(false);
  };

  const executeDelete = async (id: string, email: string) => {
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
    setDeleteConfirm(null);
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
      <ConfirmModal open={!!deleteConfirm} title="Admini Sil" destructive
        message={`"${deleteConfirm?.email}" adminini silmək istədiyinizə əminsiniz?`}
        onConfirm={() => deleteConfirm && executeDelete(deleteConfirm.id, deleteConfirm.email)}
        onCancel={() => setDeleteConfirm(null)} />

      <div className="flex items-center gap-3 mb-2">
        <Shield className="h-6 w-6 text-primary" />
        <h3 className="text-lg font-bold text-foreground">Admin İdarəetməsi</h3>
      </div>

      {/* Password change */}
      <div className="p-4 rounded-xl border border-border bg-muted/20">
        <button onClick={() => setShowPwForm(!showPwForm)} className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Key className="h-4 w-4 text-primary" /> Şifrəmi Dəyiş
          {showPwForm ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        </button>
        {showPwForm && (
          <div className="mt-3 space-y-2">
            <input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)}
              placeholder="Yeni şifrə (min 6 simvol)" className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none focus:border-primary" />
            <Button onClick={changeMyPassword} disabled={changingPw} className="gradient-cherry text-white rounded-xl w-full">
              {changingPw ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Lock className="h-4 w-4 mr-1" />} Şifrəni Yenilə
            </Button>
          </div>
        )}
      </div>

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
              <button onClick={() => setDeleteConfirm({ id: a.id, email: a.email })} className="text-destructive hover:text-destructive/80 p-1">
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Groups Management (Accordion by Faculty) ─── */
function GroupsTab() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupExams, setGroupExams] = useState<GroupExam[]>([]);
  const [selectedDept, setSelectedDept] = useState("");
  const [newGroupName, setNewGroupName] = useState("");
  const [expandedDept, setExpandedDept] = useState<string | null>(null);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const [deleteGroupConfirm, setDeleteGroupConfirm] = useState<{ id: string; name: string; type: "group" | "exam" } | null>(null);

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

  const executeDeleteGroup = async () => {
    if (!deleteGroupConfirm) return;
    if (deleteGroupConfirm.type === "group") {
      await supabase.from("groups" as any).delete().eq("id", deleteGroupConfirm.id);
      toast.success("Qrup silindi");
    } else {
      await supabase.from("group_exams" as any).delete().eq("id", deleteGroupConfirm.id);
      toast.success("İmtahan silindi");
    }
    setDeleteGroupConfirm(null);
    loadAll();
  };

  // deleteExam now goes through confirmation modal

  return (
    <div className="space-y-6">
      <ConfirmModal open={!!deleteGroupConfirm} title={deleteGroupConfirm?.type === "group" ? "Qrupu Sil" : "İmtahanı Sil"} destructive
        message={deleteGroupConfirm?.type === "group"
          ? `"${deleteGroupConfirm?.name}" qrupunu silmək istədiyinizə əminsiniz? Bu əməliyyat geri qaytarıla bilməz.`
          : `"${deleteGroupConfirm?.name}" imtahanını silmək istədiyinizə əminsiniz? Bu əməliyyat geri qaytarıla bilməz.`}
        onConfirm={executeDeleteGroup}
        onCancel={() => setDeleteGroupConfirm(null)} />
      <div className="flex items-center gap-3 mb-2">
        <Users className="h-6 w-6 text-primary" />
        <h3 className="text-lg font-bold text-foreground">Qruplar</h3>
      </div>

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

      <div className="space-y-2">
        {departments.map((dept) => {
          const deptGroups = groups.filter((g) => g.department_id === dept.id);
          const isDeptExpanded = expandedDept === dept.id;
          return (
            <div key={dept.id} className="rounded-xl border border-border bg-card overflow-hidden">
              <button onClick={() => setExpandedDept(isDeptExpanded ? null : dept.id)}
                className="w-full flex items-center gap-2 p-3 hover:bg-muted/50 transition-colors">
                {isDeptExpanded ? <ChevronDown className="h-4 w-4 text-primary" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                <GraduationCap className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold text-foreground">{dept.name}</span>
                <span className="text-xs text-muted-foreground ml-auto">{deptGroups.length} qrup</span>
              </button>
              {isDeptExpanded && (
                <div className="border-t border-border px-3 pb-3 pt-2 space-y-2">
                  {deptGroups.length === 0 ? (
                    <p className="text-xs text-muted-foreground p-2">Bu fakültədə qrup yoxdur</p>
                  ) : deptGroups.map((g) => {
                    const gExams = groupExams.filter((e) => e.group_id === g.id);
                    const isExpanded = expandedGroup === g.id;
                    return (
                      <div key={g.id} className="rounded-lg border border-border/50 bg-muted/10 overflow-hidden">
                        <div className="flex items-center justify-between p-2.5">
                          <button onClick={() => setExpandedGroup(isExpanded ? null : g.id)} className="flex items-center gap-2 flex-1">
                            {isExpanded ? <ChevronDown className="h-3.5 w-3.5 text-primary" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
                            <Users className="h-3.5 w-3.5 text-primary" />
                            <span className="text-sm font-medium">{g.name}</span>
                            <span className="text-xs text-muted-foreground">({gExams.length} imtahan)</span>
                          </button>
                          <button onClick={() => setDeleteGroupConfirm({ id: g.id, name: g.name, type: "group" })} className="text-destructive hover:text-destructive/80 p-1">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        {isExpanded && gExams.length > 0 && (
                          <div className="border-t border-border/50 px-2.5 pb-2.5 pt-1.5 space-y-1">
                            {gExams.map((ex) => (
                              <div key={ex.id} className="flex items-center justify-between p-2 rounded-lg bg-background">
                                <div className="flex items-center gap-2">
                                  <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                                  <span className="text-xs font-medium">{ex.name}</span>
                                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                                    ex.exam_type === "ticket" ? "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300" : "bg-primary/10 text-primary"
                                  }`}>{ex.exam_type === "ticket" ? "Bilet" : "Test"}</span>
                                </div>
                                <button onClick={() => setDeleteGroupConfirm({ id: ex.id, name: ex.name, type: "exam" })} className="text-destructive/60 hover:text-destructive p-1">
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
              )}
            </div>
          );
        })}
      </div>
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

/* ─── User Management & Full System Reset ─── */
function UsersTab() {
  const { isSuperAdmin } = useAuth();
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState("");
  const [importMode, setImportMode] = useState<"append" | "reset">("append");
  const [showResetUploadConfirm, setShowResetUploadConfirm] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [showFullReset, setShowFullReset] = useState(false);
  const [showFullResetConfirm2, setShowFullResetConfirm2] = useState(false);
  const [fullResetting, setFullResetting] = useState(false);

  const processImport = async (file: File, doReset: boolean) => {
    setImporting(true);
    setProgress("Excel oxunur...");
    try {
      if (doReset) {
        setProgress("Sistem sıfırlanır...");
        await supabase.functions.invoke("manage-users", { body: { action: "reset-system" } });
      }
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows: any[] = XLSX.utils.sheet_to_json(sheet);
      if (rows.length === 0) { toast.error("Boş fayl"); setImporting(false); return; }

      const firstRow = rows[0];
      const keys = Object.keys(firstRow);
      const usernameKey = keys.find(k => /^username$/i.test(k)) || keys[0];
      const passwordKey = keys.find(k => /^password$/i.test(k)) || keys[1];
      if (!usernameKey || !passwordKey) { toast.error("'username' və 'password' sütunları tapılmadı"); setImporting(false); return; }

      const users = rows.map(r => ({
        username: String(r[usernameKey] || "").trim(),
        password: String(r[passwordKey] || "").trim(),
      })).filter(u => u.username && u.password);

      const batchSize = 50;
      let totalCreated = 0, totalSkipped = 0, totalErrors = 0;
      for (let i = 0; i < users.length; i += batchSize) {
        const batch = users.slice(i, i + batchSize);
        setProgress(`${i}/${users.length} istifadəçi emal edilir...`);
        const { data: result, error } = await supabase.functions.invoke("manage-users", { body: { action: "import", users: batch } });
        if (error) { totalErrors += batch.length; continue; }
        totalCreated += result.created || 0;
        totalSkipped += result.skipped || 0;
        totalErrors += (result.errors || []).length;
      }
      toast.success(`Tamamlandı: ${totalCreated} yaradıldı, ${totalSkipped} mövcud, ${totalErrors} xəta`);
      setProgress("");
    } catch (err) {
      toast.error("Excel oxunarkən xəta: " + (err as Error).message);
    } finally { setImporting(false); setPendingFile(null); }
  };

  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (importMode === "reset") { setPendingFile(file); setShowResetUploadConfirm(true); }
    else processImport(file, false);
  };

  const fullSystemReset = async () => {
    setFullResetting(true);
    try {
      const { error } = await supabase.functions.invoke("manage-users", { body: { action: "full-reset" } });
      if (error) toast.error("Xəta: " + error.message);
      else toast.success("Sistem tam sıfırlandı! Bütün köhnə məlumatlar silindi.");
    } catch (e) { toast.error("Xəta: " + (e as Error).message); }
    setFullResetting(false);
    setShowFullReset(false);
    setShowFullResetConfirm2(false);
  };

  return (
    <div className="space-y-6">
      <ConfirmModal open={showResetUploadConfirm} title="Sistemi Sıfırla və Yüklə" destructive
        message="Bütün köhnə data silinəcək və yeni istifadəçilər yüklənəcək. Davam etmək istəyirsiniz?"
        onConfirm={() => { setShowResetUploadConfirm(false); if (pendingFile) processImport(pendingFile, true); }}
        onCancel={() => { setShowResetUploadConfirm(false); setPendingFile(null); }} />

      {/* First confirm */}
      <ConfirmModal open={showFullReset && !showFullResetConfirm2} title="Sistemi Tam Sıfırla" destructive
        message="Bu əməliyyat bütün tələbələri, imtahanları, nəticələri, köhnə admin qeydlərini siləcək. Davam etmək istəyirsiniz?"
        onConfirm={() => setShowFullResetConfirm2(true)}
        onCancel={() => setShowFullReset(false)} />
      {/* Second confirm */}
      <ConfirmModal open={showFullResetConfirm2} title="SON TƏSDİQ" destructive
        message="Bu əməliyyat GERİ QAYTARILMAZ. Bütün istifadəçilər, imtahanlar və admin qeydləri silinəcək. Tam əminsiniz?"
        onConfirm={fullSystemReset}
        onCancel={() => { setShowFullResetConfirm2(false); setShowFullReset(false); }} />

      <div className="flex items-center gap-3 mb-2">
        <Upload className="h-6 w-6 text-primary" />
        <h3 className="text-lg font-bold text-foreground">İstifadəçi Bazası</h3>
      </div>
      <p className="text-sm text-muted-foreground">
        Excel (.xlsx) faylında <strong>"username"</strong> və <strong>"password"</strong> sütunları olmalıdır.
      </p>

      <div className="flex gap-2">
        <button onClick={() => setImportMode("append")}
          className={`flex-1 px-4 py-3 rounded-xl text-sm font-medium border transition-all ${
            importMode === "append" ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border text-muted-foreground"
          }`}>
          <Plus className="h-4 w-4 inline mr-1" /> Mövcud Bazaya Əlavə Et
        </button>
        <button onClick={() => setImportMode("reset")}
          className={`flex-1 px-4 py-3 rounded-xl text-sm font-medium border transition-all ${
            importMode === "reset" ? "bg-destructive text-white border-destructive" : "bg-background border-border text-muted-foreground"
          }`}>
          <RefreshCw className="h-4 w-4 inline mr-1" /> Sıfırla və Yüklə
        </button>
      </div>

      {importMode === "append" && (
        <p className="text-xs text-muted-foreground bg-muted/30 p-3 rounded-lg">
          Mövcud tələbələr saxlanılacaq, yalnız yeni istifadəçilər əlavə olunacaq (duplikat yoxlanır).
        </p>
      )}
      {importMode === "reset" && (
        <p className="text-xs text-destructive bg-destructive/5 p-3 rounded-lg">
          ⚠️ Bütün köhnə data (imtahanlar, nəticələr, istifadəçilər) silinəcək və yeni bazadan yüklənəcək.
        </p>
      )}

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

      {/* Full System Reset */}
      {isSuperAdmin && (
        <div className="p-4 rounded-xl border border-destructive/20 bg-destructive/5 space-y-3">
          <p className="text-sm font-bold text-destructive flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" /> Sistemi Tam Sıfırla
          </p>
          <p className="text-xs text-muted-foreground">
            Bütün tələbələr, imtahanlar, nəticələr, köhnə admin qeydləri silinəcək. Sistem sıfırdan başlayacaq.
          </p>
          <Button onClick={() => setShowFullReset(true)} disabled={fullResetting}
            className="bg-destructive text-white hover:bg-destructive/90 rounded-xl">
            {fullResetting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <AlertTriangle className="h-4 w-4 mr-1" />}
            Sistemi Tam Sıfırla
          </Button>
        </div>
      )}
    </div>
  );
}

/* ─── Monitoring Tree View ─── */
function MonitoringTab() {
  const { isSuperAdmin } = useAuth();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [expandedDepts, setExpandedDepts] = useState<Set<string>>(new Set());
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [studentResults, setStudentResults] = useState<ExamResult[]>([]);
  const [resetConfirm, setResetConfirm] = useState<{ userId: string; name: string } | null>(null);
  const [deleteStudentConfirm, setDeleteStudentConfirm] = useState<{ userId: string; name: string } | null>(null);
  const [resetting, setResetting] = useState(false);

  const loadData = useCallback(() => {
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

  useEffect(() => { loadData(); }, [loadData]);

  const toggleDept = (id: string) => {
    setExpandedDepts((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  };
  const toggleGroup = (id: string) => {
    setExpandedGroups((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  };

  const loadStudentResults = async (userId: string) => {
    if (selectedStudent === userId) { setSelectedStudent(null); return; }
    setSelectedStudent(userId);
    const { data } = await supabase
      .from("exam_results" as any)
      .select("id, exam_name, exam_type, percentage, score, total_questions, correct_count, created_at, is_official")
      .eq("user_id", userId)
      .eq("is_official", true)
      .order("created_at", { ascending: false });
    if (data) setStudentResults(data as any);
    else setStudentResults([]);
  };

  const resetStudentExams = async () => {
    if (!resetConfirm) return;
    setResetting(true);
    const { data, error } = await supabase.functions.invoke("manage-users", {
      body: { action: "reset-student-exams", targetUserId: resetConfirm.userId },
    });
    if (error || data?.error) toast.error("Xəta: " + (error?.message || data?.error));
    else {
      toast.success(`"${resetConfirm.name}" tələbəsinin imtahan nəticələri və mesajları sıfırlandı`);
      if (selectedStudent === resetConfirm.userId) {
        setStudentResults([]);
      }
    }
    setResetting(false);
    setResetConfirm(null);
  };

  const deleteStudent = async () => {
    if (!deleteStudentConfirm) return;
    setResetting(true);
    const { data, error } = await supabase.functions.invoke("manage-users", {
      body: { action: "delete-student", targetUserId: deleteStudentConfirm.userId },
    });
    if (error || data?.error) toast.error("Xəta: " + (error?.message || data?.error));
    else {
      toast.success(`"${deleteStudentConfirm.name}" tələbəsi silindi. Növbəti girişdə yenidən qeydiyyatdan keçəcək.`);
      loadData();
    }
    setResetting(false);
    setDeleteStudentConfirm(null);
  };

  return (
    <div className="space-y-2">
      <ConfirmModal open={!!resetConfirm} title="İmtahan Nəticələrini Sıfırla" destructive
        message={`"${resetConfirm?.name}" tələbəsinin imtahan nəticələrini və mesajlarını sıfırlamaq istəyirsiniz? (Profil məlumatları qalacaq)`}
        onConfirm={resetStudentExams}
        onCancel={() => setResetConfirm(null)} />
      <ConfirmModal open={!!deleteStudentConfirm} title="Tələbəni Sil" destructive
        message={`"${deleteStudentConfirm?.name}" tələbəni tamamilə silmək istədiyinizə əminsiniz? Bütün məlumatları silinəcək və növbəti girişdə yenidən qeydiyyatdan keçməli olacaq. Bu əməliyyat geri qaytarıla bilməz.`}
        onConfirm={deleteStudent}
        onCancel={() => setDeleteStudentConfirm(null)} />

      <div className="flex items-center gap-3 mb-4">
        <BarChart3 className="h-6 w-6 text-primary" />
        <h3 className="text-lg font-bold text-foreground">Monitorinq</h3>
      </div>

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
                              <div className="flex items-center gap-1">
                                <button onClick={() => loadStudentResults(student.user_id)}
                                  className={`flex-1 flex items-center gap-2 p-2 rounded-lg transition-colors text-left ${
                                    selectedStudent === student.user_id ? "bg-primary/10 border border-primary/20" : "hover:bg-muted/30"
                                  }`}>
                                  <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                                  <span className="text-sm">{student.full_name || "Adsız"}</span>
                                </button>
                                {isSuperAdmin && (
                                  <>
                                    <button
                                      onClick={() => setResetConfirm({ userId: student.user_id, name: student.full_name || "Adsız" })}
                                      title="Qeydiyyatı Sıfırla"
                                      className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                                      <RefreshCw className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                      onClick={() => setDeleteStudentConfirm({ userId: student.user_id, name: student.full_name || "Adsız" })}
                                      title="Tələbəni Sil"
                                      className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </>
                                )}
                              </div>
                              {selectedStudent === student.user_id && (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="ml-6 mt-1 space-y-1 mb-2">
                                  {studentResults.length === 0 ? (
                                    <p className="text-xs text-muted-foreground p-2">Rəsmi nəticə yoxdur</p>
                                  ) : studentResults.map((r) => (
                                    <div key={r.id} className="p-3 rounded-lg border border-border/50 bg-card/30 text-xs space-y-1">
                                      <div className="flex justify-between items-center">
                                        <span className="font-bold text-foreground">{r.exam_name || "Adsız imtahan"}</span>
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

/* ─── Messages Tab (Hierarchical with badges and admin name) ─── */
function MessagesTab() {
  const { user, fullName: adminName } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [profiles, setProfiles] = useState<Record<string, { full_name: string; group_name: string; dept_name: string }>>({});
  const [examNames, setExamNames] = useState<Record<string, string>>({});
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [replyText, setReplyText] = useState("");
  const [adminProfiles, setAdminProfiles] = useState<Record<string, string>>({});
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.from("messages" as any)
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (data) setMessages(data as any);
      });

    // Load profiles with group and department names
    Promise.all([
      supabase.from("profiles").select("user_id, full_name, group_id, department_id" as any),
      supabase.from("groups" as any).select("id, name"),
      supabase.from("departments" as any).select("id, name"),
    ]).then(([profRes, groupsRes, deptRes]) => {
      const groupMap: Record<string, string> = {};
      ((groupsRes.data || []) as any[]).forEach((g: any) => { groupMap[g.id] = g.name; });
      const deptMap: Record<string, string> = {};
      ((deptRes.data || []) as any[]).forEach((d: any) => { deptMap[d.id] = d.name; });
      const map: Record<string, { full_name: string; group_name: string; dept_name: string }> = {};
      ((profRes.data || []) as any[]).forEach((p: any) => {
        map[p.user_id] = {
          full_name: p.full_name || "Adsız",
          group_name: groupMap[p.group_id] || "",
          dept_name: deptMap[p.department_id] || "",
        };
      });
      setProfiles(map);
    });

    // Load admin profiles (to show which admin replied)
    supabase.from("admins" as any).select("email").then(async ({ data: adminsData }) => {
      // Build admin email -> name map from profiles
      const profMap: Record<string, string> = {};
      if (adminsData) {
        const { data: allProfs } = await supabase.from("profiles").select("user_id, full_name" as any);
        if (allProfs) {
          (allProfs as any[]).forEach((p: any) => { profMap[p.user_id] = p.full_name || "Admin"; });
        }
      }
      setAdminProfiles(profMap);
    });

    supabase.from("exam_results" as any).select("id, exam_name").then(({ data }) => {
      if (data) {
        const map: Record<string, string> = {};
        (data as any[]).forEach((r: any) => { map[r.id] = r.exam_name; });
        setExamNames(map);
      }
    });

    const channel = supabase.channel("admin-messages")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) => {
        setMessages((prev) => [payload.new as any, ...prev]);
        // Auto-update current chat
        setChatMessages((prev) => {
          const newMsg = payload.new as any;
          if (newMsg.exam_result_id === selectedChat || (!newMsg.exam_result_id && selectedChat === "general")) {
            return [...prev, newMsg];
          }
          return prev;
        });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const chatGroups = messages.reduce((acc, m) => {
    const key = m.exam_result_id || "general";
    if (!acc[key]) acc[key] = [];
    acc[key].push(m);
    return acc;
  }, {} as Record<string, ChatMessage[]>);

  const totalUnread = messages.filter(m => !m.is_from_admin && !m.read).length;

  const loadChat = async (examResultId: string) => {
    setSelectedChat(examResultId);
    const msgs = chatGroups[examResultId] || [];
    setChatMessages(msgs.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()));

    // Mark unread messages as read
    const unreadIds = msgs.filter(m => !m.is_from_admin && !m.read).map(m => m.id);
    if (unreadIds.length > 0) {
      for (const id of unreadIds) {
        await supabase.from("messages" as any).update({ read: true }).eq("id", id);
      }
      setMessages(prev => prev.map(m => unreadIds.includes(m.id) ? { ...m, read: true } : m));
    }
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

  const getStudentInfo = (chatMsgs: ChatMessage[]) => {
    const studentMsg = chatMsgs.find(m => !m.is_from_admin);
    if (!studentMsg) return { name: "Naməlum", group: "", dept: "", exam: "" };
    const prof = profiles[studentMsg.sender_id];
    return {
      name: prof?.full_name || "Naməlum",
      group: prof?.group_name || "",
      dept: prof?.dept_name || "",
      exam: studentMsg.exam_result_id ? (examNames[studentMsg.exam_result_id] || "Naməlum imtahan") : "",
    };
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <MessageSquare className="h-6 w-6 text-primary" />
        <h3 className="text-lg font-bold text-foreground">Mesajlar</h3>
        {totalUnread > 0 && (
          <span className="px-2.5 py-0.5 rounded-full bg-destructive text-white text-xs font-bold">{totalUnread}</span>
        )}
      </div>

      {Object.keys(chatGroups).length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">Hələ mesaj yoxdur</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {Object.entries(chatGroups).map(([key, msgs]) => {
              const info = getStudentInfo(msgs);
              const unread = msgs.filter(m => !m.is_from_admin && !m.read).length;
              return (
                <button key={key} onClick={() => loadChat(key)}
                  className={`w-full text-left p-3 rounded-xl border transition-all ${
                    selectedChat === key ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"
                  }`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-bold text-foreground">{info.name}</span>
                    {unread > 0 && <span className="text-[10px] px-2 py-0.5 rounded-full bg-destructive text-white font-bold">{unread}</span>}
                  </div>
                  {info.dept && <p className="text-[10px] text-muted-foreground">{info.dept}</p>}
                  {info.group && <p className="text-[10px] text-primary font-medium">{info.group}</p>}
                  {info.exam && <p className="text-[10px] text-muted-foreground">📝 {info.exam}</p>}
                  <p className="text-xs text-muted-foreground truncate mt-1">{msgs[0].content}</p>
                </button>
              );
            })}
          </div>

          {selectedChat && (
            <div className="rounded-xl border border-border p-3">
              {/* Chat header with student details */}
              {(() => {
                const info = getStudentInfo(chatGroups[selectedChat] || []);
                return (
                  <div className="pb-3 mb-3 border-b border-border">
                    <p className="text-sm font-bold text-foreground">{info.name}</p>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {info.dept && <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{info.dept}</span>}
                      {info.group && <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">{info.group}</span>}
                      {info.exam && <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent text-accent-foreground">📝 {info.exam}</span>}
                    </div>
                  </div>
                );
              })()}

              <div className="max-h-64 overflow-y-auto space-y-2 mb-3">
                {chatMessages.map((m) => (
                  <div key={m.id} className={`text-xs p-2 rounded-lg max-w-[85%] ${
                    m.is_from_admin ? "bg-primary/10 ml-auto" : "bg-muted"
                  }`}>
                    <p className="font-medium text-[10px] text-muted-foreground mb-0.5">
                      {m.is_from_admin
                        ? (adminProfiles[m.sender_id] || adminName || "Admin")
                        : (profiles[m.sender_id]?.full_name || "Tələbə")}
                      {" • "}{new Date(m.created_at).toLocaleTimeString("az-AZ", { hour: "2-digit", minute: "2-digit" })}
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
  const [unreadCount, setUnreadCount] = useState(0);

  // Load unread message count
  useEffect(() => {
    supabase.from("messages" as any).select("id").eq("is_from_admin", false).eq("read", false).then(({ data }) => {
      if (data) setUnreadCount(data.length);
    });

    const channel = supabase.channel("unread-badge")
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => {
        supabase.from("messages" as any).select("id").eq("is_from_admin", false).eq("read", false).then(({ data }) => {
          if (data) setUnreadCount(data.length);
        });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  if (!isAdmin) {
    return (
      <div className="container py-20 text-center">
        <Shield className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-foreground">Giriş Qadağandır</h1>
        <p className="text-muted-foreground mt-2">Bu səhifəyə yalnız adminlər daxil ola bilər.</p>
      </div>
    );
  }

  const tabs: { key: Tab; label: string; icon: typeof Shield; badge?: number; superOnly?: boolean }[] = [
    { key: "monitoring", label: "Monitorinq", icon: BarChart3 },
    { key: "exams", label: "İmtahan Yüklə", icon: FolderOpen },
    { key: "groups", label: "Qruplar", icon: Users },
    { key: "messages", label: "Mesajlar", icon: MessageSquare, badge: unreadCount },
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
              className={`relative flex items-center justify-center gap-2 px-3 py-3 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                tab === t.key ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}>
              <t.icon className="h-4 w-4" />
              <span className="hidden sm:inline">{t.label}</span>
              {t.badge && t.badge > 0 && tab !== t.key && (
                <span className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center rounded-full bg-destructive text-white text-[10px] font-bold">
                  {t.badge}
                </span>
              )}
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
