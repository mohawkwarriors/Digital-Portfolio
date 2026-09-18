import React, { useEffect } from 'react';
import { X, ExternalLink, Github, Layers, CheckCircle2, TrendingUp, Compass } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Project } from '../types';

interface ProjectModalProps {
  project: Project | null;
  onClose: () => void;
}

export const ProjectModal: React.FC<ProjectModalProps> = ({ project, onClose }) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (project) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [project, onClose]);

  return (
    <AnimatePresence>
      {project && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/70 backdrop-blur-xs"
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
        >
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            id="project-detail-modal"
            className="bg-white rounded-2xl border border-stone-200 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 space-y-6 text-stone-800"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-stone-100">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono text-stone-600 bg-stone-100 border border-stone-200">
                {project.category}
              </span>
              {project.featured && (
                <span className="px-2 py-0.5 rounded text-[10px] font-mono text-stone-700 bg-stone-50 border border-stone-200">
                  Featured
                </span>
              )}
            </div>
            <h3 id="modal-title" className="text-xl font-bold text-stone-900 tracking-tight">
              {project.title}
            </h3>
            <p className="text-xs font-medium text-stone-500">
              {project.tagline}
            </p>
          </div>
          <button
            onClick={onClose}
            id="close-modal-btn"
            aria-label="Close Project Modal"
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Project Description */}
        <div className="space-y-1.5">
          <h4 className="text-[11px] font-mono uppercase tracking-wider text-stone-400">
            Overview
          </h4>
          <p className="text-stone-700 text-xs sm:text-sm leading-relaxed">
            {project.description}
          </p>
        </div>

        {/* Key Metrics Grid */}
        <div className="space-y-1.5">
          <h4 className="text-[11px] font-mono uppercase tracking-wider text-stone-400 flex items-center gap-1.5">
            <TrendingUp className="w-3 h-3 text-stone-500" />
            <span>Performance & Yield Metrics</span>
          </h4>
          <div className="grid grid-cols-3 gap-2.5">
            {project.metrics.map((metric, idx) => (
              <div key={idx} className="p-2.5 rounded-lg bg-stone-50 border border-stone-200/80 text-center">
                <div className="text-sm sm:text-base font-mono font-semibold text-stone-900">
                  {metric.value}
                </div>
                <div className="text-[10px] text-stone-500 mt-0.5">
                  {metric.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* System Architecture Overview */}
        <div className="space-y-1.5 p-3.5 rounded-xl bg-stone-50 border border-stone-200/80">
          <h4 className="text-[11px] font-mono uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-stone-600" />
            <span>Mechanical & Enclosure Architecture</span>
          </h4>
          <p className="text-stone-600 text-xs leading-relaxed">
            {project.architectureOverview}
          </p>
        </div>

        {/* Key Engineering Challenges Solved */}
        <div className="space-y-1.5">
          <h4 className="text-[11px] font-mono uppercase tracking-wider text-stone-400">
            Technical & DFM Hurdles Solved
          </h4>
          <ul className="space-y-1.5">
            {project.challengesSolved.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2 text-xs text-stone-600">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Tech Stack Chips */}
        <div className="space-y-1.5">
          <h4 className="text-[11px] font-mono uppercase tracking-wider text-stone-400 flex items-center gap-1.5">
            <Compass className="w-3 h-3 text-stone-400" />
            <span>CAD Tools & Manufacturing Stack</span>
          </h4>
          <div className="flex flex-wrap gap-1">
            {project.techStack.map((tech) => (
              <span
                key={tech}
                className="px-2 py-0.5 rounded bg-stone-50 text-stone-600 font-mono text-[10px] border border-stone-200"
              >
                {tech}
              </span>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-4 border-t border-stone-100">
          {project.githubUrl && (
            <a
              href={project.githubUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-50 hover:bg-stone-100 text-stone-700 font-medium text-xs border border-stone-200 transition-colors"
            >
              <Github className="w-3.5 h-3.5" />
              <span>Source</span>
              <ExternalLink className="w-3 h-3 text-stone-400" />
            </a>
          )}
          {project.liveUrl && (
            <a
              href={project.liveUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-white font-medium text-xs transition-colors shadow-2xs"
            >
              <span>Live Demo</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
