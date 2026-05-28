'use client';

import { motion } from 'framer-motion';
import { Phone, MessageCircle, MapPin, HelpCircle, Clock, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';

const ICONS = [
  { icon: <Phone className="w-7 h-7" />, label: '+221 33 800 00 00' },
  { icon: <MessageCircle className="w-7 h-7" />, label: 'Chat en direct' },
  { icon: <MapPin className="w-7 h-7" />, label: 'Gare Centrale' },
];

const FEATURES = [
  { icon: <Clock className="w-5 h-5" />, text: 'Ouvert 7j/7' },
  { icon: <Shield className="w-5 h-5" />, text: 'Aide certifiée' },
  { icon: <HelpCircle className="w-5 h-5" />, text: 'Support expert' },
];

export function HelpSection() {
  return (
    <section id="gares" className="relative py-20 lg:py-28 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" />

      {/* Decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div className="absolute top-0 left-0 w-96 h-96 rounded-full bg-amber-500/10 blur-[120px]" />
        <div className="absolute bottom-0 right-0 w-96 h-96 rounded-full bg-rose-500/10 blur-[120px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-orange-500/5 blur-[150px]" />
      </div>

      {/* Grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
        aria-hidden="true"
      />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Left: Content */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-flex items-center gap-2 text-sm font-semibold text-amber-400 bg-amber-500/15 px-3 py-1.5 rounded-full mb-4 border border-amber-500/20">
              <HelpCircle className="w-4 h-4" />
              Assistance
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-tight">
              Besoin d&apos;Aide ?
              <br />
              <span className="bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
                Visitez Notre Équipe en GARE
              </span>
            </h2>
            <p className="mt-5 text-lg text-white/60 leading-relaxed max-w-lg">
              Obtenez une assistance personnalisée dans nos gares partenaires. Billets de bus, informations horaires, et conseils d&apos;experts — tout au même endroit.
            </p>

            {/* Features */}
            <div className="mt-8 flex flex-wrap gap-4">
              {FEATURES.map((feat) => (
                <div
                  key={feat.text}
                  className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/70"
                >
                  <span className="text-amber-400">{feat.icon}</span>
                  {feat.text}
                </div>
              ))}
            </div>

            <Button className="mt-8 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold rounded-xl shadow-lg shadow-amber-500/20">
              <MapPin className="w-4 h-4 mr-2" />
              Trouver une Gare
            </Button>
          </motion.div>

          {/* Right: Contact Cards */}
          <motion.div
            className="space-y-4"
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.15 }}
          >
            {ICONS.map((item, i) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: 0.2 + i * 0.1 }}
                className="group flex items-center gap-4 p-5 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all duration-300 cursor-pointer"
              >
                <div className="flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 text-amber-400 border border-amber-500/20 shrink-0 group-hover:scale-110 transition-transform">
                  {item.icon}
                </div>
                <div>
                  <p className="text-white font-semibold text-lg">{item.label}</p>
                  <p className="text-white/40 text-sm mt-0.5">Disponible maintenant</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
