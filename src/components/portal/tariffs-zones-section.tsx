'use client';

import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Info } from 'lucide-react';

interface Zone {
  code: string;
  name: string;
  color: string;
  price: number;
}

const ZONES: Zone[] = [
  { code: '01', name: 'Centre-ville', color: '#16a34a', price: 150 },
  { code: '02', name: 'Zone Nord', color: '#2563eb', price: 250 },
  { code: '03', name: 'Zone Est', color: '#d97706', price: 300 },
  { code: '04', name: 'Zone Sud', color: '#dc2626', price: 350 },
  { code: '05', name: 'Zone Ouest', color: '#7c3aed', price: 400 },
];

const STEPS = [
  'Choisissez votre zone de départ et d\'arrivée',
  'Le prix est calculé automatiquement selon les zones traversées',
  'Achetez votre ticket au guichet ou en ligne',
];

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: 'easeOut' },
  },
};

export function TariffsZonesSection() {
  return (
    <section className="py-20 bg-muted/30" id="tarifs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          className="text-center max-w-2xl mx-auto mb-14"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight">
            Nos Tarifs &amp; Zones
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Une tarification claire et transparente pour tous les trajets
          </p>
        </motion.div>

        {/* Zone Cards */}
        <motion.div
          className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory md:grid md:grid-cols-5 md:overflow-visible md:pb-0 -mx-4 px-4 md:mx-0 md:px-0"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
        >
          {ZONES.map((zone) => (
            <motion.div
              key={zone.code}
              variants={cardVariants}
              className="snap-start shrink-0 w-[200px] md:w-auto"
            >
              <Card className="h-full border-border/60 hover:shadow-md transition-all duration-300 overflow-hidden">
                <CardContent className="p-0">
                  {/* Colored top border */}
                  <div className="h-1.5" style={{ backgroundColor: zone.color }} />
                  <div className="p-5 flex flex-col items-center text-center">
                    {/* Zone code badge */}
                    <div
                      className="flex h-12 w-12 items-center justify-center rounded-full text-white text-lg font-bold mb-3"
                      style={{ backgroundColor: zone.color }}
                    >
                      {zone.code}
                    </div>
                    <h3 className="text-sm font-semibold text-foreground mb-1">
                      {zone.name}
                    </h3>
                    <p className="text-2xl font-bold text-foreground">
                      {zone.price}{' '}
                      <span className="text-sm font-normal text-muted-foreground">
                        FCFA
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Trajet intra-zone
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* How it works */}
        <motion.div
          className="mt-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card className="border-border/60 bg-background">
            <CardContent className="p-6 lg:p-8">
              <div className="flex items-start gap-3 mb-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600 shrink-0">
                  <Info className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">
                    💡 Comment ça marche ?
                  </h3>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Obtenez votre ticket en 3 étapes simples
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {STEPS.map((step, index) => (
                  <div key={index} className="flex items-start gap-4">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold shrink-0">
                      {index + 1}
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed pt-1">
                      {step}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </section>
  );
}
