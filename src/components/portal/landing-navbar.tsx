'use client';

import { useState, useEffect, useRef } from 'react';
import { Bus, Menu, X, ChevronDown, ScanLine, LayoutDashboard, Store, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/stores/auth-store';
import { LoginDialog } from './login-dialog';

const NAV_LINKS = [
  { label: 'Accueil', href: '#accueil' },
  { label: 'Horaires & Lignes', href: '#horaires' },
  { label: 'Tarifs & Zones', href: '#tarifs' },
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

export function LandingNavbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [staffDropdownOpen, setStaffDropdownOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setStaffDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  const scrollToSection = (href: string) => {
    setMobileOpen(false);
    const el = document.querySelector(href);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const textColor = scrolled ? 'text-foreground' : 'text-white';
  const logoColor = scrolled ? 'text-primary' : 'text-white';

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'bg-background/95 backdrop-blur-lg border-b shadow-sm'
            : 'bg-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <a
              href="#accueil"
              onClick={(e) => {
                e.preventDefault();
                scrollToSection('#accueil');
              }}
              className="flex items-center gap-2.5"
            >
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-xl transition-colors duration-300 ${
                  scrolled ? 'bg-primary text-primary-foreground' : 'bg-white/20 text-white backdrop-blur-sm'
                }`}
              >
                <Bus className="h-5 w-5" />
              </div>
              <span
                className={`text-lg font-bold tracking-tight transition-colors duration-300 ${logoColor}`}
              >
                SmartTicket Bus
              </span>
            </a>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-1">
              {NAV_LINKS.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={(e) => {
                    e.preventDefault();
                    scrollToSection(link.href);
                  }}
                  className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors hover:bg-white/10 ${
                    scrolled
                      ? 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                      : 'text-white/80 hover:text-white'
                  }`}
                >
                  {link.label}
                </a>
              ))}
            </nav>

            {/* Desktop Right Buttons */}
            <div className="hidden md:flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => scrollToSection('#horaires')}
                className={`transition-colors ${
                  scrolled
                    ? 'border-border text-foreground hover:bg-muted/50'
                    : 'border-white/30 text-white hover:bg-white/10 hover:text-white'
                }`}
              >
                Espace Voyageur
              </Button>

              {isAuthenticated ? (
                <Button
                  size="sm"
                  onClick={() => scrollToSection('#horaires')}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <LayoutDashboard className="h-4 w-4 mr-1.5" />
                  Tableau de Bord
                </Button>
              ) : (
                <div className="relative" ref={dropdownRef}>
                  <Button
                    size="sm"
                    onClick={() => setStaffDropdownOpen(!staffDropdownOpen)}
                    className={`transition-colors ${
                      scrolled
                        ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                        : 'bg-white/20 text-white hover:bg-white/30 backdrop-blur-sm'
                    }`}
                  >
                    <LogIn className="h-4 w-4 mr-1.5" />
                    Connexion Staff
                    <ChevronDown
                      className={`ml-1.5 h-3.5 w-3.5 transition-transform ${
                        staffDropdownOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </Button>

                  <AnimatePresence>
                    {staffDropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.96 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 mt-2 w-64 rounded-xl border bg-background shadow-xl p-2"
                      >
                        {STAFF_LINKS.map((item) => (
                          <button
                            key={item.viewId}
                            onClick={() => {
                              setStaffDropdownOpen(false);
                              setLoginOpen(true);
                            }}
                            className="flex items-center gap-3 w-full rounded-lg px-3 py-2.5 text-left hover:bg-muted/80 transition-colors"
                          >
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                              {item.icon}
                            </div>
                            <div className="min-w-0">
                              <div className="text-sm font-medium text-foreground">
                                {item.label}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {item.description}
                              </div>
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
              className={`md:hidden flex items-center justify-center h-10 w-10 rounded-lg transition-colors ${
                scrolled
                  ? 'text-foreground hover:bg-muted/50'
                  : 'text-white hover:bg-white/10'
              }`}
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
            className="fixed inset-0 z-[60] bg-background"
          >
            <div className="flex flex-col h-full">
              {/* Mobile Header */}
              <div className="flex items-center justify-between h-16 px-4 sm:px-6 border-b">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                    <Bus className="h-5 w-5" />
                  </div>
                  <span className="text-lg font-bold tracking-tight text-foreground">
                    SmartTicket Bus
                  </span>
                </div>
                <button
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center justify-center h-10 w-10 rounded-lg text-foreground hover:bg-muted/50 transition-colors"
                  aria-label="Fermer le menu"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Mobile Nav Links */}
              <nav className="flex-1 flex flex-col justify-center px-6">
                <div className="space-y-2">
                  {NAV_LINKS.map((link, i) => (
                    <motion.a
                      key={link.href}
                      href={link.href}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.05 * i }}
                      onClick={(e) => {
                        e.preventDefault();
                        scrollToSection(link.href);
                      }}
                      className="flex items-center text-2xl font-semibold text-foreground py-3 hover:text-primary transition-colors"
                    >
                      {link.label}
                    </motion.a>
                  ))}
                </div>

                {/* Mobile Staff Section */}
                <div className="mt-10 pt-8 border-t">
                  <p className="text-sm font-medium text-muted-foreground mb-4 uppercase tracking-wider">
                    Accès Professionnel
                  </p>
                  <div className="space-y-2">
                    {STAFF_LINKS.map((item, i) => (
                      <motion.button
                        key={item.viewId}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.25 + 0.05 * i }}
                        onClick={() => {
                          setMobileOpen(false);
                          setLoginOpen(true);
                        }}
                        className="flex items-center gap-3 w-full rounded-xl px-4 py-3 text-left hover:bg-muted/80 transition-colors"
                      >
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                          {item.icon}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-foreground">
                            {item.label}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {item.description}
                          </div>
                        </div>
                      </motion.button>
                    ))}
                  </div>
                </div>
              </nav>

              {/* Mobile Footer Actions */}
              <div className="px-6 pb-8 pt-4 border-t space-y-3">
                <Button
                  variant="outline"
                  className="w-full h-12 text-base"
                  onClick={() => {
                    setMobileOpen(false);
                    scrollToSection('#horaires');
                  }}
                >
                  Espace Voyageur
                </Button>
                {isAuthenticated && (
                  <Button
                    className="w-full h-12 text-base bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={() => {
                      setMobileOpen(false);
                      scrollToSection('#horaires');
                    }}
                  >
                    <LayoutDashboard className="h-4 w-4 mr-2" />
                    Tableau de Bord
                  </Button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Login Dialog */}
      <LoginDialog open={loginOpen} onOpenChange={setLoginOpen} />
    </>
  );
}
