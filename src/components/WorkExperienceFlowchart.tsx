import React, { useState } from 'react';
import { 
  Calendar, 
  MapPin, 
  ChevronDown, 
  GitBranch,
  TrendingUp
} from 'lucide-react';
import { ExperienceFlowNode } from '../types';
import { motion, AnimatePresence } from 'motion/react';

interface WorkExperienceFlowchartProps {
  nodes: ExperienceFlowNode[];
  onOpenEdit?: () => void;
}

export const WorkExperienceFlowchart: React.FC<WorkExperienceFlowchartProps> = ({ 
  nodes,
  onOpenEdit 
}) => {
  // Sort direction: newest first by default
  const sortOrder = 'newest';
  
  // Track expanded state for extra details
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});

  const HEADER_OFFSET = 80;

  const toggleExpand = (id: string) => {
    const isCurrentlyExpanded = !!expandedNodes[id];
    if (isCurrentlyExpanded) {
      const el = document.getElementById(`exp-node-${id}`);
      if (el) {
        const rect = el.getBoundingClientRect();
        if (rect.top < HEADER_OFFSET) {
          const targetY = Math.max(0, window.scrollY + rect.top - HEADER_OFFSET);
          window.scrollTo({ top: targetY, behavior: 'instant' });
        }
      }
    }
    setExpandedNodes((prev) => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const anchorSectionOnCollapse = (cardEl: HTMLElement | null, sectionEl: HTMLElement | null, offset: number = HEADER_OFFSET) => {
    if (!cardEl) return;
    const cardRect = cardEl.getBoundingClientRect();
    
    // If the top of this card was scrolled above the header, smoothly anchor to card header
    if (cardRect.top < offset) {
      const targetY = Math.max(0, window.scrollY + cardRect.top - offset);
      window.scrollTo({ top: targetY, behavior: 'smooth' });
      return;
    }

    // If collapsing the card would cause the section to pull up and expose the next section (Projects)
    if (sectionEl) {
      const sectionRect = sectionEl.getBoundingClientRect();
      const cardHeight = cardEl.offsetHeight;
      const collapsedEstimate = 130;
      const deltaH = Math.max(0, cardHeight - collapsedEstimate);
      const futureBottom = sectionRect.bottom - deltaH;
      if (futureBottom < window.innerHeight) {
        const overshoot = window.innerHeight - futureBottom;
        const targetY = Math.max(0, window.scrollY - overshoot);
        window.scrollTo({ top: targetY, behavior: 'smooth' });
      }
    }
  };

  const toggleGroupExpand = (nodesInGroup: ExperienceFlowNode[], company: string) => {
    // If ANY node in the group is expanded, collapse all.
    // If NO nodes are expanded, expand all.
    const isAnyExpanded = nodesInGroup.some(node => expandedNodes[node.id]);
    
    if (isAnyExpanded) {
      const groupId = `exp-group-${company.replace(/\s+/g, '-').toLowerCase()}`;
      const el = document.getElementById(groupId);
      const sec = document.getElementById('experience');
      anchorSectionOnCollapse(el, sec, HEADER_OFFSET);
    }

    setExpandedNodes(prev => {
      const next = { ...prev };
      nodesInGroup.forEach(node => {
        next[node.id] = !isAnyExpanded;
      });
      return next;
    });
  };

  const handleGroupMouseEnter = (nodesInGroup: ExperienceFlowNode[]) => {
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    setExpandedNodes(prev => {
      const next = { ...prev };
      nodesInGroup.forEach(node => {
        next[node.id] = true;
      });
      return next;
    });
  };

  const handleGroupMouseLeave = (nodesInGroup: ExperienceFlowNode[], company: string) => {
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    
    // Check if this group was actually expanded
    const isAnyExpanded = nodesInGroup.some(node => !!expandedNodes[node.id]);
    if (!isAnyExpanded) return;

    const groupId = `exp-group-${company.replace(/\s+/g, '-').toLowerCase()}`;
    const el = document.getElementById(groupId);
    const sec = document.getElementById('experience');
    anchorSectionOnCollapse(el, sec, HEADER_OFFSET);

    setExpandedNodes(prev => {
      const next = { ...prev };
      nodesInGroup.forEach(node => {
        delete next[node.id];
      });
      return next;
    });
  };

  const getLogoFilterClass = (contrast?: 'none' | 'invert-in-dark' | 'invert-in-light', invertInDark?: boolean, companyName?: string) => {
    if (contrast === 'invert-in-dark' || invertInDark) {
      return 'dark:brightness-0 dark:invert';
    }
    if (contrast === 'invert-in-light') {
      return 'brightness-0 dark:filter-none';
    }
    if (companyName && /culture/i.test(companyName)) {
      return 'dark:brightness-0 dark:invert';
    }
    return '';
  };

  // Sort nodes based on order (newest first)
  const sortedNodes = [...nodes].sort((a, b) => {
    const yearA = a.startYear;
    const yearB = b.startYear;
    return sortOrder === 'newest' ? yearB - yearA : yearA - yearB;
  });

  // Group nodes by company while preserving the general order (newest first)
  const groupedExperiences: { 
    company: string; 
    companyLogoUrl?: string; 
    companyLogoInvertInDark?: boolean;
    companyLogoContrast?: 'none' | 'invert-in-dark' | 'invert-in-light';
    location: string; 
    startYear: number; 
    endYear: number | 'Present'; 
    nodes: ExperienceFlowNode[] 
  }[] = [];
  
  sortedNodes.forEach(node => {
    // Attempt to find an existing group for this company
    const existingGroup = groupedExperiences.find(g => g.company.trim().toLowerCase() === node.company.trim().toLowerCase());
    const isCulture = node.company?.toLowerCase().includes('culture');
    const invertInDark = node.companyLogoInvertInDark ?? isCulture;
    const contrast = node.companyLogoContrast || (invertInDark ? 'invert-in-dark' : 'none');

    if (existingGroup) {
      existingGroup.nodes.push(node);
      if (node.companyLogoUrl && !existingGroup.companyLogoUrl) {
        existingGroup.companyLogoUrl = node.companyLogoUrl;
      }
      if (node.companyLogoInvertInDark !== undefined) {
        existingGroup.companyLogoInvertInDark = node.companyLogoInvertInDark;
      }
      if (node.companyLogoContrast) {
        existingGroup.companyLogoContrast = node.companyLogoContrast;
      }
      // Update startYear to the earliest
      if (node.startYear < existingGroup.startYear) {
        existingGroup.startYear = node.startYear;
      }
      // Update endYear if it's 'Present' or a later year
      if (existingGroup.endYear !== 'Present') {
         if (node.endYear === 'Present' || (typeof node.endYear === 'number' && node.endYear > existingGroup.endYear)) {
             existingGroup.endYear = node.endYear;
         }
      }
    } else {
      groupedExperiences.push({ 
        company: node.company, 
        companyLogoUrl: node.companyLogoUrl,
        companyLogoInvertInDark: invertInDark,
        companyLogoContrast: contrast,
        location: node.location, 
        startYear: node.startYear,
        endYear: node.endYear,
        nodes: [node] 
      });
    }
  });

  return (
    <section id="experience" className="py-12 md:py-16 border-b border-stone-200 dark:border-stone-800" style={{ overflowAnchor: 'none' }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-8">
        
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="flex items-center justify-between"
        >
          <h2 id="experience-heading" className="text-2xl sm:text-3xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
            Work Experience
          </h2>
        </motion.div>

        {/* EXPERIENCE CARDS */}
        <div id="experience-flowchart-container" className="relative py-2" style={{ overflowAnchor: 'none' }}>
          {groupedExperiences.length === 0 ? (
            <div className="bg-stone-50 dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-700 p-8 text-center text-stone-500 text-sm">
              No career milestones found.
            </div>
          ) : (
            <div className="space-y-6 md:space-y-8 py-4">
              {groupedExperiences.map((group, idx) => {
                const isThisGroupExpanded = group.nodes.some(node => expandedNodes[node.id]);
                const groupDomId = `exp-group-${group.company.replace(/\s+/g, '-').toLowerCase()}`;

                return (
                  <motion.div 
                    key={group.company}
                    id={groupDomId}
                    layout="position"
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-50px' }}
                    transition={{ 
                      duration: 0.5, 
                      delay: idx * 0.1, 
                      ease: [0.16, 1, 0.3, 1],
                      layout: { duration: 0.35, ease: [0.16, 1, 0.3, 1] }
                    }}
                    onMouseEnter={() => handleGroupMouseEnter(group.nodes)}
                    onMouseLeave={() => handleGroupMouseLeave(group.nodes, group.company)}
                    style={{ overflowAnchor: 'none' }}
                    className={`group/card bg-white dark:bg-[#1a1a1e] rounded-2xl border-2 border-stone-200/90 dark:border-stone-700/90 overflow-hidden shadow-md dark:shadow-[0_4px_24px_-2px_rgba(0,0,0,0.6)] transition-all duration-300 ease-out origin-center ${
                      isThisGroupExpanded 
                        ? 'scale-[1.006] shadow-xl dark:shadow-[0_12px_36px_-4px_rgba(0,0,0,0.85)] ring-2 ring-stone-900/10 dark:ring-stone-400/20 border-stone-400 dark:border-stone-500 relative z-20' 
                        : 'relative z-10 hover:border-stone-300 dark:hover:border-stone-600 hover:shadow-lg hover:scale-[1.004]'
                    }`}
                  >
                  {/* Group Header - Clickable with high-contrast background */}
                  <div 
                    role="button"
                    tabIndex={0}
                    onClick={() => toggleGroupExpand(group.nodes, group.company)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        toggleGroupExpand(group.nodes, group.company);
                      }
                    }}
                    className="p-4 sm:p-5 border-b-2 border-stone-200/90 dark:border-stone-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-stone-100/90 dark:bg-[#232328] cursor-pointer hover:bg-stone-200/80 dark:hover:bg-[#2b2b31] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-400 group/header"
                  >
                    <div>
                      {group.companyLogoUrl ? (
                        <div className="h-7 flex items-center mb-1.5">
                          <img 
                            src={group.companyLogoUrl} 
                            alt={group.company} 
                            className={`h-7 w-auto object-contain object-left transition-all duration-250 ease-out origin-left group-hover/card:scale-108 drop-shadow-none group-hover/card:drop-shadow-[0_4px_8px_rgba(0,0,0,0.12)] dark:group-hover/card:drop-shadow-[0_4px_10px_rgba(255,255,255,0.2)] ${getLogoFilterClass(
                              group.companyLogoContrast,
                              group.companyLogoInvertInDark,
                              group.company
                            )}`}
                            loading="lazy"
                          />
                        </div>
                      ) : (
                        <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100 transition-colors group-hover/header:text-blue-600 dark:group-hover/header:text-blue-400">
                          {group.company}
                        </h3>
                      )}
                      <div className="flex items-center gap-2 text-xs text-stone-600 dark:text-stone-400 mt-1 font-medium">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-stone-500 dark:text-stone-400" />
                          {group.location}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 sm:gap-4">
                      <div className="text-xs font-semibold text-stone-800 dark:text-stone-200 font-mono bg-white dark:bg-[#161619] px-3.5 py-1.5 rounded-lg border border-stone-300 dark:border-stone-600 shadow-2xs">
                        {group.startYear} – {group.endYear === 'Present' ? <span className="text-blue-600 dark:text-blue-400 font-bold">Present</span> : group.endYear}
                      </div>
                      <div className="w-8 h-8 rounded-lg bg-white dark:bg-[#161619] border border-stone-300 dark:border-stone-600 hidden sm:flex items-center justify-center text-stone-500 dark:text-stone-400 group-hover/header:text-stone-900 dark:group-hover/header:text-white shadow-2xs transition-colors">
                        <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${isThisGroupExpanded ? 'rotate-180 text-stone-900 dark:text-white' : ''}`} />
                      </div>
                    </div>
                  </div>

                  {/* Milestones inside the card */}
                  <div className="divide-y-2 divide-stone-100 dark:divide-stone-800/80">
                    {group.nodes.map((node) => {
                      const isExpanded = !!expandedNodes[node.id];
                      
                      return (
                        <div key={node.id} id={`exp-node-${node.id}`} className="group/milestone bg-white dark:bg-[#18181b]">
                          <div 
                            role="button"
                            tabIndex={0}
                            aria-expanded={isExpanded}
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleExpand(node.id);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                toggleExpand(node.id);
                              }
                            }}
                            className="p-4 sm:p-6 cursor-pointer hover:bg-stone-50/90 dark:hover:bg-[#202024]/70 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-400"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-2.5 flex-wrap">
                                  <h4 className="font-bold text-base text-stone-900 dark:text-stone-100 group-hover/milestone:text-blue-600 dark:group-hover/milestone:text-blue-400 transition-colors">
                                    {node.role}
                                  </h4>
                                  <div className="text-xs text-stone-600 dark:text-stone-300 font-mono font-medium flex items-center gap-1.5 bg-stone-100 dark:bg-[#232328] px-2.5 py-1 rounded-md border border-stone-200 dark:border-stone-700/80">
                                    <Calendar className="w-3.5 h-3.5 text-stone-500 dark:text-stone-400" />
                                    {node.period.includes('Present') ? (
                                      <span>
                                        {node.period.replace('Present', '').trim()}{' '}
                                        <span className="text-blue-600 dark:text-blue-400 font-bold">Present</span>
                                      </span>
                                    ) : (
                                      node.period
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 bg-stone-100 dark:bg-[#232328] border border-stone-200 dark:border-stone-700 text-stone-500 dark:text-stone-400 group-hover/milestone:bg-stone-200 dark:group-hover/milestone:bg-stone-700 group-hover/milestone:text-stone-900 dark:group-hover/milestone:text-white transition-colors">
                                <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-180 text-stone-900 dark:text-white' : ''}`} />
                              </div>
                            </div>

                            {/* Extended Details Dropdown */}
                            <AnimatePresence initial={false}>
                              {isExpanded && (
                                <motion.div 
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: 'auto' }}
                                  exit={{ opacity: 0, height: 0 }}
                                  transition={{ 
                                    height: { duration: 0.32, ease: [0.16, 1, 0.3, 1] },
                                    opacity: { duration: 0.22, ease: 'easeOut' }
                                  }}
                                  className="overflow-hidden"
                                >
                                  <div className="pt-5 mt-4 border-t-2 border-stone-100 dark:border-stone-800/80">
                                    <div className="bg-stone-50/75 dark:bg-[#141416] p-4 sm:p-6 rounded-xl border border-stone-200/90 dark:border-stone-800/90 shadow-2xs">
                                      <div className={`gap-6 ${node.imageUrl && node.imageLayout === 'landscape-top' ? 'flex flex-col' : 'grid grid-cols-1 lg:grid-cols-[1fr_minmax(200px,320px)]'}`}>
                                        {node.imageUrl && node.imageLayout === 'landscape-top' && (
                                          <div className="w-full h-48 sm:h-64 rounded-xl overflow-hidden border-2 border-stone-200 dark:border-stone-700 bg-stone-100 dark:bg-stone-800 relative shadow-xs">
                                            <img 
                                              src={node.imageUrl} 
                                              alt={node.role} 
                                              className="absolute inset-0 w-full h-full object-cover object-center"
                                              referrerPolicy="no-referrer"
                                            />
                                          </div>
                                        )}

                                        <div className={`space-y-4 ${node.imageUrl && node.imageLayout === 'landscape-top' ? '' : 'order-2 lg:order-1'}`}>
                                          {/* Summary */}
                                          {node.summary && (
                                            <p className="text-sm text-stone-700 dark:text-stone-300 leading-relaxed font-normal">
                                              {node.summary}
                                            </p>
                                          )}

                                          {/* Decision Context for Pivots */}
                                          {node.decisionContext && (
                                            <div className="bg-white dark:bg-[#202025] p-3.5 rounded-lg border border-stone-200 dark:border-stone-700 space-y-1.5 shadow-2xs">
                                              <span className="text-[10px] font-mono uppercase text-stone-500 dark:text-stone-400 font-semibold tracking-wider flex items-center gap-1.5">
                                                <GitBranch className="w-3 h-3 text-stone-400" />
                                                Context
                                              </span>
                                              <p className="text-stone-800 dark:text-stone-200 text-xs leading-relaxed">
                                                {node.decisionContext}
                                              </p>
                                            </div>
                                          )}

                                          {/* Quantitative Metrics */}
                                          {node.metrics && (
                                            <div className="bg-stone-900 dark:bg-[#101012] text-stone-100 p-3.5 rounded-lg flex items-start gap-2.5 border border-stone-800 dark:border-stone-700/80 shadow-xs">
                                              <TrendingUp className="w-3.5 h-3.5 text-blue-400 mt-0.5 shrink-0" />
                                              <div className="space-y-0.5">
                                                <span className="text-[10px] font-mono text-stone-400 uppercase tracking-wider block font-semibold">Key Impact & Scale</span>
                                                <p className="text-xs text-stone-200">{node.metrics}</p>
                                              </div>
                                            </div>
                                          )}

                                          {/* Bullet points format */}
                                          {node.highlights && node.highlights.length > 0 && (
                                            <ul className="space-y-2.5">
                                              {node.highlights.map((item, idx) => (
                                                <li key={idx} className="flex items-start gap-3 text-stone-700 dark:text-stone-200 leading-relaxed text-sm">
                                                  <span className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400 mt-2 shrink-0" />
                                                  <span>{item}</span>
                                                </li>
                                              ))}
                                            </ul>
                                          )}
                                        </div>

                                        {/* Optional Image (Portrait Right default) */}
                                        {node.imageUrl && node.imageLayout !== 'landscape-top' && (
                                          <div className="order-1 lg:order-2 w-full h-48 lg:h-full lg:min-h-[200px] rounded-xl overflow-hidden border-2 border-stone-200 dark:border-stone-700 bg-stone-100 dark:bg-stone-800 relative self-start shadow-xs">
                                            <img 
                                              src={node.imageUrl} 
                                              alt={node.role} 
                                              className="absolute inset-0 w-full h-full object-cover object-center"
                                              referrerPolicy="no-referrer"
                                            />
                                          </div>
                                        )}
                                      </div>

                                      {/* Bottom Collapse Button */}
                                      <div className="pt-4 mt-4 text-center border-t border-stone-200/80 dark:border-stone-800">
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            toggleExpand(node.id);
                                          }}
                                          className="inline-flex items-center gap-1.5 text-xs text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white font-medium py-1.5 px-4 rounded-lg bg-white dark:bg-[#202025] border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-700 transition-colors shadow-2xs cursor-pointer"
                                        >
                                          <ChevronDown className="w-3.5 h-3.5 rotate-180" />
                                          <span>Collapse details</span>
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              );
            })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
