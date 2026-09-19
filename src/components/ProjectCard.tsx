import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Github,
  TrendingUp,
  Maximize2,
  Image as ImageIcon,
  Globe,
  FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Project } from '../types';
import { LazyImage } from './LazyImage';
import { getProjectLinks } from '../utils/projectLinks';

interface ProjectCardProps {
  project: Project;
  isExpanded: boolean;
  onToggle: () => void;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({
  project,
  isExpanded,
  onToggle
}) => {
  const [selectedGalleryIndex, setSelectedGalleryIndex] = useState(0);

  // Collect all images available for this project
  const allImages: string[] = [];
  if (project.imageUrl && !allImages.includes(project.imageUrl)) {
    allImages.push(project.imageUrl);
  }
  if (Array.isArray(project.images)) {
    project.images.forEach((img) => {
      if (img && !allImages.includes(img)) {
        allImages.push(img);
      }
    });
  }
  // Fallback if none provided
  if (allImages.length === 0) {
    allImages.push('https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?q=80&w=1200&auto=format&fit=crop');
  }

  const activeImage = allImages[selectedGalleryIndex] || allImages[0];

  const handleAnchorOnCollapse = () => {
    const cardEl = document.getElementById(`project-card-${project.id}`);
    const projectsSection = document.getElementById('projects');
    if (!cardEl) return;
    
    const cardRect = cardEl.getBoundingClientRect();
    if (cardRect.top < 80) {
      const targetY = Math.max(0, window.scrollY + cardRect.top - 80);
      window.scrollTo({ top: targetY, behavior: 'smooth' });
      return;
    }

    if (projectsSection) {
      const sectionRect = projectsSection.getBoundingClientRect();
      const cardHeight = cardEl.offsetHeight;
      const collapsedEstimate = 320;
      const deltaH = Math.max(0, cardHeight - collapsedEstimate);
      const futureBottom = sectionRect.bottom - deltaH;
      if (futureBottom < window.innerHeight) {
        const overshoot = window.innerHeight - futureBottom;
        const targetY = Math.max(0, window.scrollY - overshoot);
        window.scrollTo({ top: targetY, behavior: 'smooth' });
      }
    }
  };

  const handleToggleCard = (e?: React.MouseEvent | React.KeyboardEvent) => {
    if (e) e.stopPropagation();
    if (isExpanded) {
      handleAnchorOnCollapse();
    }
    onToggle();
  };

  const handleMouseEnter = () => {
    if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
      if (!isExpanded) {
        onToggle();
      }
    }
  };

  const handleMouseLeave = () => {
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    if (isExpanded) {
      handleAnchorOnCollapse();
      onToggle();
    }
  };

  return (
    <motion.div
      layout
      id={`project-card-${project.id}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className={`rounded-2xl border bg-white dark:bg-stone-900 overflow-hidden transition-all duration-300 ${
        isExpanded
          ? 'border-stone-400 dark:border-stone-600 shadow-lg ring-1 ring-stone-900/5'
          : 'border-stone-200 dark:border-stone-700 shadow-xs hover:shadow-md hover:border-stone-300'
      }`}
    >
      {/* Clickable Card Header: Image & Name */}
      <div
        role="button"
        tabIndex={0}
        aria-expanded={isExpanded}
        aria-label={`${project.title} - click to ${isExpanded ? 'collapse' : 'expand'} project details and gallery`}
        onClick={handleToggleCard}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleToggleCard(e);
          }
        }}
        className="w-full text-left cursor-pointer group focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-900"
      >
        {/* Project Image */}
        <div 
          className="relative aspect-[16/10] w-full bg-stone-100"
        >
          <LazyImage
            src={activeImage}
            alt={project.title}
            className="w-full h-full"
          />

          {/* Subtle overlay on hover */}
          <div className="absolute inset-0 bg-stone-950/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none" />

          {/* Project Title Overlay */}
          <div className="absolute bottom-3 left-3 right-20 pointer-events-none">
            <div className="inline-flex max-w-full px-4 py-2 rounded-xl bg-black/[0.07] backdrop-blur-[7px] pointer-events-auto">
              <h3 className="text-base sm:text-lg font-bold text-white tracking-tight truncate">
                {project.title}
              </h3>
            </div>
          </div>

          {/* Navigation Arrows */}
          {allImages.length > 1 && (
            <div className="absolute bottom-3 right-3 flex items-center gap-1">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedGalleryIndex((prev) => (prev - 1 + allImages.length) % allImages.length);
                }}
                className="p-1.5 rounded-md bg-white/90 backdrop-blur-md text-stone-800 hover:bg-white border border-stone-200/80 shadow-2xs transition-colors pointer-events-auto"
                aria-label="Previous image"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedGalleryIndex((prev) => (prev + 1) % allImages.length);
                }}
                className="p-1.5 rounded-md bg-white/90 backdrop-blur-md text-stone-800 hover:bg-white border border-stone-200/80 shadow-2xs transition-colors pointer-events-auto"
                aria-label="Next image"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Expanded Content: More Info & Additional Images */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            key="expanded-content"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="p-5 sm:p-6 space-y-6 bg-stone-50/40">
              {/* Description / Overview */}
              <div className="space-y-1.5">
                <h4 className="text-[11px] font-mono uppercase tracking-wider text-stone-500">
                  Project Overview
                </h4>
                <p className="text-xs sm:text-sm text-stone-700 leading-relaxed">
                  {project.description}
                </p>
              </div>

              {/* Key Highlights / Engineering Highlights */}
              {project.challengesSolved && project.challengesSolved.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-[11px] font-mono uppercase tracking-wider text-stone-500 flex items-center gap-1.5">
                    <span>Key Engineering Highlights</span>
                  </h4>
                  <ul className="space-y-2">
                    {project.challengesSolved.map((bullet, bIdx) => (
                      <li key={bIdx} className="flex items-start gap-2.5 text-xs sm:text-sm text-stone-700 dark:text-stone-300 leading-relaxed">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400 mt-2 shrink-0" />
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Key Performance Specifications */}
              {project.metrics && project.metrics.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-[11px] font-mono uppercase tracking-wider text-stone-500 flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-stone-600" />
                    <span>Key Performance Specifications</span>
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                    {project.metrics.map((m, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-xl bg-white border border-stone-200 shadow-2xs text-center flex flex-col justify-center min-h-[58px]"
                      >
                        <div className="text-xs sm:text-sm font-mono font-bold text-stone-900 break-words leading-tight">
                          {m.value || '—'}
                        </div>
                        <div className="text-[10.5px] text-stone-600 mt-1 leading-snug break-words">
                          {m.label || 'Specification'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Configured Project Links */}
              {(() => {
                const links = getProjectLinks(project);
                if (links.length === 0) return null;

                return (
                  <div className="pt-2 border-t border-stone-200">
                    <div className="flex flex-wrap items-center gap-2 pt-2">
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
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 hover:text-stone-900 text-xs font-medium border border-stone-200/80 transition-colors shadow-2xs group/link"
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
                  </div>
                );
              })()}

              {/* Bottom Collapse Button */}
              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={handleToggleCard}
                  className="inline-flex items-center gap-1 text-xs text-stone-500 hover:text-stone-900 font-medium py-1 px-3 rounded-lg hover:bg-stone-200/60 transition-colors"
                >
                  <ChevronUp className="w-3.5 h-3.5" />
                  <span>Collapse card</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
