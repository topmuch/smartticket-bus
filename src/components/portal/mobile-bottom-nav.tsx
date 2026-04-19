'use client';

import { useEffect, useRef, useState } from 'react';
import { Home, Bus, MapPin, Clock, Ticket, Route, type LucideIcon } from 'lucide-react';

interface NavLink {
  label: string;
  href: string;
  icon: LucideIcon;
}

const NAV_LINKS: NavLink[] = [
  { label: 'Accueil', href: '#accueil', icon: Home },
  { label: 'Itinéraire', href: '#itineraire', icon: Route },
  { label: 'Lignes', href: '#lignes', icon: Bus },
  { label: 'Arrêts', href: '#arrets', icon: MapPin },
  { label: 'Horaires', href: '#horaires', icon: Clock },
  { label: 'Tarifs', href: '#tarifs', icon: Ticket },
];

export function MobileBottomNav() {
  const [activeId, setActiveId] = useState<string>('#accueil');
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    // Cleanup previous observer
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    const sections = NAV_LINKS.map((link) =>
      document.querySelector(link.href)
    ).filter(Boolean);

    observerRef.current = new IntersectionObserver(
      (entries) => {
        // Find the topmost visible section
        const visibleEntries = entries.filter(
          (entry) => entry.isIntersecting
        );

        if (visibleEntries.length > 0) {
          // Sort by intersection ratio descending, then by top position ascending
          visibleEntries.sort((a, b) => {
            if (b.intersectionRatio !== a.intersectionRatio) {
              return b.intersectionRatio - a.intersectionRatio;
            }
            return a.boundingClientRect.top - b.boundingClientRect.top;
          });
          const topEntry = visibleEntries[0];
          setActiveId(`#${topEntry.target.id}`);
        }
      },
      {
        rootMargin: '-20% 0px -60% 0px',
        threshold: [0, 0.25, 0.5, 0.75, 1],
      }
    );

    sections.forEach((section) => {
      if (section && observerRef.current) {
        observerRef.current.observe(section);
      }
    });

    return () => {
      observerRef.current?.disconnect();
    };
  }, []);

  const handleNavClick = (href: string) => {
    const el = document.querySelector(href);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
      setActiveId(href);
    }
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/40 bg-background/80 backdrop-blur-lg supports-[backdrop-filter]:bg-background/60 md:hidden"
      role="navigation"
      aria-label="Navigation mobile"
    >
      <div className="mx-auto flex max-w-lg items-stretch justify-around px-1 pb-[env(safe-area-inset-bottom)]">
        {NAV_LINKS.map((link) => {
          const isActive = activeId === link.href;
          const Icon = link.icon;

          return (
            <button
              key={link.href}
              onClick={() => handleNavClick(link.href)}
              className={`group relative flex flex-1 flex-col items-center gap-0.5 py-2 transition-colors ${
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground active:text-foreground'
              }`}
              aria-current={isActive ? 'page' : undefined}
            >
              {/* Active indicator line */}
              <span
                className={`absolute left-1/2 top-0 h-0.5 w-8 -translate-x-1/2 rounded-full bg-primary transition-all duration-300 ${
                  isActive
                    ? 'scale-x-100 opacity-100'
                    : 'scale-x-0 opacity-0'
                }`}
              />

              <Icon className="h-5 w-5 shrink-0 transition-transform duration-200 group-active:scale-90" />
              <span className="text-[11px] font-medium leading-none">
                {link.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
