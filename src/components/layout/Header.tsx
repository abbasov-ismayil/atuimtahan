import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Menu, X, LogOut, User, Sun, Moon, Shield, MessageSquare } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/components/ThemeProvider";

const navItems = [
{ path: "/", label: "Ana Səhifə" },
{ path: "/exam", label: "İmtahan" },
{ path: "/shuffle", label: "Qarışdır" },
{ path: "/ticket", label: "Bilet" },
{ path: "/score", label: "Bal Hesabla" }];


export default function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const { user, fullName, isAdmin, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const displayName = fullName || user?.email?.split("@")[0] || "";

  return (
    <header className="sticky top-0 z-50 border-b border-primary/20 bg-primary/95 backdrop-blur supports-[backdrop-filter]:bg-primary/90">
      <div className="container flex h-[80px] items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
          <img
            alt="ATU Logo"
            className="h-16 w-auto brightness-0 invert"
            src="/lovable-uploads/282e27e1-93d5-4a97-87d3-051ba51c41cd.png" />
          
          <div className="hidden sm:block">
            <p className="text-sm font-bold text-primary-foreground leading-tight">​ </p>
            <p className="text-xs text-primary-foreground/70 leading-tight">​</p>
          </div>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden lg:flex items-center gap-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link key={item.path} to={item.path}
              className={`relative px-3.5 py-2 text-sm font-medium rounded-lg transition-colors ${
              isActive ? "text-primary-foreground bg-primary-foreground/20" : "text-primary-foreground/70 hover:text-primary-foreground"}`
              }>
                {item.label}
                {isActive &&
                <motion.div layoutId="activeNav" className="absolute inset-0 rounded-lg bg-primary-foreground/15"
                style={{ zIndex: -1 }} transition={{ type: "spring", bounce: 0.2, duration: 0.5 }} />
                }
              </Link>);

          })}

          {user && !isAdmin &&
          <Link to="/my-exams"
          className={`relative px-3.5 py-2 text-sm font-medium rounded-lg transition-colors ${
          location.pathname === "/my-exams" ? "text-primary-foreground bg-primary-foreground/20" : "text-primary-foreground/70 hover:text-primary-foreground"}`
          }>
              <MessageSquare className="h-4 w-4 inline mr-1" />İmtahanlarım
            </Link>
          }

          {isAdmin &&
          <>
              <Link to="/admin"
            className={`relative px-3.5 py-2 text-sm font-medium rounded-lg transition-colors ${
            location.pathname === "/admin" ? "text-primary-foreground bg-primary-foreground/20" : "text-primary-foreground/70 hover:text-primary-foreground"}`
            }>
                <Shield className="h-4 w-4 inline mr-1" />Admin
              </Link>
            </>
          }

          <button onClick={toggleTheme}
          className="text-primary-foreground/70 hover:text-primary-foreground p-2 rounded-lg transition-colors"
          title="Tema dəyiş">
            {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          </button>

          {user ?
          <div className="flex items-center gap-2 ml-2 pl-2 border-l border-primary-foreground/20">
              <span className="text-sm text-primary-foreground font-medium">
                <User className="h-3.5 w-3.5 inline mr-1" />{displayName}
              </span>
              <button onClick={async () => {await signOut();navigate("/auth");}}
            className="text-primary-foreground/70 hover:text-primary-foreground p-1.5 rounded-lg transition-colors"
            title="Çıxış">
                <LogOut className="h-4 w-4" />
              </button>
            </div> :

          <Link to="/auth" className="ml-3 px-4 py-2 rounded-lg bg-primary-foreground text-primary text-sm font-medium hover:opacity-90 transition-opacity">
              Daxil Ol
            </Link>
          }
        </nav>

        {/* Mobile toggle */}
        <div className="flex lg:hidden items-center gap-2">
          <button onClick={toggleTheme} className="text-primary-foreground/70 hover:text-primary-foreground p-2">
            {theme === "light" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
          </button>
          <button className="p-2 text-primary-foreground" onClick={() => setOpen(!open)}>
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open &&
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
      className="lg:hidden border-t border-primary-foreground/10 bg-primary p-4">
          {navItems.map((item) =>
        <Link key={item.path} to={item.path} onClick={() => setOpen(false)}
        className={`block px-4 py-2.5 rounded-lg text-sm font-medium ${
        location.pathname === item.path ? "bg-primary-foreground/20 text-primary-foreground" : "text-primary-foreground/70"}`
        }>
              {item.label}
            </Link>
        )}
          {user && !isAdmin &&
        <Link to="/my-exams" onClick={() => setOpen(false)}
        className="block px-4 py-2.5 rounded-lg text-sm font-medium text-primary-foreground/70">
              İmtahanlarım
            </Link>
        }
          {isAdmin &&
        <Link to="/admin" onClick={() => setOpen(false)}
        className="block px-4 py-2.5 rounded-lg text-sm font-medium text-primary-foreground/70">
              <Shield className="h-4 w-4 inline mr-1" />Admin Panel
            </Link>
        }
          {user ?
        <div className="mt-2 pt-2 border-t border-primary-foreground/10">
              <p className="px-4 py-1 text-sm text-primary-foreground font-medium">{displayName}</p>
              <button onClick={async () => {await signOut();navigate("/auth");setOpen(false);}}
          className="block w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium text-primary-foreground/70">
                Çıxış
              </button>
            </div> :

        <Link to="/auth" onClick={() => setOpen(false)}
        className="block px-4 py-2.5 rounded-lg text-sm font-medium text-primary-foreground mt-2">
              Daxil Ol
            </Link>
        }
        </motion.div>
      }
    </header>);

}