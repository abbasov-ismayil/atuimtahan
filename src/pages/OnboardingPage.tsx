import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { GraduationCap, Users, User } from "lucide-react";

interface Department { id: string; name: string; }
interface Group { id: string; name: string; department_id: string; }

export default function OnboardingPage() {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [departments, setDepartments] = useState<Department[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedDept, setSelectedDept] = useState("");
  const [selectedGroup, setSelectedGroup] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.from("departments" as any).select("id, name").order("name").then(({ data }) => {
      if (data) setDepartments(data as any);
    });
  }, []);

  useEffect(() => {
    if (!selectedDept) { setGroups([]); setSelectedGroup(""); return; }
    supabase.from("groups" as any).select("id, name, department_id").eq("department_id", selectedDept).order("name").then(({ data }) => {
      if (data) setGroups(data as any);
      setSelectedGroup("");
    });
  }, [selectedDept]);

  const handleSubmit = async () => {
    if (!fullName.trim() || !selectedDept || !selectedGroup) {
      toast.error("Bütün sahələri doldurun.");
      return;
    }
    if (!user) return;
    setLoading(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: fullName.trim(),
        department_id: selectedDept,
        group_id: selectedGroup,
        onboarding_complete: true,
      } as any)
      .eq("user_id", user.id);

    if (error) {
      toast.error("Xəta baş verdi: " + error.message);
    } else {
      toast.success("Profil tamamlandı!");
      await refreshProfile();
      navigate("/");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl gradient-cherry shadow-cherry mb-4">
            <GraduationCap className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Profil Məlumatları</h1>
          <p className="text-sm text-muted-foreground mt-1">İmtahana başlamaq üçün məlumatlarınızı daxil edin</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 space-y-5">
          <div>
            <label className="text-sm font-medium text-foreground flex items-center gap-2 mb-1.5">
              <User className="h-4 w-4 text-primary" /> Ad və Soyad
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Məsələn: Əli Əliyev"
              className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-foreground flex items-center gap-2 mb-1.5">
              <GraduationCap className="h-4 w-4 text-primary" /> Fakültə
            </label>
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            >
              <option value="">Fakültə seçin...</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground flex items-center gap-2 mb-1.5">
              <Users className="h-4 w-4 text-primary" /> Qrup
            </label>
            <select
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
              disabled={!selectedDept || groups.length === 0}
              className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
            >
              <option value="">{!selectedDept ? "Əvvəlcə fakültə seçin" : groups.length === 0 ? "Bu fakültəyə qrup əlavə edilməyib" : "Qrup seçin..."}</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>

          <Button
            onClick={handleSubmit}
            disabled={loading || !fullName.trim() || !selectedDept || !selectedGroup}
            className="w-full h-12 gradient-cherry text-primary-foreground font-bold text-base rounded-xl shadow-lg"
          >
            {loading ? "Saxlanılır..." : "Davam Et"}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
