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
  Image as ImageIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Project } from '../types';
import { LazyImage } from './LazyImage';

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

  const handleToggleCard = (e?: React.MouseEvent | React.KeyboardEvent) => {
    if (e) e.stopPropagation();
    if (isExpanded) {
      // If collapsing while scrolled down inside the card, anchor viewport to the card top
      // so the page doesn't jump down into Skills
      const cardEl = document.getElementById(`project-card-${project.id}`);
      if (cardEl) {
        const rect = cardEl.getBoundingClientRect();
        if (rect.top < 80) {
          const targetY = Math.max(0, window.scrollY + rect.top - 80);
          window.scrollTo({ top: targetY, behavior: 'smooth' });
        }
      }
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
      const cardEl = document.getElementById(`project-card-${project.id}`);
      if (cardEl) {
        const rect = cardEl.getBoundingClientRect();
        // If the user has scrolled down into the card, do NOT auto-collapse on mouse leave!
        // This prevents the page from collapsing mid-scroll and dumping into Skills.
        if (rect.top < 60) {
          return;
        }
      }
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

              {/* Key Performance Specifications */}
              {project.metrics && project.metrics.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-[11px] font-mono uppercase tracking-wider text-stone-500 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <TrendingUp className="w-3.5 h-3.5 text-stone-600" />
                      <span>Key Performance Specifications</span>
                    </span>
                    <span className="text-[10px] text-stone-400 font-mono">
                      {project.metrics.length} {project.metrics.length === 1 ? 'spec' : 'specs'}
                    </span>
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

              {/* Links (Source / CAD Repo & Product Specification) - Optional */}
              {((project.githubUrl && project.githubUrl.trim().length > 0) || (project.liveUrl && project.liveUrl.trim().length > 0)) && (
                <div className="pt-2 border-t border-stone-200">
                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    {project.githubUrl && project.githubUrl.trim().length > 0 && (
                      <a
                        href={project.githubUrl.trim()}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs text-stone-600 hover:text-stone-900 font-medium transition-colors"
                      >
                        <Github className="w-3.5 h-3.5" />
                        <span>Source / CAD Repo</span>
                        <ExternalLink className="w-3 h-3 text-stone-400" />
                      </a>
                    )}
                    {project.liveUrl && project.liveUrl.trim().length > 0 && (
                      <a
                        href={project.liveUrl.trim()}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors"
                      >
                        <span>Product Specification</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
              )}

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
