'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';
import { Wifi, Wind, Plug, Droplets, Shield, Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface BusLine {
  id: string;
  name: string;
  image: string;
  badge: string;
  badgeColor: string;
  features: string[];
}

const BUS_LINES: BusLine[] = [
  {
    id: 'express-dakar-mbour',
    name: 'Express Dakar - Mbour',
    image: '/images/bus-express.png',
    badge: 'NATIONAL ROUTES',
    badgeColor: 'bg-rose-500',
    features: ['48 sièges luxe', 'WiFi gratuit', 'Climatisation', 'Prises USB', 'Toilettes à bord'],
  },
  {
    id: 'regional-thies',
    name: 'Régionale Thiès',
    image: '/images/bus-regional.png',
    badge: 'LIMITED ROUTES',
    badgeColor: 'bg-amber-500',
    features: ['40 sièges confort', 'WiFi gratuit', 'Climatisation', 'Prises USB'],
  },
  {
    id: 'aeroport',
    name: 'Navette Aéroport',
    image: '/images/bus-airport.png',
    badge: 'PREMIUM',
    badgeColor: 'bg-violet-500',
    features: ['30 sièges premium', 'WiFi haute vitesse', 'Climatisation', 'Prises USB', 'Écrans individuels'],
  },
  {
    id: 'saint-louis',
    name: 'Ligne Saint-Louis',
    image: '/images/bus-longdistance.png',
    badge: 'COASTAL ROUTES',
    badgeColor: 'bg-emerald-500',
    features: ['50 sièges luxe', 'WiFi gratuit', 'Climatisation', 'Toilettes à bord', 'Prises USB'],
  },
  {
    id: 'kaolack',
    name: 'Ligne Kaolack',
    image: '/images/bus-economic.png',
    badge: 'ECONOMIQUE',
    badgeColor: 'bg-sky-500',
    features: ['50 sièges standard', 'Climatisation', 'Prises USB', 'Bagage volumineux'],
  },
  {
    id: 'urbaine',
    name: 'Navette Urbaine',
    image: '/images/bus-urban.png',
    badge: 'URBAIN',
    badgeColor: 'bg-orange-500',
    features: ['20 sièges', 'Climatisation', 'Fréquence 15 min', 'Arrêts multiples'],
  },
];

const FEATURE_ICONS: Record<string, React.ReactNode> = {
  'WiFi': <Wifi className="w-3.5 h-3.5" />,
  'Climatisation': <Wind className="w-3.5 h-3.5" />,
  'Prises USB': <Plug className="w-3.5 h-3.5" />,
  'Toilettes': <Droplets className="w-3.5 h-3.5" />,
  'Climatisation': <Wind className="w-3.5 h-3.5" />,
};

function BusCarrierCard({ line, index }: { line: BusLine; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.5, delay: index * 0.08 }}
    >
      <Card className="group overflow-hidden border-slate-200 hover:border-slate-300 hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300 hover:-translate-y-1 bg-white">
        {/* Image */}
        <div className="relative h-48 overflow-hidden">
          <Image
            src={line.image}
            alt={line.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
          <Badge className={`absolute top-3 left-3 ${line.badgeColor} text-white text-[10px] font-bold px-2.5 py-1 shadow-lg`}>
            {line.badge}
          </Badge>
        </div>

        <CardContent className="p-5">
          <h3 className="text-lg font-bold text-slate-900 mb-3">{line.name}</h3>
          <div className="flex flex-wrap gap-1.5">
            {line.features.map((feature) => (
              <span
                key={feature}
                className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded-md"
              >
                {FEATURE_ICONS[feature] || <Shield className="w-3 h-3" />}
                {feature}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export function BusCarriersSection() {
  return (
    <section id="lignes" className="py-20 lg:py-28 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          className="text-center max-w-2xl mx-auto mb-14"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <Badge className="mb-3 bg-rose-50 text-rose-600 border-rose-200 px-3 py-1 text-xs font-semibold">
            Nos Lignes
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Bus Carrier{' '}
            <span className="bg-gradient-to-r from-rose-500 to-orange-500 bg-clip-text text-transparent">
              Offerings
            </span>
          </h2>
          <p className="mt-3 text-lg text-slate-500">
            Découvrez nos lignes et leurs équipements pour votre confort
          </p>
        </motion.div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {BUS_LINES.map((line, i) => (
            <BusCarrierCard key={line.id} line={line} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
