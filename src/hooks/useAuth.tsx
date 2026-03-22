import { useState, useEffect, createContext, useContext, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

interface ProfileData {
  full_name: string;
  department_id: string | null;
  group_id: string | null;
  onboarding_complete: boolean;
  username: string | null;
}

interface AuthContext {
  user: User | null;
  session: Session | null;
  fullName: string;
  loading: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  profile: ProfileData | null;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthCtx = createContext<AuthContext>({
  user: null,
  session: null,
  fullName: "",
  loading: true,
  isAdmin: false,
  isSuperAdmin: false,
  profile: null,
  signOut: async () => {},
  refreshProfile: async () => {},
});

const SUPER_ADMIN_EMAIL = "atuimtahanportali@atu.edu.az";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [profile, setProfile] = useState<ProfileData | null>(null);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (currentUser) {
        setTimeout(() => fetchProfile(currentUser.id, currentUser.email), 0);
      } else {
        setFullName("");
        setIsAdmin(false);
        setIsSuperAdmin(false);
        setProfile(null);
      }
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) fetchProfile(currentUser.id, currentUser.email);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string, email?: string) => {
    const isSuperAdminUser = email === SUPER_ADMIN_EMAIL;
    setIsSuperAdmin(isSuperAdminUser);

    // Super Admin bypass
    if (isSuperAdminUser) {
      setIsAdmin(true);
      setFullName("Super Admin");
      setProfile({
        full_name: "Super Admin",
        department_id: null,
        group_id: null,
        onboarding_complete: true,
        username: SUPER_ADMIN_EMAIL,
      });
      return;
    }

    // Fetch profile data
    const { data } = await supabase
      .from("profiles")
      .select("full_name, department_id, group_id, onboarding_complete, username")
      .eq("user_id", userId)
      .maybeSingle();

    if (data) {
      setFullName((data as any).full_name || "");
      setProfile({
        full_name: (data as any).full_name || "",
        department_id: (data as any).department_id || null,
        group_id: (data as any).group_id || null,
        onboarding_complete: (data as any).onboarding_complete || false,
        username: (data as any).username || null,
      });
    } else {
      // Profile doesn't exist — create one (upsert to prevent ghost users)
      const { data: newProfile } = await supabase
        .from("profiles")
        .upsert({ user_id: userId, full_name: "", onboarding_complete: false } as any, { onConflict: "user_id" })
        .select("full_name, department_id, group_id, onboarding_complete, username")
        .maybeSingle();

      if (newProfile) {
        setFullName("");
        setProfile({
          full_name: "",
          department_id: null,
          group_id: null,
          onboarding_complete: false,
          username: (newProfile as any).username || null,
        });
      } else {
        setProfile({ full_name: "", department_id: null, group_id: null, onboarding_complete: false, username: null });
      }
    }

    // Check admin status via RPC
    const { data: adminData } = await supabase.rpc('check_is_admin' as any);
    setIsAdmin(adminData === true);
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id, user.email);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthCtx.Provider value={{ user, session, fullName, loading, isAdmin, isSuperAdmin, profile, signOut, refreshProfile }}>
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);
