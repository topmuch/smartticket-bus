'use client';

import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Ticket, Smartphone, BarChart3 } from 'lucide-react';

const FEATURES = [
  {
    icon: <Ticket className="h-6 w-6" />,
    title: 'Billetterie Zonale',
    description:
      "Tarification intelligente basée sur les zones (Zone 01 à 05). Achat rapide au guichet ou en ligne. Pas de surprise, le prix est fixe.",
    iconBg: 'bg-emerald-500/15',
    iconColor: 'text-emerald-600',
  },
  {
    icon: <Smartphone className="h-6 w-6" />,
    title: 'Contrôle Mobile',
    description:
      "Validation instantanée par QR Code sécurisé. Fonctionne même hors-ligne (Offline-First). Application mobile dédiée.",
    iconBg: 'bg-blue-500/15',
    iconColor: 'text-blue-600',
  },
  {
    icon: <BarChart3 className="h-6 w-6" />,
    title: 'Gestion Centralisée',
    description:
      "Dashboard administrateur complet pour gérer les flottes, les horaires, les tarifs et les revenus en temps réel.",
    iconBg: 'bg-amber-500/15',
    iconColor: 'text-amber-600',
  },
];

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.15,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: 'easeOut' },
  },
};

export function FeaturesSection() {
  return (
    <section className="py-20 bg-background" id="features">
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
            Pourquoi SmartTicket ?
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Un système de billetterie complet, sécurisé et moderne
          </p>
        </motion.div>

        {/* Feature Cards */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
        >
          {FEATURES.map((feature) => (
            <motion.div key={feature.title} variants={cardVariants}>
              <Card className="h-full border-border/60 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-default">
                <CardContent className="p-6 lg:p-8">
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-2xl ${feature.iconBg} ${feature.iconColor} mb-5`}
                  >
                    {feature.icon}
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
