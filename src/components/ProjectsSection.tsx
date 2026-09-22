import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Project } from '../types';
import { ProjectCard } from './ProjectCard';

interface ProjectsSectionProps {
  projects: Project[];
}

export const ProjectsSection: React.FC<ProjectsSectionProps> = ({ projects }) => {
  // State for which project cards are expanded
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <section id="projects" className="py-12 md:py-16 border-b border-stone-200 dark:border-stone-800">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-8">
        {/* Section Heading: Strictly "Projects" */}
        <motion.div
          initial={{ opacity: 0, y: 14, filter: 'blur(4px)' }}
          whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          viewport={{ once: true, margin: '-60px 0px -30px 0px' }}
          transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
          className="flex items-center justify-between"
        >
          <h2
            id="projects-heading"
            className="text-2xl sm:text-3xl font-bold tracking-tight text-stone-900 dark:text-stone-100"
          >
            Projects
          </h2>
        </motion.div>

        {/* Projects Grid: 2 columns on desktop, 1 column on mobile */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          {projects.map((project, idx) => (
            <motion.div
              key={project.id}
              initial={{ opacity: 0, y: 20, filter: 'blur(4px)' }}
              whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              viewport={{ once: true, margin: '-50px 0px -20px 0px' }}
              transition={{ duration: 0.65, delay: idx * 0.08, ease: [0.22, 1, 0.36, 1] }}
            >
              <ProjectCard
                project={project}
                isExpanded={expandedIds.has(project.id)}
                onToggle={() => toggleExpand(project.id)}
              />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
