import React, { useState, useEffect } from 'react';
import { initialProfile, initialExperienceNodes, initialProjects, initialSkills, initialSections } from './data/initialData';
import { Profile, ExperienceFlowNode, Project, SkillCategory, SectionConfig } from './types';
import { ChaptersBar } from './components/ChaptersBar';
import { Hero } from './components/Hero';
import { WorkExperienceFlowchart } from './components/WorkExperienceFlowchart';
import { ProjectsSection } from './components/ProjectsSection';
import { SkillsSection } from './components/SkillsSection';
import { Footer } from './components/Footer';
import { EditProfileModal } from './components/EditProfileModal';
import { AuthModal, AUTHORIZED_OWNER_EMAIL } from './components/AuthModal';
import { ResumeModal } from './components/ResumeModal';

const STORAGE_KEY = 'digital_portfolio_pde_v2';

export default function App() {
  const [profile, setProfile] = useState<Profile>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.profile && !parsed.profile.title?.includes('Distributed')) {
          let mergedStats = parsed.profile.stats;
          if (mergedStats && !Array.isArray(mergedStats)) {
            // migrate old stats object to array
            mergedStats = [
              { label: 'Years Experience', value: `${mergedStats.yearsExperience || 0}+` },
              { label: 'Mass Production', value: mergedStats.systemsScaled || '' },
              { label: 'NPI Programs', value: `${mergedStats.projectsShipped || 0}` },
              { label: 'Tooling Builds', value: mergedStats.openSourceStars || '' }
            ];
          }
          // Merge with initialProfile to pick up any new properties like avatarUrl and resumeUrl
          const mergedProfile = { 
            ...initialProfile, 
            ...parsed.profile, 
            avatarUrl: parsed.profile.avatarUrl || initialProfile.avatarUrl,
            resumeUrl: (parsed.profile.resumeUrl && parsed.profile.resumeUrl.trim() !== '') ? parsed.profile.resumeUrl : (initialProfile.resumeUrl || '/resume.pdf')
          };
          mergedProfile.stats = mergedStats || initialProfile.stats;
          return mergedProfile;
        }
      } catch (e) {
        console.error('Error loading saved profile', e);
      }
    }
    return initialProfile;
  });

  const [experienceNodes, setExperienceNodes] = useState<ExperienceFlowNode[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.experienceNodes) return parsed.experienceNodes;
      } catch (e) {
        console.error('Error loading saved experience nodes', e);
      }
    }
    return initialExperienceNodes;
  });

  const [projects, setProjects] = useState<Project[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.projects && Array.isArray(parsed.projects)) {
          return parsed.projects.map((p: Project) => {
            const defaultMatch = initialProjects.find((ip) => ip.id === p.id);
            return {
              ...p,
              imageUrl: p.imageUrl || defaultMatch?.imageUrl || 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?q=80&w=1200&auto=format&fit=crop',
              images: (p.images && p.images.length > 0) ? p.images : (defaultMatch?.images || [p.imageUrl || defaultMatch?.imageUrl || 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?q=80&w=1200&auto=format&fit=crop'])
            };
          });
        }
      } catch (e) {
        console.error('Error loading saved projects', e);
      }
    }
    return initialProjects;
  });

  const [skills, setSkills] = useState<SkillCategory[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.skills) return parsed.skills;
      } catch (e) {
        console.error('Error loading saved skills', e);
      }
    }
    return initialSkills;
  });

  const [sections, setSections] = useState<SectionConfig[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.sections) return parsed.sections;
      } catch (e) {
        console.error('Error loading saved sections', e);
      }
    }
    return initialSections;
  });

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isResumeModalOpen, setIsResumeModalOpen] = useState(false);

  // Authorization check: only authorized user (saahiressa@gmail.com) can edit
  const [isAuthorized, setIsAuthorized] = useState<boolean>(() => {
    const saved = localStorage.getItem('portfolio_owner_authorized');
    if (saved !== null) {
      return saved === 'true';
    }
    // Default to authorized in this active environment for the creator
    localStorage.setItem('portfolio_owner_authorized', 'true');
    return true;
  });

  const handleOpenEdit = () => {
    if (isAuthorized) {
      setIsEditModalOpen(true);
    } else {
      setIsAuthModalOpen(true);
    }
  };

  const handleLock = () => {
    setIsAuthorized(false);
    localStorage.setItem('portfolio_owner_authorized', 'false');
    setIsEditModalOpen(false);
  };

  const handleAuthSuccess = () => {
    setIsAuthorized(true);
    setIsAuthModalOpen(false);
    setIsEditModalOpen(true);
  };

  // Sync to localStorage and write to source file src/data/initialData.ts
  const handleSaveData = async (data: {
    profile: Profile;
    experienceNodes: ExperienceFlowNode[];
    projects: Project[];
    skills: SkillCategory[];
    sections: SectionConfig[];
  }) => {
    if (!isAuthorized) {
      alert(`Access denied. Only the authorized owner (${AUTHORIZED_OWNER_EMAIL}) is permitted to save changes.`);
      return;
    }
    setProfile(data.profile);
    setExperienceNodes(data.experienceNodes);
    setProjects(data.projects);
    setSkills(data.skills);
    setSections(data.sections);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));

    // Automatically sync directly into source file src/data/initialData.ts
    try {
      await fetch('/api/sync-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
    } catch (e) {
      console.warn('Failed to sync data to initialData.ts', e);
    }
  };

  // On mount, sync current state to source file if localStorage has modifications
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.profile) {
          fetch('/api/sync-data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              profile: parsed.profile,
              experienceNodes: parsed.experienceNodes || experienceNodes,
              projects: parsed.projects || projects,
              skills: parsed.skills || skills,
              sections: parsed.sections || sections
            }),
          })
          .then((r) => r.json())
          .then((d) => console.log('Synced localStorage to initialData.ts:', d))
          .catch((err) => console.warn('Could not sync to initialData.ts', err));
        }
      } catch (e) {}
    }
  }, []);

  const handleResetData = () => {
    if (!isAuthorized) {
      alert(`Access denied. Only the authorized owner (${AUTHORIZED_OWNER_EMAIL}) is permitted to reset data.`);
      return;
    }
    localStorage.removeItem(STORAGE_KEY);
    setProfile(initialProfile);
    setExperienceNodes(initialExperienceNodes);
    setProjects(initialProjects);
    setSkills(initialSkills);
    setSections(initialSections);
  };

  const renderSection = (section: SectionConfig) => {
    if (!section.visible) return null;
    switch (section.type) {
      case 'hero':
        return <Hero key={section.id} profile={profile} onOpenResume={() => setIsResumeModalOpen(true)} />;
      case 'experience':
        return <WorkExperienceFlowchart key={section.id} nodes={experienceNodes} />;
      case 'projects':
        return <ProjectsSection key={section.id} projects={projects} />;
      case 'skills':
        return <SkillsSection key={section.id} skills={skills} />;
      case 'custom':
        return (
          <section id={section.id} key={section.id} className="py-12 md:py-16 border-b border-stone-200 dark:border-stone-800">
            <div className="max-w-6xl mx-auto px-4 sm:px-6">
              <h2 className="text-3xl font-bold mb-8 text-stone-900 dark:text-stone-100">{section.title}</h2>
              {section.content && (
                <div 
                  className="prose dark:prose-invert max-w-none text-stone-600 dark:text-stone-400" 
                  dangerouslySetInnerHTML={{ __html: section.content }} 
                />
              )}
            </div>
          </section>
        );
      default:
        return null;
    }
  };

  // Sort sections by order
  const sortedSections = [...sections].sort((a, b) => a.order - b.order);

  const handleUpdateResumeUrl = async (newUrl: string) => {
    const cleanUrl = newUrl?.trim() || '/resume.pdf';
    const updatedProfile: Profile = { ...profile, resumeUrl: cleanUrl };
    setProfile(updatedProfile);

    // Persist full portfolio state to localStorage
    const saved = localStorage.getItem(STORAGE_KEY);
    let fullData = {
      profile: updatedProfile,
      experienceNodes,
      projects,
      skills,
      sections
    };
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        fullData = {
          ...parsed,
          profile: updatedProfile
        };
      } catch (e) {}
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fullData));

    // Persist to server source file src/data/initialData.ts
    try {
      await fetch('/api/sync-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fullData)
      });
    } catch (err) {
      console.warn('Failed to sync updated resumeUrl to initialData.ts', err);
    }
  };

  return (
    <div id="portfolio-app-root" className="min-h-screen bg-white dark:bg-[#121212] text-stone-900 dark:text-stone-100 flex flex-col selection:bg-blue-500 selection:text-white transition-colors duration-200">
      {/* Chapters Progress Bar (Replaces traditional header) */}
      <ChaptersBar 
        sections={sortedSections.filter(s => s.visible)} 
      />

      <main id="main-content" className="flex-1">
        {sortedSections.map(renderSection)}
      </main>

      {/* Footer with discreet owner edit access */}
      <Footer 
        profile={profile} 
        onOpenEdit={handleOpenEdit}
        isAuthorized={isAuthorized}
        onLockAuth={handleLock}
      />

      {/* Interactive Resume View & Direct Download Modal (Shows untouched PDF) */}
      <ResumeModal
        isOpen={isResumeModalOpen}
        onClose={() => setIsResumeModalOpen(false)}
        profile={profile}
      />

      {/* Owner Authentication Modal for Restricted Access */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={handleAuthSuccess}
      />

      {/* Profile & Flowchart Customization Modal (accessible only to authorized owner) */}
      {isAuthorized && (
        <EditProfileModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          profile={profile}
          experienceNodes={experienceNodes}
          projects={projects}
          skills={skills}
          sections={sections}
          onSave={handleSaveData}
          onReset={handleResetData}
        />
      )}
    </div>
  );
}
