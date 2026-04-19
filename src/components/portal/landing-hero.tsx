'use client';

import { MapPin, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export function LandingHero() {
  const handleSearchClick = () => {
    const el = document.querySelector('#horaires-demo');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section
      id="accueil"
      className="relative min-h-[85vh] flex items-center justify-center overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #0F172A 0%, #1e293b 50%, #0F172A 100%)',
      }}
    >
      {/* Animated floating orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <motion.div
          className="absolute top-[15%] left-[10%] w-72 h-72 rounded-full bg-emerald-500/10 blur-[100px]"
          animate={{
            y: [0, 30, -20, 0],
            x: [0, -20, 10, 0],
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
        <motion.div
          className="absolute bottom-[20%] right-[15%] w-96 h-96 rounded-full bg-blue-500/8 blur-[120px]"
          animate={{
            y: [0, -25, 15, 0],
            x: [0, 15, -25, 0],
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
        <motion.div
          className="absolute top-[50%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full bg-emerald-400/5 blur-[80px]"
          animate={{
            y: [0, 20, -10, 0],
            scale: [1, 1.1, 0.95, 1],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      </div>

      {/* Grid pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
        aria-hidden="true"
      />

      {/* Content */}
      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-32 sm:py-40">
        <div className="text-center">
          {/* Title */}
          <motion.h1
            className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-tight tracking-tight"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
          >
            Voyagez Plus Simple
            <br />
            <span className="bg-gradient-to-r from-emerald-400 to-emerald-300 bg-clip-text text-transparent">
              avec SmartTicket.
            </span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            className="mt-6 text-lg sm:text-xl text-white/70 max-w-2xl mx-auto leading-relaxed"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2, ease: 'easeOut' }}
          >
            Le système de billetterie intelligent pour le transport en commun moderne.
          </motion.p>

          {/* Search Widget */}
          <motion.div
            className="mt-10"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.4, ease: 'easeOut' }}
          >
            <Card className="bg-white/95 backdrop-blur-xl border-white/20 shadow-2xl shadow-black/20">
              <CardContent className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                  {/* Departure Input */}
                  <div className="flex-1 relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-500" />
                    <Input
                      placeholder="Ex: Gare Centrale"
                      className="pl-10 h-12 bg-muted/50 border-muted-foreground/10 text-foreground placeholder:text-muted-foreground"
                      readOnly
                      onClick={handleSearchClick}
                    />
                    <span className="absolute -top-2.5 left-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground bg-white px-1">
                      Départ (Arrêt)
                    </span>
                  </div>

                  {/* Arrival Input */}
                  <div className="flex-1 relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-red-500" />
                    <Input
                      placeholder="Ex: Parcelles Assainies"
                      className="pl-10 h-12 bg-muted/50 border-muted-foreground/10 text-foreground placeholder:text-muted-foreground"
                      readOnly
                      onClick={handleSearchClick}
                    />
                    <span className="absolute -top-2.5 left-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground bg-white px-1">
                      Arrivée (Arrêt)
                    </span>
                  </div>

                  {/* Search Button */}
                  <Button
                    onClick={handleSearchClick}
                    className="h-12 px-6 sm:px-8 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shrink-0"
                  >
                    <span className="hidden sm:inline">Voir les prochains passages</span>
                    <span className="sm:hidden">Rechercher</span>
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Live Indicators */}
          <motion.div
            className="mt-8 flex flex-wrap items-center justify-center gap-3 sm:gap-4"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.6, ease: 'easeOut' }}
          >
            <Badge
              variant="secondary"
              className="bg-emerald-500/15 text-emerald-400 border-emerald-500/20 px-3 py-1.5 text-xs sm:text-sm font-medium backdrop-blur-sm"
            >
              <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              Réseau Actif
            </Badge>
            <Badge
              variant="secondary"
              className="bg-white/10 text-white/80 border-white/10 px-3 py-1.5 text-xs sm:text-sm font-medium backdrop-blur-sm"
            >
              🚌 6 Bus en circulation
            </Badge>
            <Badge
              variant="secondary"
              className="bg-white/10 text-white/80 border-white/10 px-3 py-1.5 text-xs sm:text-sm font-medium backdrop-blur-sm"
            >
              ⏱️ Prochain passage : 3 min
            </Badge>
          </motion.div>
        </div>
      </div>

      {/* Bottom gradient fade */}
      <div
        className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none"
        style={{
          background: 'linear-gradient(to top, #0F172A, transparent)',
        }}
        aria-hidden="true"
      />
    </section>
  );
}
