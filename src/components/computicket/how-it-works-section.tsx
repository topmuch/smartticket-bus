'use client';

import { motion } from 'framer-motion';
import { Search, Ticket, Smartphone, ArrowRight } from 'lucide-react';

const STEPS = [
  {
    number: '01',
    icon: <Search className="w-7 h-7" />,
    title: 'Recherchez',
    description: 'Entrez votre destination et date de voyage pour trouver les bus disponibles.',
    color: 'from-rose-500 to-pink-500',
    bgColor: 'bg-rose-50',
    iconColor: 'text-rose-500',
  },
  {
    number: '02',
    icon: <Ticket className="w-7 h-7" />,
    title: 'Réservez',
    description: 'Choisissez votre bus, sélectionnez votre siège et payez en ligne en toute sécurité.',
    color: 'from-orange-500 to-amber-500',
    bgColor: 'bg-orange-50',
    iconColor: 'text-orange-500',
  },
  {
    number: '03',
    icon: <Smartphone className="w-7 h-7" />,
    title: 'Voyagez',
    description: "Présentez votre QR code au contrôleur et profitez de votre voyage confortablement.",
    color: 'from-emerald-500 to-teal-500',
    bgColor: 'bg-emerald-50',
    iconColor: 'text-emerald-500',
  },
];

export function HowItWorksSection() {
  return (
    <section id="a-propos" className="py-20 lg:py-28 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          className="text-center max-w-2xl mx-auto mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <span className="inline-flex items-center gap-2 text-sm font-semibold text-rose-500 bg-rose-50 px-3 py-1 rounded-full mb-3">
            Simple & Rapide
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Réserver en{' '}
            <span className="bg-gradient-to-r from-rose-500 to-orange-500 bg-clip-text text-transparent">
              3 Étapes
            </span>{' '}
            Simples
          </h2>
          <p className="mt-3 text-lg text-slate-500">
            Votre billet de bus en quelques clics
          </p>
        </motion.div>

        {/* Steps */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12 relative">
          {/* Connector line (desktop) */}
          <div className="hidden md:block absolute top-16 left-[20%] right-[20%] h-0.5 bg-gradient-to-r from-rose-200 via-orange-200 to-emerald-200" aria-hidden="true" />

          {STEPS.map((step, i) => (
            <motion.div
              key={step.number}
              className="relative"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.15 }}
            >
              <div className="text-center">
                {/* Step circle */}
                <div className="relative inline-flex mb-6">
                  <div className={`w-20 h-20 rounded-2xl ${step.bgColor} flex items-center justify-center ${step.iconColor} shadow-lg`}>
                    {step.icon}
                  </div>
                  <div className={`absolute -top-2 -right-2 w-8 h-8 rounded-full bg-gradient-to-br ${step.color} text-white text-xs font-bold flex items-center justify-center shadow-md`}>
                    {step.number}
                  </div>
                </div>

                {/* Arrow (desktop only) */}
                {i < STEPS.length - 1 && (
                  <div className="hidden md:flex justify-center -mt-[72px] mb-[40px]">
                    <ArrowRight className="w-6 h-6 text-slate-300" />
                  </div>
                )}

                <h3 className="text-xl font-bold text-slate-900 mb-2">{step.title}</h3>
                <p className="text-slate-500 leading-relaxed max-w-xs mx-auto">{step.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
