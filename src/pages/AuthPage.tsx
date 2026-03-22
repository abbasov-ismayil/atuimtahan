import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { LogIn, User, Lock } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

const SUPER_ADMIN_EMAIL = "atuimtahanportali@atu.edu.az";
const SUPER_ADMIN_PASS = "Atu.1918";

export default function AuthPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { user, isAdmin, profile, loading: authLoading } = useAuth();

  useEffect(() => {
    if (authLoading || !user) return;
    if (isAdmin) {
      navigate("/admin", { replace: true });
    } else if (profile && !profile.onboarding_complete) {
      navigate("/onboarding", { replace: true });
    } else {
      navigate("/", { replace: true });
    }
  }, [user, isAdmin, profile, authLoading, navigate]);

  const resolveEmail = (uname: string): string => {
    const trimmed = uname.trim();
    if (trimmed.includes("@")) return trimmed;
    return `${trimmed.replace(/[^a-zA-Z0-9._-]/g, "_")}@atu.student`;
  };

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      toast.error("İstifadəçi adı və şifrəni daxil edin.");
      return;
    }
    setLoading(true);

    const email = resolveEmail(username);

    let { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      if (
      username.trim() === SUPER_ADMIN_EMAIL &&
      password === SUPER_ADMIN_PASS)
      {
        const { error: signUpErr } = await supabase.auth.signUp({
          email: SUPER_ADMIN_EMAIL,
          password: SUPER_ADMIN_PASS,
          options: { data: { full_name: "Super Admin", is_super_admin: true } }
        });
        if (!signUpErr) {
          const result = await supabase.auth.signInWithPassword({
            email: SUPER_ADMIN_EMAIL,
            password: SUPER_ADMIN_PASS
          });
          if (result.error) {
            toast.error("Giriş alınmadı: " + result.error.message);
          } else {
            toast.success("Xoş gəldiniz, Super Admin!");
          }
        } else {
          toast.error("Hesab yaradıla bilmədi: " + signUpErr.message);
        }
      } else {
        toast.error("İstifadəçi adı və ya şifrə yanlışdır.");
      }
    } else {
      toast.success("Xoş gəldiniz!");
    }

    setLoading(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleLogin();
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-background p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md">
        
        {/* Back button */}
        

        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <img
              alt="ATU Logo"
              className="h-16 w-auto"
              width="149"
              height="64"
              fetchPriority="high"
              src="/lovable-uploads/35eed5b3-f8df-4081-bc8e-74148a04d10b.png" />
            
          </div>
          <h1 className="text-2xl font-bold text-foreground">
            ATU İmtahan Portalı
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Hesabınıza daxil olun
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 space-y-5">
          <div>
            <label className="text-sm font-medium text-foreground flex items-center gap-2 mb-1.5">
              <User className="h-4 w-4 text-primary" /> İstifadəçi adı
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="İstifadəçi adınızı daxil edin"
              className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              autoComplete="username" />
            
          </div>

          <div>
            <label className="text-sm font-medium text-foreground flex items-center gap-2 mb-1.5">
              <Lock className="h-4 w-4 text-primary" /> Şifrə
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Şifrənizi daxil edin"
              className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              autoComplete="current-password" />
            
          </div>

          <Button
            onClick={handleLogin}
            disabled={loading}
            className="w-full h-12 gradient-cherry text-primary-foreground font-bold text-base rounded-xl shadow-lg">
            
            {loading ?
            "Yüklənir..." :

            <>
                <LogIn className="h-4 w-4 mr-2" /> Daxil Ol
              </>
            }
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            Giriş məlumatlarınız Administrasiya tərəfindən təmin edilir.
          </p>
        </div>
      </motion.div>
    </main>);

}
