'use client';

import { useState } from 'react';
import Image from 'next/image';
import { MapPin, Calendar, Users, Search, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export function HeroSection() {
  const [tripType, setTripType] = useState<'oneway' | 'roundtrip'>('oneway');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [date, setDate] = useState('');
  const [passengers, setPassengers] = useState(1);

  const handleSearch = () => {
    const el = document.querySelector('#horaires');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <section id="accueil" className="relative min-h-screen flex items-center overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0">
        <Image
          src="/images/hero-bus.png"
          alt="Bus moderne sur route côtière"
          fill
          className="object-cover"
          priority
        />
        {/* Dark Overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-slate-900/85 via-slate-900/60 to-slate-900/40" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-slate-900/30" />
      </div>

      {/* Animated decorative orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <motion.div
          className="absolute top-[20%] left-[5%] w-64 h-64 rounded-full bg-rose-500/15 blur-[100px]"
          animate={{ y: [0, 20, -15, 0], x: [0, -15, 10, 0] }}
          transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute bottom-[25%] right-[10%] w-80 h-80 rounded-full bg-orange-500/10 blur-[120px]"
          animate={{ y: [0, -20, 15, 0], x: [0, 10, -20, 0] }}
          transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute top-[50%] left-[45%] w-48 h-48 rounded-full bg-amber-400/10 blur-[80px]"
          animate={{ y: [0, 15, -10, 0], scale: [1, 1.1, 0.95, 1] }}
          transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32 sm:py-40">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left: Text Content */}
          <div className="text-white">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7 }}
            >
              <Badge className="mb-4 bg-amber-500/20 text-amber-300 border-amber-500/30 px-3 py-1 text-sm font-medium backdrop-blur-sm">
                🚌 Réseau National — Dakar &amp; Régions
              </Badge>
            </motion.div>

            <motion.h1
              className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight tracking-tight"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1 }}
            >
              Voyagez Plus Loin
              <br />
              <span className="bg-gradient-to-r from-rose-400 via-orange-400 to-amber-400 bg-clip-text text-transparent">
                en Toute Simplicité
              </span>
            </motion.h1>

            <motion.p
              className="mt-6 text-lg sm:text-xl text-white/70 max-w-xl leading-relaxed"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
            >
              Réservez vos billets de bus en ligne — Suivez les horaires en temps réel. Des aventures abordables vous attendent sur nos lignes longue distance.
            </motion.p>

            {/* Stats */}
            <motion.div
              className="mt-8 flex flex-wrap gap-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.35 }}
            >
              {[
                { value: '6+', label: 'Lignes Actives' },
                { value: '50+', label: 'Destinations' },
                { value: '24/7', label: 'Réservation' },
              ].map((stat) => (
                <div key={stat.label}>
                  <div className="text-2xl sm:text-3xl font-bold text-white">{stat.value}</div>
                  <div className="text-sm text-white/50">{stat.label}</div>
                </div>
              ))}
            </motion.div>
          </div>

          {/* Right: Search Form */}
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="w-full max-w-lg lg:max-w-none mx-auto"
          >
            <Card className="bg-white/[0.97] backdrop-blur-xl border-white/20 shadow-2xl shadow-black/20 rounded-2xl overflow-hidden">
              {/* Form Header */}
              <div className="bg-gradient-to-r from-rose-500 to-orange-500 px-6 py-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Search className="w-5 h-5" />
                  Find Your Perfect Bus
                </h3>
                <p className="text-sm text-white/80 mt-0.5">Recherchez parmi nos lignes disponibles</p>
              </div>

              <CardContent className="p-6 space-y-5">
                {/* Trip Type Toggle */}
                <div className="flex gap-2 bg-slate-100 rounded-xl p-1">
                  <button
                    onClick={() => setTripType('oneway')}
                    className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                      tripType === 'oneway'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    Aller simple
                  </button>
                  <button
                    onClick={() => setTripType('roundtrip')}
                    className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                      tripType === 'roundtrip'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    Aller-retour
                  </button>
                </div>

                {/* From */}
                <div className="relative">
                  <label className="absolute -top-2.5 left-3 text-[10px] font-semibold uppercase tracking-wider text-slate-500 bg-white px-1.5">
                    Départ
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-rose-500" />
                    <input
                      type="text"
                      placeholder="Entrez ville ou gare"
                      value={from}
                      onChange={(e) => setFrom(e.target.value)}
                      className="w-full pl-10 pr-4 h-12 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-300 transition-all"
                    />
                  </div>
                </div>

                {/* To */}
                <div className="relative">
                  <label className="absolute -top-2.5 left-3 text-[10px] font-semibold uppercase tracking-wider text-slate-500 bg-white px-1.5">
                    Destination
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-orange-500" />
                    <input
                      type="text"
                      placeholder="Entrez ville ou gare"
                      value={to}
                      onChange={(e) => setTo(e.target.value)}
                      className="w-full pl-10 pr-4 h-12 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-300 transition-all"
                    />
                  </div>
                </div>

                {/* Date & Passengers Row */}
                <div className="grid grid-cols-2 gap-3">
                  {/* Date */}
                  <div className="relative">
                    <label className="absolute -top-2.5 left-3 text-[10px] font-semibold uppercase tracking-wider text-slate-500 bg-white px-1.5">
                      Date
                    </label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <input
                        type="date"
                        value={date}
                        min={today}
                        onChange={(e) => setDate(e.target.value)}
                        className="w-full pl-10 pr-3 h-12 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-300 transition-all"
                      />
                    </div>
                  </div>

                  {/* Passengers */}
                  <div className="relative">
                    <label className="absolute -top-2.5 left-3 text-[10px] font-semibold uppercase tracking-wider text-slate-500 bg-white px-1.5">
                      Passagers
                    </label>
                    <div className="relative">
                      <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <select
                        value={passengers}
                        onChange={(e) => setPassengers(Number(e.target.value))}
                        className="w-full pl-10 pr-3 h-12 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-300 transition-all appearance-none"
                      >
                        {[1, 2, 3, 4, 5, 6].map((n) => (
                          <option key={n} value={n}>
                            {n} {n === 1 ? 'Adulte' : 'Adultes'}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Search Button */}
                <Button
                  onClick={handleSearch}
                  className="w-full h-13 bg-gradient-to-r from-rose-500 via-orange-500 to-amber-500 hover:from-rose-600 hover:via-orange-600 hover:to-amber-600 text-white font-bold text-base rounded-xl shadow-lg shadow-rose-500/25 hover:shadow-rose-500/40 transition-all duration-300 hover:scale-[1.02]"
                >
                  <span>Rechercher les Bus</span>
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>

      {/* Bottom gradient fade */}
      <div
        className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none bg-gradient-to-t from-white to-transparent"
        aria-hidden="true"
      />
    </section>
  );
}
