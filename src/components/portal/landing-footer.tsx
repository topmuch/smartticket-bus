'use client';

import { motion } from 'framer-motion';
import { Bus, MapPin, Phone, Mail, Facebook, Twitter, Instagram } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

const NAV_LINKS = [
  { label: 'Accueil', href: '#accueil' },
  { label: 'Horaires & Lignes', href: '#horaires' },
  { label: 'Tarifs & Zones', href: '#tarifs' },
  { label: 'Contact', href: '#contact' },
];

const SOCIAL_LINKS = [
  { icon: <Facebook className="h-5 w-5" />, label: 'Facebook', href: '#' },
  { icon: <Twitter className="h-5 w-5" />, label: 'Twitter', href: '#' },
  { icon: <Instagram className="h-5 w-5" />, label: 'Instagram', href: '#' },
];

export function LandingFooter() {
  const scrollToSection = (href: string) => {
    const el = document.querySelector(href);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <footer className="bg-[#0F172A] text-white" id="contact">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10 lg:gap-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.5 }}
        >
          {/* Brand Column */}
          <div>
            <div className="flex items-center gap-2.5 mb-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-white">
                <Bus className="h-5 w-5" />
              </div>
              <span className="text-lg font-bold tracking-tight">SmartTicket Bus</span>
            </div>
            <p className="text-sm text-white/60 leading-relaxed mb-6 max-w-xs">
              Système de billetterie intelligent pour le transport en commun à Dakar, Sénégal.
            </p>
            <div className="flex items-center gap-3">
              {SOCIAL_LINKS.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  aria-label={social.label}
                  className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 text-white/70 hover:bg-white/20 hover:text-white transition-colors"
                >
                  {social.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Navigation Column */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-white/80 mb-4">
              Navigation
            </h3>
            <ul className="space-y-3">
              {NAV_LINKS.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    onClick={(e) => {
                      e.preventDefault();
                      scrollToSection(link.href);
                    }}
                    className="text-sm text-white/60 hover:text-white transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Column */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-white/80 mb-4">
              Contact
            </h3>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <MapPin className="h-4 w-4 text-white/50 mt-0.5 shrink-0" />
                <span className="text-sm text-white/60">Dakar, Sénégal</span>
              </li>
              <li className="flex items-start gap-3">
                <Phone className="h-4 w-4 text-white/50 mt-0.5 shrink-0" />
                <span className="text-sm text-white/60">+221 33 800 00 00</span>
              </li>
              <li className="flex items-start gap-3">
                <Mail className="h-4 w-4 text-white/50 mt-0.5 shrink-0" />
                <span className="text-sm text-white/60">contact@smartticket.sn</span>
              </li>
            </ul>
          </div>
        </motion.div>

        {/* Bottom Bar */}
        <Separator className="bg-white/10 my-10" />
        <motion.div
          className="flex flex-col sm:flex-row items-center justify-between gap-4"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <p className="text-xs text-white/40">
            © 2026 SmartTicket Bus — Tous droits réservés
          </p>
          <p className="text-xs text-white/40">
            Développé avec ❤️ à Dakar
          </p>
        </motion.div>
      </div>
    </footer>
  );
}
