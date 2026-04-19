'use client';

import { Bus, Phone, Mail, Globe, MapPin } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

const NAV_LINKS = [
  { label: 'Accueil', href: '#accueil' },
  { label: 'Itinéraire', href: '#itineraire' },
  { label: 'Lignes', href: '#lignes' },
  { label: 'Arrêts', href: '#arrets' },
  { label: 'Horaires', href: '#horaires' },
  { label: 'Tarifs', href: '#tarifs' },
];

export function PortalFooter() {
  const handleNavClick = (href: string) => {
    const el = document.querySelector(href);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <footer className="mt-auto border-t border-border/50 bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {/* Column 1: Brand */}
          <div>
            <div className="flex items-center gap-2.5 mb-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Bus className="h-5 w-5" />
              </div>
              <span className="text-lg font-bold text-foreground">
                SmartTicket Bus
              </span>
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Système de billetterie intelligent pour le transport en commun à
              Dakar. Facilitez vos trajets quotidiens avec une solution moderne
              et fiable.
            </p>
          </div>

          {/* Column 2: Navigation */}
          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-foreground">
              Navigation
            </h3>
            <nav className="flex flex-col gap-2">
              {NAV_LINKS.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={(e) => {
                    e.preventDefault();
                    handleNavClick(link.href);
                  }}
                  className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  {link.label}
                </a>
              ))}
            </nav>
          </div>

          {/* Column 3: Contact */}
          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-foreground">
              Contact
            </h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-2.5 text-sm text-muted-foreground">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span>Dakar, Sénégal</span>
              </li>
              <li className="flex items-center gap-2.5 text-sm text-muted-foreground">
                <Phone className="h-4 w-4 shrink-0 text-primary" />
                <span>+221 33 800 00 00</span>
              </li>
              <li className="flex items-center gap-2.5 text-sm text-muted-foreground">
                <Mail className="h-4 w-4 shrink-0 text-primary" />
                <span>contact@smartticket.sn</span>
              </li>
              <li className="flex items-center gap-2.5 text-sm text-muted-foreground">
                <Globe className="h-4 w-4 shrink-0 text-primary" />
                <span>www.smartticket.sn</span>
              </li>
            </ul>
          </div>
        </div>

        <Separator className="my-8" />

        {/* Copyright */}
        <div className="text-center text-sm text-muted-foreground">
          © 2026 SmartTicket Bus — Tous droits réservés
        </div>
      </div>
    </footer>
  );
}
