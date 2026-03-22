import { Mail, MapPin, Phone } from "lucide-react";
import atuLogo from "@/assets/atu-logo.png";

export default function Footer() {
  return (
    <footer>
      {/* Main footer - cherry colored */}
      <div className="bg-primary text-primary-foreground">
        <div className="container py-10">
          <div className="grid gap-8 md:grid-cols-3">
            {/* Logo + Name */}
            <div className="flex items-center gap-4">
              <img alt="ATU Logo" className="h-20 w-auto brightness-0 invert" src="/lovable-uploads/ec04983e-e051-4cd3-9a21-fe7c3cf58971.png" />
              <div>
                
                <p className="text-lg font-bold leading-tight">​</p>
                <p className="text-lg font-bold leading-tight">​</p>
              </div>
            </div>

            {/* Social + Address */}
            <div className="flex flex-col items-center justify-center gap-3 text-sm text-primary-foreground/80">
              <div className="flex gap-3">
                <a href="https://www.facebook.com/aikiaz" target="_blank" rel="noopener noreferrer" className="h-9 w-9 flex items-center justify-center rounded border border-primary-foreground/30 hover:bg-primary-foreground/10 transition-colors">
                  <span className="font-bold text-sm">f</span>
                </a>
                <a href="https://www.instagram.com/atu_az/" target="_blank" rel="noopener noreferrer" className="h-9 w-9 flex items-center justify-center rounded border border-primary-foreground/30 hover:bg-primary-foreground/10 transition-colors">
                  <span className="font-bold text-sm">in</span>
                </a>
                <a href="https://www.youtube.com/@ATU_AZ" target="_blank" rel="noopener noreferrer" className="h-9 w-9 flex items-center justify-center rounded border border-primary-foreground/30 hover:bg-primary-foreground/10 transition-colors">
                  <span className="font-bold text-sm">▶</span>
                </a>
                <a href="https://www.linkedin.com/school/atu-az/" target="_blank" rel="noopener noreferrer" className="h-9 w-9 flex items-center justify-center rounded border border-primary-foreground/30 hover:bg-primary-foreground/10 transition-colors">
                  <span className="font-bold text-sm">in</span>
                </a>
              </div>
              <p className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4 shrink-0" />
                Gəncə ş. AZ2011 Şah İsmayıl Xətai prospekti 103
              </p>
            </div>

            {/* Contact */}
            <div className="flex flex-col gap-3 text-sm text-primary-foreground/80 md:items-end">
              <a href="mailto:info@atu.edu.az" className="flex items-center gap-2 hover:text-primary-foreground transition-colors">
                <Mail className="h-4 w-4" /> info@atu.edu.az
              </a>
              <a href="https://www.atu.edu.az" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-primary-foreground transition-colors">
                <MapPin className="h-4 w-4" /> www.atu.edu.az
              </a>
              <a href="tel:+994222680881" className="flex items-center gap-2 hover:text-primary-foreground transition-colors">
                <Phone className="h-4 w-4" /> (+994 22) 268-08-81
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="bg-foreground text-background py-3">
        <div className="container text-center text-sm">
          Bütün hüquqlar qorunur © {new Date().getFullYear()} ATU
        </div>
      </div>
    </footer>);

}