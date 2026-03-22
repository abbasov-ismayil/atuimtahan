import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ClipboardCheck,
  Shuffle,
  Ticket,
  Calculator,
  BookOpen,
  Play,
  BarChart3,
  Sparkles,
} from "lucide-react";

const features = [
  {
    icon: ClipboardCheck,
    title: "Özünü İmtahan Et",
    desc: "Qrupunuza təyin edilmiş test sualları ilə imtahan simulyasiyası keçir",
    path: "/exam",
    delay: 0.1,
  },
  {
    icon: Shuffle,
    title: "Sualları Qarışdır",
    desc: "Sualları və variantları qarışdır, cavab açarı yarat",
    path: "/shuffle",
    delay: 0.2,
  },
  {
    icon: Ticket,
    title: "Bilet İmtahanı",
    desc: "Açıq suallardan təsadüfi bilet çək və AI izahı al",
    path: "/ticket",
    delay: 0.3,
  },
  {
    icon: Calculator,
    title: "Bal Hesabla",
    desc: "Məşğələ və ya laboratoriya fənni üzrə bal hesabla",
    path: "/score",
    delay: 0.4,
  },
];

const steps = [
  {
    icon: ClipboardCheck,
    title: "1. İmtahan Seç",
    desc: "Admin tərəfindən qrupunuza təyin edilmiş imtahanı seçin.",
  },
  {
    icon: Play,
    title: "2. İmtahana Başla",
    desc: "İmtahan rejimini seçin və vaxtla yarışın.",
  },
  {
    icon: BarChart3,
    title: "3. Nəticələrə Bax",
    desc: "Düzgün, səhv və boş sualları analiz edin.",
  },
  {
    icon: Sparkles,
    title: "4. AI Dəstəyi Al",
    desc: "Bilet imtahanında süni intellekt suallarınıza izah hazırlayır.",
  },
];

export default function Index() {
  return (
    <div className="container py-16 md:py-24">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="mx-auto max-w-2xl text-center mb-16"
      >
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-muted px-4 py-1.5 text-xs font-medium text-muted-foreground mb-6">
          <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
          Azərbaycan Texnologiya Universiteti
        </div>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground mb-4">
          İmtahan Hazırlıq{" "}
          <span className="text-primary">Portalı</span>
        </h1>
        <p className="text-lg text-muted-foreground leading-relaxed">
          Qrupunuza təyin edilmiş imtahanları həll edin, nəticələrinizi izləyin
          və AI dəstəyi ilə hazırlaşın.
        </p>
      </motion.div>

      {/* Cards - rectangular, symmetric */}
      <div className="mx-auto max-w-4xl grid gap-4 sm:grid-cols-2">
        {features.map((f) => (
          <motion.div
            key={f.path}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: f.delay, duration: 0.5 }}
          >
            <Link
              to={f.path}
              className="group flex items-center gap-5 rounded-2xl border border-border bg-card p-6 h-32 transition-all hover:shadow-cherry hover:border-primary/30 hover:-translate-y-1"
            >
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl gradient-cherry shadow-cherry">
                <f.icon className="h-7 w-7 text-primary-foreground" />
              </div>
              <div className="min-w-0">
                <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
                  {f.title}
                </h3>
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{f.desc}</p>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>

      {/* How to use section */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.6 }}
        className="mx-auto max-w-4xl mt-20"
      >
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-accent px-4 py-1.5 text-xs font-medium text-primary mb-4">
            <BookOpen className="h-3.5 w-3.5" />
            Bələdçi
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-foreground">
            Sistemdən necə istifadə etməli?
          </h2>
          <p className="text-muted-foreground mt-2">Sadə 4 addımda imtahana hazırlaş</p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 + i * 0.1, duration: 0.4 }}
              className="rounded-2xl border border-border bg-card p-6 text-center"
            >
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-accent text-primary mb-4">
                <s.icon className="h-6 w-6" />
              </div>
              <h3 className="text-sm font-bold text-foreground mb-2">{s.title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{s.desc}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
