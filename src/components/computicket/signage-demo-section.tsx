'use client';

import { motion } from 'framer-motion';
import { Monitor, Maximize2, Clock, Bus, ArrowRight, Wifi } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

const FEATURES = [
  { icon: <Clock className="w-5 h-5" />, label: 'Temps réel', desc: 'Horloge + départs mis à jour chaque seconde' },
  { icon: <Bus className="w-5 h-5" />, label: '10 lignes', desc: 'Dakar, Mbour, Thiès, Saint-Louis et plus' },
  { icon: <Wifi className="w-5 h-5" />, label: 'Auto-refresh', desc: 'Mise à jour automatique toutes les 30 secondes' },
  { icon: <Maximize2 className="w-5 h-5" />, label: 'Plein écran', desc: 'Mode kiosk pour écrans de gare' },
];

const MOCK_LINES = [
  { line: 'L10', color: '#2563EB', dest: 'DAKAR - Gare Centrale', time: '12:15', status: 'on-time', platform: 'Q3' },
  { line: 'L24', color: '#10B981', dest: 'MBOUR - Terminal', time: '12:20', status: 'delayed', platform: 'Q1' },
  { line: 'L05', color: '#F59E0B', dest: 'THIÈS - Centre', time: '12:25', status: 'boarding', platform: 'Q5' },
  { line: 'L08', color: '#EF4444', dest: 'SAINT-LOUIS', time: '12:30', status: 'on-time', platform: 'Q2' },
];

function StatusDot({ status }: { status: string }) {
  if (status === 'on-time') return <span className="w-2 h-2 rounded-full bg-emerald-500" />;
  if (status === 'delayed') return <span className="w-2 h-2 rounded-full bg-amber-500" />;
  if (status === 'boarding') return <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />;
  return null;
}

export function SignageDemoSection() {
  const router = useRouter();

  const openDemo = () => {
    window.location.href = '/?display=peters&mode=demo';
  };

  return (
    <section id="demo-affichage" className="py-20 lg:py-28 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          className="text-center max-w-2xl mx-auto mb-14"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <span className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full mb-3">
            <Monitor className="w-4 h-4" />
            Affichage en Gare
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Écran d&apos;Information{' '}
            <span className="bg-gradient-to-r from-emerald-500 to-teal-500 bg-clip-text text-transparent">
              Temps Réel
            </span>
          </h2>
          <p className="mt-3 text-lg text-slate-500">
            Découvrez notre système d&apos;affichage digital pour les gares routières
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          {/* Left: Mock Display Preview */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="relative rounded-2xl overflow-hidden shadow-2xl shadow-slate-300/50 border border-slate-200">
              {/* Mini Header */}
              <div className="bg-gradient-to-r from-slate-900 to-slate-800 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-gradient-to-br from-rose-500 to-orange-500 text-white">
                    <Bus className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-bold text-white">SmartTicketQR</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[10px] font-bold text-emerald-300 uppercase">En Direct</span>
                </div>
                <div className="text-xs font-mono text-white/60 font-bold">
                  --:--:--
                </div>
              </div>

              {/* Ticker */}
              <div className="bg-red-600 text-white py-1.5 overflow-hidden">
                <div className="animate-marquee whitespace-nowrap">
                  <span className="text-xs font-semibold px-4">
                    ⚠️ INFO VOYAGEURS : RETARDS DE 15 MIN SUR LA LIGNE DAKAR-MBOUR CAUSE TRAVAUX — MERCI DE VOTRE COMPRÉHENSION &nbsp;&nbsp;&nbsp; 🚌 Bienvenue à la Gare Routière Peters — SmartTicketQR, votre partenaire voyage
                  </span>
                </div>
              </div>

              {/* Table */}
              <div className="bg-white">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-100">
                      <th className="text-left px-3 py-2 text-[10px] font-bold text-slate-500 uppercase">Heure</th>
                      <th className="text-left px-3 py-2 text-[10px] font-bold text-slate-500 uppercase">Ligne</th>
                      <th className="text-left px-3 py-2 text-[10px] font-bold text-slate-500 uppercase">Destination</th>
                      <th className="text-left px-3 py-2 text-[10px] font-bold text-slate-500 uppercase">Quai</th>
                      <th className="text-left px-3 py-2 text-[10px] font-bold text-slate-500 uppercase">Statut</th>
                    </tr>
                  </thead>
                  <tbody>
                    {MOCK_LINES.map((item, i) => (
                      <tr key={i} className="border-b border-slate-100 last:border-0">
                        <td className="px-3 py-2.5">
                          <span className="text-sm font-bold font-mono text-slate-900">{item.time}</span>
                        </td>
                        <td className="px-3 py-2.5">
                          <span
                            className="inline-flex items-center justify-center w-7 h-7 rounded text-white text-[10px] font-black"
                            style={{ backgroundColor: item.color }}
                          >
                            {item.line}
                          </span>
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="text-xs font-semibold text-slate-700">{item.dest}</span>
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="text-xs font-bold text-slate-900">{item.platform}</span>
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold">
                            <StatusDot status={item.status} />
                            <span className={
                              item.status === 'on-time' ? 'text-emerald-600' :
                              item.status === 'delayed' ? 'text-amber-600' :
                              'text-blue-600'
                            }>
                              {item.status === 'on-time' ? 'À l\'heure' :
                               item.status === 'delayed' ? 'Retard' : 'Embarquement'}
                            </span>
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Footer */}
              <div className="bg-gradient-to-r from-slate-900 to-slate-800 px-4 py-2 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-white/40">
                  <span className="text-xs">🌤️ 28°C</span>
                  <span className="text-[10px]">|</span>
                  <span className="text-[10px]">WiFi Gratuit</span>
                </div>
                <span className="text-[10px] text-white/30 italic">Bienvenue à bord des lignes SmartTicketQR</span>
              </div>
            </div>

            {/* Demo Button */}
            <motion.div
              className="mt-6 text-center"
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.3 }}
            >
              <Button
                onClick={openDemo}
                size="lg"
                className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 hover:scale-[1.03] transition-all duration-300 px-8 h-12"
              >
                <Maximize2 className="w-5 h-5 mr-2" />
                Lancer la Démo Plein Écran
              </Button>
              <p className="mt-2 text-xs text-slate-400">
                Mode kiosk optimisé pour écrans 16:9 (1920×1080)
              </p>
            </motion.div>
          </motion.div>

          {/* Right: Features */}
          <motion.div
            className="space-y-5"
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.15 }}
          >
            {FEATURES.map((feat, i) => (
              <motion.div
                key={feat.label}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: 0.2 + i * 0.08 }}
                className="group flex items-start gap-4 p-5 rounded-2xl bg-slate-50 border border-slate-100 hover:bg-slate-100 hover:border-slate-200 transition-all duration-300"
              >
                <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 shrink-0 group-hover:scale-110 transition-transform">
                  {feat.icon}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">{feat.label}</h3>
                  <p className="text-sm text-slate-500 mt-0.5">{feat.desc}</p>
                </div>
              </motion.div>
            ))}

            {/* Info box */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100">
              <div className="flex items-start gap-3">
                <Monitor className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-bold text-slate-900 mb-1">Idéal pour les gares</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">
                    Installez sur un écran tactile ou une télévision dans votre gare. 
                    L&apos;affichage se met à jour automatiquement et fonctionne en mode plein écran (kiosk).
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
