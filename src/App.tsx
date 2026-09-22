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
import { AuthModal } from './components/AuthModal';
import { ResumeModal } from './components/ResumeModal';
import { 
  subscribeToPortfolio, 
  savePortfolioToFirestore, 
  fetchPortfolioFromFirestore,
  getCurrentEnvironment,
  auth, 
  logoutFirebase, 
  AUTHORIZED_OWNER_EMAIL, 
  PortfolioData 
} from './utils/firebase';
import { 
  getAuthHeaders, 
  isLocalSessionValid, 
  clearLocalSession, 
  subscribeAuth 
} from './utils/authClient';
import { onAuthStateChanged } from 'firebase/auth';

const STORAGE_KEY = 'digital_portfolio_pde_v2';

// Ensure authentic photo of Mohammed Saahir Essa is always loaded, never placeholder unsplash headshot
export const resolveAvatarUrl = (url?: string): string => {
  if (!url || typeof url !== 'string' || url.includes('photo-1507003211169') || url.includes('unsplash.com')) {
    return '/saahir.jpg';
  }
  return url;
};

export default function App() {
  const [profile, setProfile] = useState<Profile>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.profile && !parsed.profile.title?.includes('Distributed')) {
          let mergedStats = parsed.profile.stats;
          if (mergedStats && !Array.isArray(mergedStats)) {
            mergedStats = [
              { label: 'Years Experience', value: `${mergedStats.yearsExperience || 0}+` },
              { label: 'Mass Production', value: mergedStats.systemsScaled || '' },
              { label: 'NPI Programs', value: `${mergedStats.projectsShipped || 0}` },
              { label: 'Tooling Builds', value: mergedStats.openSourceStars || '' }
            ];
          }
          const mergedProfile = { 
            ...initialProfile, 
            ...parsed.profile, 
            avatarUrl: resolveAvatarUrl(parsed.profile.avatarUrl),
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

  // Strict Authorization check: only authorized owner (saahiressa@gmail.com) can edit
  // Starts as FALSE by default on any fresh device until verified
  const [isAuthorized, setIsAuthorized] = useState<boolean>(() => {
    const saved = localStorage.getItem('portfolio_owner_authorized');
    return saved === 'true' && isLocalSessionValid();
  });

  // Helper to apply incoming cloud/server data safely to state
  const applyRemoteData = (data: PortfolioData) => {
    if (data.profile) {
      setProfile((prev) => {
        let mergedStats = data.profile.stats;
        if (mergedStats && !Array.isArray(mergedStats)) {
          mergedStats = [
            { label: 'Years Experience', value: `${(mergedStats as any).yearsExperience || 0}+` },
            { label: 'Mass Production', value: (mergedStats as any).systemsScaled || '' },
            { label: 'NPI Programs', value: `${(mergedStats as any).projectsShipped || 0}` },
            { label: 'Tooling Builds', value: (mergedStats as any).openSourceStars || '' }
          ];
        }
        return {
          ...initialProfile,
          ...data.profile,
          stats: mergedStats || prev.stats || initialProfile.stats,
          avatarUrl: resolveAvatarUrl(data.profile.avatarUrl || prev.avatarUrl),
          resumeUrl: (data.profile.resumeUrl && data.profile.resumeUrl.trim() !== '') ? data.profile.resumeUrl : (prev.resumeUrl || '/resume.pdf')
        };
      });
    }
    if (data.experienceNodes && Array.isArray(data.experienceNodes)) {
      setExperienceNodes(data.experienceNodes);
    }
    if (data.projects && Array.isArray(data.projects)) {
      setProjects(data.projects);
    }
    if (data.skills && Array.isArray(data.skills)) {
      setSkills(data.skills);
    }
    if (data.sections && Array.isArray(data.sections)) {
      setSections(data.sections);
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (_) {}
  };

  // Real-time Cloud Synchronization across all devices
  useEffect(() => {
    const env = getCurrentEnvironment();

    // App Studio always pulls the latest live data from production on startup
    if (env === 'staging') {
      fetchPortfolioFromFirestore('production')
        .then((prodData) => {
          if (prodData && prodData.profile) {
            applyRemoteData(prodData);
          }
        })
        .catch(() => {});
    }

    // 1. Subscribe to Cloud Firestore real-time updates (uses current environment with automatic fallback)
    const unsubscribeFirestore = subscribeToPortfolio(
      (cloudData) => {
        if (cloudData) {
          applyRemoteData(cloudData);
        }
      },
      (err) => {
        console.warn('Firestore real-time subscription note:', err);
      },
      env
    );

    // 2. Query fallback server API /api/portfolio-data
    fetch('/api/portfolio-data')
      .then((r) => r.json())
      .then((res) => {
        if (res && res.success && res.data) {
          applyRemoteData(res.data);
        }
      })
      .catch(() => {});

    // 3. Listen to Firebase Authentication state (Google login)
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user && user.email?.toLowerCase() === AUTHORIZED_OWNER_EMAIL.toLowerCase()) {
        setIsAuthorized(true);
        localStorage.setItem('portfolio_owner_authorized', 'true');
      }
    });

    // 4. Listen to client auth session state
    const unsubscribeClientAuth = subscribeAuth((isAuth) => {
      setIsAuthorized(isAuth);
    });

    return () => {
      unsubscribeFirestore();
      unsubscribeAuth();
      unsubscribeClientAuth();
    };
  }, []);

  const handleOpenEdit = () => {
    if (isAuthorized) {
      setIsEditModalOpen(true);
    } else {
      setIsAuthModalOpen(true);
    }
  };

  const handleLock = async () => {
    setIsAuthorized(false);
    clearLocalSession();
    await logoutFirebase();
    setIsEditModalOpen(false);
  };

  const handleAuthSuccess = () => {
    setIsAuthorized(true);
    setIsAuthModalOpen(false);
    setIsEditModalOpen(true);
  };

  // Sync to Cloud Firestore and localStorage
  // In App Studio, edits are isolated to staging and do NOT propagate to live production
  const handleSaveData = async (data: {
    profile: Profile;
    experienceNodes: ExperienceFlowNode[];
    projects: Project[];
    skills: SkillCategory[];
    sections: SectionConfig[];
  }) => {
    if (!isAuthorized) {
      alert('Access denied. Administrator privileges are required to save changes.');
      return;
    }

    setProfile(data.profile);
    setExperienceNodes(data.experienceNodes);
    setProjects(data.projects);
    setSkills(data.skills);
    setSections(data.sections);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));

    const env = getCurrentEnvironment();

    // 1. Save to Cloud Firestore
    // When editing in App Studio (staging), saves to isolated staging so changes do NOT propagate to live production
    try {
      await savePortfolioToFirestore(data, env);
    } catch (cloudErr) {
      console.warn('Failed to save to Cloud Firestore:', cloudErr);
    }

    // 2. Only sync server codebase if directly editing in production
    if (env === 'production') {
      try {
        await fetch('/api/sync-data', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            ...getAuthHeaders()
          },
          body: JSON.stringify(data),
        });
      } catch (e) {
        console.warn('Failed to sync data to backend server', e);
      }
    }
  };

  const handleResetData = async () => {
    if (!isAuthorized) {
      alert('Access denied. Administrator privileges are required to reset data.');
      return;
    }
    localStorage.removeItem(STORAGE_KEY);
    setProfile(initialProfile);
    setExperienceNodes(initialExperienceNodes);
    setProjects(initialProjects);
    setSkills(initialSkills);
    setSections(initialSections);

    const defaultData = {
      profile: initialProfile,
      experienceNodes: initialExperienceNodes,
      projects: initialProjects,
      skills: initialSkills,
      sections: initialSections,
    };

    try {
      await savePortfolioToFirestore(defaultData);
      await fetch('/api/sync-data', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify(defaultData),
      });
    } catch (_) {}
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
      {isAuthorized && isEditModalOpen && (
        <EditProfileModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          profile={profile}
          experienceNodes={experienceNodes}
          projects={projects}
          skills={skills}
          sections={sections}
          onSave={handleSaveData}
        />
      )}
    </div>
  );
}

