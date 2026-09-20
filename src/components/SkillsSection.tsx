import React from 'react';
import { Compass, Layers, Wrench, ShieldCheck } from 'lucide-react';
import { motion } from 'motion/react';
import { SkillCategory } from '../types';

interface SkillsSectionProps {
  skills: SkillCategory[];
}

export const SkillsSection: React.FC<SkillsSectionProps> = ({ skills }) => {
  const getCategoryIcon = (name: string) => {
    if (name.includes('CAD') || name.includes('Modeling')) return Compass;
    if (name.includes('DFM') || name.includes('Manufacturing')) return Layers;
    if (name.includes('Mechanisms') || name.includes('FEA')) return Wrench;
    if (name.includes('GD&T') || name.includes('NPI')) return ShieldCheck;
    return Layers;
  };

  return (
    <section id="skills" className="py-10 sm:py-12 md:py-14 border-b border-stone-200 dark:border-stone-800">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-6">
        {/* Section Header */}
        <motion.div 
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="space-y-1.5"
        >
          <h2 id="skills-heading" className="text-xl sm:text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
            Skills
          </h2>
        </motion.div>

        {/* Streamlined Skills Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {skills.map((category, catIdx) => {
            const Icon = getCategoryIcon(category.name);
            return (
              <motion.div
                key={category.name}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-30px' }}
                whileHover={{ y: -2, transition: { duration: 0.2 } }}
                transition={{ duration: 0.35, delay: catIdx * 0.06, ease: [0.16, 1, 0.3, 1] }}
                className="bg-stone-50 dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-700 p-4 sm:p-5 shadow-sm hover:shadow-lg hover:shadow-stone-200/50 dark:hover:shadow-black/50 hover:border-stone-300 dark:hover:border-stone-600 transition-all duration-300 space-y-3.5 group"
              >
                <div className="flex items-center gap-2 pb-2.5 border-b border-stone-100 dark:border-stone-800">
                  <div className="w-7 h-7 rounded-lg bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 flex items-center justify-center text-stone-600 dark:text-stone-300 group-hover:border-blue-400 group-hover:text-blue-500 transition-colors">
                    <Icon className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm sm:text-base font-semibold text-stone-900 dark:text-stone-100 tracking-tight">
                    {category.name}
                  </h3>
                </div>

                <div className="flex flex-wrap gap-2">
                  {category.skills.map((skill) => (
                    <span
                      key={skill.name}
                      className={`px-3 py-1.5 rounded-lg text-xs sm:text-[13.5px] font-medium leading-snug border transition-all ${
                        skill.highlighted
                          ? 'bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400 font-semibold shadow-2xs'
                          : 'bg-white/80 dark:bg-stone-800/80 border-stone-200/80 dark:border-stone-700/80 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-700 hover:text-stone-900 dark:hover:text-stone-100'
                      }`}
                    >
                      {skill.name}
                    </span>
                  ))}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
