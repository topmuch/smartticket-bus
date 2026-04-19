'use client';

import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Shield, Store, Lock, ArrowRight } from 'lucide-react';

interface AppCard {
  icon: React.ReactNode;
  title: string;
  description: string;
  iconBg: string;
}

interface AppsAccessSectionProps {
  onLoginClick: () => void;
}

const APPS: AppCard[] = [
  {
    icon: <Shield className="h-8 w-8" />,
    title: 'Agent Contrôleur',
    description:
      'Application mobile PWA pour scanner et valider les billets en temps réel, même hors-ligne.',
    iconBg: 'bg-emerald-500/15 text-emerald-600',
  },
  {
    icon: <Store className="h-8 w-8" />,
    title: 'Guichet de Vente',
    description:
      "Interface de vente de billets avec gestion de caisse, impression de reçus et suivi des ventes.",
    iconBg: 'bg-blue-500/15 text-blue-600',
  },
  {
    icon: <Lock className="h-8 w-8" />,
    title: 'Administration',
    description:
      "Dashboard complet : gestion des lignes, arrêts, horaires, tarifs, utilisateurs et rapports.",
    iconBg: 'bg-purple-500/15 text-purple-600',
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

export function AppsAccessSection({ onLoginClick }: AppsAccessSectionProps) {
  return (
    <section className="py-20 bg-background" id="apps">
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
            Accès Professionnel
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Espace dédié aux employés et partenaires SmartTicket
          </p>
        </motion.div>

        {/* App Cards */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
        >
          {APPS.map((app) => (
            <motion.div key={app.title} variants={cardVariants}>
              <Card
                className="h-full min-h-[280px] flex flex-col justify-between border-border/60 hover:shadow-xl transition-all duration-300 cursor-pointer group"
                onClick={onLoginClick}
              >
                <CardContent className="p-6 lg:p-8 flex flex-col items-center text-center flex-1">
                  <div
                    className={`flex h-16 w-16 items-center justify-center rounded-2xl ${app.iconBg} mb-6`}
                  >
                    {app.icon}
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    {app.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {app.description}
                  </p>
                </CardContent>
                <div className="px-6 pb-6 lg:px-8 lg:pb-8 flex justify-center">
                  <Button
                    variant="outline"
                    className="group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary transition-all duration-300"
                  >
                    Accéder
                    <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </Button>
                </div>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
