'use client';

import { useState, useEffect, useRef } from 'react';
import { Bus, Menu, X, ChevronDown, LayoutDashboard, LogIn, ScanLine, Store, Monitor } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/stores/auth-store';
import { LoginDialog } from '@/components/portal/login-dialog';

const NAV_LINKS = [
  { label: 'Accueil', href: '#accueil' },
  { label: 'Horaires', href: '#horaires' },
  { label: 'Lignes', href: '#lignes' },
  { label: 'Démo Affichage', href: '#demo-affichage' },
  { label: 'À Propos', href: '#a-propos' },
  { label: 'Contact', href: '#contact' },
];

interface StaffLink {
  label: string;
  icon: React.ReactNode;
  description: string;
  viewId: string;
}

const STAFF_LINKS: StaffLink[] = [
  { label: 'Contrôleur', icon: <ScanLine className="h-4 w-4" />, description: 'Scanner et valider les tickets', viewId: 'scan-qr' },
  { label: 'Guichet', icon: <Store className="h-4 w-4" />, description: 'Vendre des billets', viewId: 'sell-ticket' },
  { label: 'Administration', icon: <LayoutDashboard className="h-4 w-4" />, description: 'Gérer le réseau', viewId: 'dashboard' },
];

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [staffDropdownOpen, setStaffDropdownOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setStaffDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  const scrollToSection = (href: string) => {
    setMobileOpen(false);
    const el = document.querySelector(href);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'bg-white/95 backdrop-blur-lg border-b shadow-sm'
            : 'bg-white/80 backdrop-blur-md'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 lg:h-18">
            {/* Logo */}
            <a
              href="#accueil"
              onClick={(e) => { e.preventDefault(); scrollToSection('#accueil'); }}
              className="flex items-center gap-2.5"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 to-orange-500 text-white shadow-md">
                <Bus className="h-5 w-5" />
              </div>
              <span className="text-lg font-bold tracking-tight text-slate-900">
                SmartTicket<span className="text-rose-500">QR</span>
              </span>
            </a>

            {/* Desktop Nav */}
            <nav className="hidden lg:flex items-center gap-1">
              {NAV_LINKS.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={(e) => { e.preventDefault(); scrollToSection(link.href); }}
                  className="relative px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  {link.label}
                </a>
              ))}
            </nav>

            {/* Desktop Right */}
            <div className="hidden lg:flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => { window.location.href = '/?display=peters&mode=demo'; }}
                className="border-emerald-300 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-400 gap-1.5"
              >
                <Monitor className="h-4 w-4" />
                Démo Affichage
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => scrollToSection('#horaires')}
                className="border-slate-300 text-slate-700 hover:bg-slate-50"
              >
                Espace Voyageur
              </Button>

              {isAuthenticated ? (
                <Button
                  size="sm"
                  onClick={() => scrollToSection('#horaires')}
                  className="bg-gradient-to-r from-rose-500 to-orange-500 hover:from-rose-600 hover:to-orange-600 text-white shadow-md"
                >
                  <LayoutDashboard className="h-4 w-4 mr-1.5" />
                  Tableau de Bord
                </Button>
              ) : (
                <div className="relative" ref={dropdownRef}>
                  <Button
                    size="sm"
                    onClick={() => setStaffDropdownOpen(!staffDropdownOpen)}
                    className="bg-gradient-to-r from-rose-500 to-orange-500 hover:from-rose-600 hover:to-orange-600 text-white shadow-md"
                  >
                    <LogIn className="h-4 w-4 mr-1.5" />
                    Connexion
                    <ChevronDown className={`ml-1.5 h-3.5 w-3.5 transition-transform ${staffDropdownOpen ? 'rotate-180' : ''}`} />
                  </Button>

                  <AnimatePresence>
                    {staffDropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.96 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 mt-2 w-64 rounded-xl border bg-white shadow-xl p-2"
                      >
                        {STAFF_LINKS.map((item) => (
                          <button
                            key={item.viewId}
                            onClick={() => { setStaffDropdownOpen(false); setLoginOpen(true); }}
                            className="flex items-center gap-3 w-full rounded-lg px-3 py-2.5 text-left hover:bg-slate-50 transition-colors"
                          >
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-50 text-rose-500 shrink-0">
                              {item.icon}
                            </div>
                            <div className="min-w-0">
                              <div className="text-sm font-medium text-slate-900">{item.label}</div>
                              <div className="text-xs text-slate-500">{item.description}</div>
                            </div>
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>

            {/* Mobile Hamburger */}
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden flex items-center justify-center h-10 w-10 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors"
              aria-label="Ouvrir le menu"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Full-screen Overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[60] bg-white"
          >
            <div className="flex flex-col h-full">
              <div className="flex items-center justify-between h-16 px-4 sm:px-6 border-b">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 to-orange-500 text-white">
                    <Bus className="h-5 w-5" />
                  </div>
                  <span className="text-lg font-bold tracking-tight text-slate-900">
                    SmartTicket<span className="text-rose-500">QR</span>
                  </span>
                </div>
                <button onClick={() => setMobileOpen(false)} className="h-10 w-10 flex items-center justify-center rounded-lg text-slate-700 hover:bg-slate-50" aria-label="Fermer">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <nav className="flex-1 flex flex-col justify-center px-6">
                <div className="space-y-2">
                  {NAV_LINKS.map((link, i) => (
                    <motion.a
                      key={link.href}
                      href={link.href}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.05 * i }}
                      onClick={(e) => { e.preventDefault(); scrollToSection(link.href); }}
                      className="flex items-center text-2xl font-semibold text-slate-900 py-3 hover:text-rose-500 transition-colors"
                    >
                      {link.label}
                    </motion.a>
                  ))}
                </div>

                <div className="mt-10 pt-8 border-t">
                  <p className="text-sm font-medium text-slate-400 mb-4 uppercase tracking-wider">Accès Professionnel</p>
                  <div className="space-y-2">
                    {STAFF_LINKS.map((item, i) => (
                      <motion.button
                        key={item.viewId}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.25 + 0.05 * i }}
                        onClick={() => { setMobileOpen(false); setLoginOpen(true); }}
                        className="flex items-center gap-3 w-full rounded-xl px-4 py-3 text-left hover:bg-slate-50 transition-colors"
                      >
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-rose-50 text-rose-500 shrink-0">{item.icon}</div>
                        <div>
                          <div className="text-sm font-medium text-slate-900">{item.label}</div>
                          <div className="text-xs text-slate-500">{item.description}</div>
                        </div>
                      </motion.button>
                    ))}
                  </div>
                </div>
              </nav>

              <div className="px-6 pb-8 pt-4 border-t space-y-3">
                <Button
                  className="w-full h-12 text-base bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold gap-2"
                  onClick={() => { setMobileOpen(false); window.location.href = '/?display=peters&mode=demo'; }}
                >
                  <Monitor className="h-5 w-5" />
                  Lancer la Démo Affichage
                </Button>
                <Button variant="outline" className="w-full h-12 text-base border-slate-300" onClick={() => { setMobileOpen(false); scrollToSection('#horaires'); }}>
                  Espace Voyageur
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <LoginDialog open={loginOpen} onOpenChange={setLoginOpen} />
    </>
  );
}
