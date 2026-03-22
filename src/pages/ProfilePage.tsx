import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import {
  User, GraduationCap, Users, Lock, RotateCcw, ClipboardCheck, Ticket,
  AlertTriangle, Eye, EyeOff,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface GroupExam {
  id: string;
  name: string;
  exam_type: string;
  question_count: number;
}

export default function ProfilePage() {
  const { user, profile, refreshProfile, signOut } = useAuth();
  const navigate = useNavigate();

  const [deptName, setDeptName] = useState("");
  const [groupName, setGroupName] = useState("");
  const [testExams, setTestExams] = useState<GroupExam[]>([]);
  const [ticketExams, setTicketExams] = useState<GroupExam[]>([]);

  // Password change state
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Account reset state
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  // Fetch department & group names
  useEffect(() => {
    if (!profile) return;
    if (profile.department_id) {
      supabase.from("departments" as any).select("name").eq("id", profile.department_id).maybeSingle()
        .then(({ data }) => { if (data) setDeptName((data as any).name); });
    }
    if (profile.group_id) {
      supabase.from("groups" as any).select("name").eq("id", profile.group_id).maybeSingle()
        .then(({ data }) => { if (data) setGroupName((data as any).name); });
    }
  }, [profile]);

  // Fetch assigned exams for this user's group
  useEffect(() => {
    if (!profile?.group_id) return;
    supabase.from("group_exams" as any)
      .select("id, name, exam_type, question_count")
      .eq("group_id", profile.group_id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (data) {
          const exams = data as any as GroupExam[];
          setTestExams(exams.filter(e => e.exam_type === "test"));
          setTicketExams(exams.filter(e => e.exam_type === "ticket"));
        }
      });
  }, [profile?.group_id]);

  // Password change — step 1: enter new password
  const handlePasswordStep1 = () => {
    if (newPassword.length < 6) {
      toast.error("Şifrə minimum 6 simvol olmalıdır.");
      return;
    }
    setShowPasswordDialog(false);
    setShowPasswordConfirm(true);
  };

  // Password change — step 2: confirm
  const handlePasswordConfirm = async () => {
    setPasswordLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      toast.error("Şifrə dəyişdirilə bilmədi: " + error.message);
    } else {
      toast.success("Şifrə uğurla dəyişdirildi!");
    }
    setPasswordLoading(false);
    setShowPasswordConfirm(false);
    setNewPassword("");
  };

  // Account reset
  const handleAccountReset = async () => {
    if (!user) return;
    setResetLoading(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: "",
        department_id: null,
        group_id: null,
        onboarding_complete: false,
      } as any)
      .eq("user_id", user.id);

    if (error) {
      toast.error("Sıfırlama zamanı xəta: " + error.message);
    } else {
      toast.success("Hesab sıfırlandı. Yenidən qeydiyyatdan keçməlisiniz.");
      await refreshProfile();
      navigate("/onboarding", { replace: true });
    }
    setResetLoading(false);
    setShowResetConfirm(false);
  };

  if (!profile) return null;

  return (
    <div className="container py-8 max-w-2xl">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        {/* Personal Info */}
        <div className="rounded-2xl border border-border bg-card p-6 mb-6">
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2 mb-5">
            <User className="h-5 w-5 text-primary" /> Şəxsi Məlumatlar
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <InfoItem icon={User} label="Ad, Soyad" value={profile.full_name || "—"} />
            <InfoItem icon={GraduationCap} label="Fakültə" value={deptName || "—"} />
            <InfoItem icon={Users} label="Qrup" value={groupName || "—"} />
          </div>
        </div>

        {/* Assigned Tests */}
        <div className="rounded-2xl border border-border bg-card p-6 mb-6">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2 mb-4">
            <ClipboardCheck className="h-5 w-5 text-primary" /> Mənə təyin edilmiş testlər
          </h2>
          {testExams.length === 0 ? (
            <p className="text-sm text-muted-foreground">Hazırda təyin edilmiş test yoxdur.</p>
          ) : (
            <div className="space-y-2">
              {testExams.map(e => (
                <div key={e.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/50 border border-border">
                  <span className="text-sm font-medium text-foreground">{e.name}</span>
                  <span className="text-xs text-muted-foreground">{e.question_count} sual</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Assigned Tickets */}
        <div className="rounded-2xl border border-border bg-card p-6 mb-6">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2 mb-4">
            <Ticket className="h-5 w-5 text-primary" /> Mənə təyin edilmiş biletlər
          </h2>
          {ticketExams.length === 0 ? (
            <p className="text-sm text-muted-foreground">Hazırda təyin edilmiş bilet yoxdur.</p>
          ) : (
            <div className="space-y-2">
              {ticketExams.map(e => (
                <div key={e.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/50 border border-border">
                  <span className="text-sm font-medium text-foreground">{e.name}</span>
                  <span className="text-xs text-muted-foreground">{e.question_count} sual</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Account Actions */}
        <div className="rounded-2xl border border-border bg-card p-6">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2 mb-4">
            <Lock className="h-5 w-5 text-primary" /> Hesab İdarəetməsi
          </h2>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setShowPasswordDialog(true)}>
              <Lock className="h-4 w-4 mr-2" /> Şifrəni Dəyiş
            </Button>
            <Button variant="outline" className="flex-1 rounded-xl text-destructive border-destructive/30 hover:bg-destructive/10"
              onClick={() => setShowResetConfirm(true)}>
              <RotateCcw className="h-4 w-4 mr-2" /> Hesabı Sıfırla
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Password Dialog — Step 1: Enter new password */}
      <Dialog open={showPasswordDialog} onOpenChange={(o) => { if (!o) { setShowPasswordDialog(false); setNewPassword(""); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Yeni Şifrə</DialogTitle>
            <DialogDescription>Yeni şifrənizi daxil edin (minimum 6 simvol).</DialogDescription>
          </DialogHeader>
          <div className="relative">
            <input
              type={showPass ? "text" : "password"}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Yeni şifrə"
              className="w-full rounded-xl border border-input bg-background px-4 py-3 pr-10 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
            <button type="button" onClick={() => setShowPass(!showPass)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowPasswordDialog(false); setNewPassword(""); }}>Ləğv et</Button>
            <Button onClick={handlePasswordStep1} className="gradient-cherry text-primary-foreground">Davam et</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Password Dialog — Step 2: Confirm */}
      <AlertDialog open={showPasswordConfirm} onOpenChange={setShowPasswordConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" /> Təsdiq
            </AlertDialogTitle>
            <AlertDialogDescription>
              Şifrənizi dəyişməyə əminsiniz? Bu əməliyyatdan sonra yeni şifrə ilə daxil olmalısınız.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setShowPasswordConfirm(false); setNewPassword(""); }}>
              Xeyr
            </AlertDialogCancel>
            <AlertDialogAction onClick={handlePasswordConfirm} disabled={passwordLoading}
              className="bg-primary text-primary-foreground">
              {passwordLoading ? "Dəyişdirilir..." : "Bəli, dəyiş"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Account Reset Confirm */}
      <AlertDialog open={showResetConfirm} onOpenChange={setShowResetConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" /> Hesabı Sıfırla
            </AlertDialogTitle>
            <AlertDialogDescription>
              Bu əməliyyat geri qaytarıla bilməz. Hesab məlumatlarınız (ad, soyad, fakültə, qrup) silinəcək və yenidən qeydiyyatdan keçməli olacaqsınız. Əminsiniz?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Xeyr</AlertDialogCancel>
            <AlertDialogAction onClick={handleAccountReset} disabled={resetLoading}
              className="bg-destructive text-white hover:bg-destructive/90">
              {resetLoading ? "Sıfırlanır..." : "Bəli, sıfırla"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function InfoItem({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/50">
      <Icon className="h-4 w-4 text-primary mt-0.5 shrink-0" />
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium text-foreground">{value}</p>
      </div>
    </div>
  );
}
