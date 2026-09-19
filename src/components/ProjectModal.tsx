import React, { useEffect } from 'react';
import { X, ExternalLink, Github, TrendingUp, Compass, Globe, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Project } from '../types';
import { getProjectLinks } from '../utils/projectLinks';

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

        {/* Key Highlights / Engineering Highlights */}
        {project.challengesSolved && project.challengesSolved.length > 0 && (
          <div className="space-y-1.5">
            <h4 className="text-[11px] font-mono uppercase tracking-wider text-stone-400">
              Key Engineering Highlights
            </h4>
            <ul className="space-y-2">
              {project.challengesSolved.map((bullet, bIdx) => (
                <li key={bIdx} className="flex items-start gap-2.5 text-xs sm:text-sm text-stone-700 leading-relaxed">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-2 shrink-0" />
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Key Performance Specifications */}
        {project.metrics && project.metrics.length > 0 && (
          <div className="space-y-1.5">
            <h4 className="text-[11px] font-mono uppercase tracking-wider text-stone-400 flex items-center gap-1.5">
              <TrendingUp className="w-3 h-3 text-stone-500" />
              <span>Key Performance Specifications</span>
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
              {project.metrics.map((metric, idx) => (
                <div key={idx} className="p-2.5 rounded-lg bg-stone-50 border border-stone-200/80 text-center flex flex-col justify-center min-h-[58px]">
                  <div className="text-sm sm:text-base font-mono font-semibold text-stone-900 break-words leading-tight">
                    {metric.value || '—'}
                  </div>
                  <div className="text-[10.5px] text-stone-500 mt-1 leading-snug break-words">
                    {metric.label || 'Specification'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

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

        {/* Configured Project Links */}
        {(() => {
          const links = getProjectLinks(project);
          if (links.length === 0) return null;

          return (
            <div className="flex flex-wrap items-center justify-end gap-2 pt-4 border-t border-stone-100">
              {links.map((link, lIdx) => {
                const lowerLabel = link.label.toLowerCase();
                const lowerUrl = link.url.toLowerCase();
                const isGithub = lowerLabel.includes('github') || lowerUrl.includes('github.com');
                const isDoc = lowerLabel.includes('spec') || lowerLabel.includes('doc') || lowerLabel.includes('paper') || lowerLabel.includes('report');
                const isWebsite = lowerLabel.includes('website') || lowerLabel.includes('company') || lowerLabel.includes('home') || lowerLabel.includes('site');

                return (
                  <a
                    key={lIdx}
                    href={link.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-800 font-medium text-xs border border-stone-200/80 transition-colors shadow-2xs group/link"
                  >
                    {isGithub ? (
                      <Github className="w-3.5 h-3.5 text-stone-700" />
                    ) : isDoc ? (
                      <FileText className="w-3.5 h-3.5 text-stone-600" />
                    ) : (
                      <Globe className="w-3.5 h-3.5 text-stone-600" />
                    )}
                    <span>{link.label}</span>
                    <ExternalLink className="w-3 h-3 text-stone-400 group-hover/link:text-stone-700 transition-colors" />
                  </a>
                );
              })}
            </div>
          );
        })()}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
