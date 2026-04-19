'use client';

import { motion } from 'framer-motion';
import { Bus, MapPin, Phone, Mail, Facebook, Twitter, Instagram, ExternalLink } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

const NAV_LINKS = [
  { label: 'Accueil', href: '#accueil' },
  { label: 'Horaires', href: '#horaires' },
  { label: 'Lignes', href: '#lignes' },
  { label: 'Gares', href: '#gares' },
  { label: 'Contact', href: '#contact' },
];

const LEGAL_LINKS = [
  { label: 'Mentions légales', href: '#' },
  { label: 'FAQ', href: '#' },
  { label: 'Contact', href: '#contact' },
  { label: 'Trouver une gare', href: '#gares' },
];

const SOCIAL_LINKS = [
  { icon: <Facebook className="h-5 w-5" />, label: 'Facebook', href: '#' },
  { icon: <Twitter className="h-5 w-5" />, label: 'Twitter', href: '#' },
  { icon: <Instagram className="h-5 w-5" />, label: 'Instagram', href: '#' },
];

export function Footer() {
  const scrollToSection = (href: string) => {
    if (href.startsWith('#')) {
      const el = document.querySelector(href);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <footer id="contact" className="bg-slate-100 border-t border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 lg:py-18">
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10 lg:gap-14"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.5 }}
        >
          {/* Column 1: Brand */}
          <div>
            <div className="flex items-center gap-2.5 mb-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 to-orange-500 text-white shadow-md">
                <Bus className="h-5 w-5" />
              </div>
              <span className="text-lg font-bold tracking-tight text-slate-900">
                SmartTicket<span className="text-rose-500">QR</span>
              </span>
            </div>
            <p className="text-sm text-slate-500 leading-relaxed mb-6 max-w-xs">
              Système de billetterie intelligent pour le transport en commun au Sénégal. Voyagez en toute simplicité.
            </p>
            <div className="flex items-center gap-3">
              {SOCIAL_LINKS.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  aria-label={social.label}
                  className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-slate-400 hover:text-rose-500 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 transition-all duration-200 shadow-sm"
                >
                  {social.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Column 2: Contact */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-900 mb-5">
              Contactez-nous
            </h3>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-rose-50 text-rose-500 shrink-0 mt-0.5">
                  <Phone className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900">+221 33 800 00 00</p>
                  <p className="text-xs text-slate-400">Lun-Dim, 6h-22h</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-rose-50 text-rose-500 shrink-0 mt-0.5">
                  <Mail className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900">info@smartticketqr.com</p>
                  <p className="text-xs text-slate-400">Réponse sous 24h</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-rose-50 text-rose-500 shrink-0 mt-0.5">
                  <MapPin className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900">Gare Centrale, Dakar</p>
                  <p className="text-xs text-slate-400">Sénégal</p>
                </div>
              </li>
            </ul>
          </div>

          {/* Column 3: Legal */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-900 mb-5">
              Liens Utiles
            </h3>
            <ul className="space-y-3">
              {LEGAL_LINKS.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    onClick={(e) => {
                      if (link.href.startsWith('#')) {
                        e.preventDefault();
                        scrollToSection(link.href);
                      }
                    }}
                    className="flex items-center gap-2 text-sm text-slate-500 hover:text-rose-500 transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </motion.div>

        {/* Bottom Bar */}
        <Separator className="bg-slate-200 my-10" />
        <motion.div
          className="flex flex-col sm:flex-row items-center justify-between gap-4"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <p className="text-xs text-slate-400">
            &copy; {new Date().getFullYear()} SmartTicketQR — Tous droits réservés
          </p>
          <div className="flex items-center gap-4">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={(e) => { e.preventDefault(); scrollToSection(link.href); }}
                className="text-xs text-slate-400 hover:text-rose-500 transition-colors"
              >
                {link.label}
              </a>
            ))}
          </div>
        </motion.div>
      </div>
    </footer>
  );
}
