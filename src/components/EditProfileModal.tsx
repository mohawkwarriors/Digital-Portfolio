import React, { useState, useEffect } from 'react';
import { 
  X, 
  Save, 
  RotateCcw, 
  Download, 
  Upload, 
  Plus, 
  Trash2, 
  Sparkles, 
  User, 
  Briefcase, 
  FolderGit2,
  Check,
  Copy,
  RefreshCw,
  ShieldCheck,
  Lock,
  Key,
  Wrench,
  LayoutList,
  GripVertical,
  Eye,
  EyeOff,
  ArrowUp,
  ArrowDown,
  FileText,
  FileCheck,
  ExternalLink,
  Database,
  AlertCircle,
  History,
  FileJson
} from 'lucide-react';
import { Profile, ExperienceFlowNode, Project, SkillCategory, SectionConfig } from '../types';
import { AUTHORIZED_OWNER_EMAIL } from './AuthModal';
import { saveResumePdf, getResumePdf, clearResumePdf, StoredPdfRecord } from '../utils/pdfStorage';
import { ImageUploadField } from './ImageUploadField';
import { MultiImageGalleryUpload } from './MultiImageGalleryUpload';
import { normalizeProjectLinks } from '../utils/projectLinks';

export interface LocalSnapshot {
  id: string;
  timestamp: number;
  label: string;
  itemCounts?: {
    projects: number;
    experiences: number;
    skills: number;
  };
  data: {
    profile: Profile;
    experienceNodes: ExperienceFlowNode[];
    projects: Project[];
    skills: SkillCategory[];
    sections: SectionConfig[];
  };
}

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: Profile;
  experienceNodes: ExperienceFlowNode[];
  projects: Project[];
  skills: SkillCategory[];
  sections: SectionConfig[];
  onSave: (data: { profile: Profile; experienceNodes: ExperienceFlowNode[]; projects: Project[]; skills: SkillCategory[]; sections: SectionConfig[] }) => void;
  onReset?: () => void;
}

interface RoleItem {
  id: string;
  role: string;
  period: string;
  imageUrl?: string;
  imageLayout?: 'landscape-top' | 'portrait-right';
  highlights: string[];
}

interface ExperienceCard {
  id: string;
  company: string;
  companyLogoUrl?: string;
  companyLogoContrast?: 'none' | 'invert-in-dark' | 'invert-in-light';
  companyLogoInvertInDark?: boolean;
  location: string;
  roles: RoleItem[];
}

const parsePeriodYears = (period: string): { startYear: number; endYear: number | 'Present' } => {
  const currentYear = new Date().getFullYear();
  if (!period || typeof period !== 'string') {
    return { startYear: currentYear, endYear: 'Present' };
  }
  const numbers = period.match(/\b(19\d\d|20\d\d)\b/g);
  const isPresent = /present/i.test(period);
  
  const startYear = numbers && numbers.length > 0 ? parseInt(numbers[0], 10) : currentYear;
  const endYear: number | 'Present' = isPresent ? 'Present' : (numbers && numbers.length > 1 ? parseInt(numbers[1], 10) : startYear);

  return { startYear, endYear };
};

const groupNodesIntoCards = (nodes: ExperienceFlowNode[]): ExperienceCard[] => {
  const cards: ExperienceCard[] = [];
  nodes.forEach((node, idx) => {
    const comp = (node.company || 'Organization').trim();
    let card = cards.find(c => c.company.trim().toLowerCase() === comp.toLowerCase());
    const isCulture = comp.toLowerCase().includes('culture');
    const invertInDark = node.companyLogoInvertInDark ?? isCulture;
    const contrast = node.companyLogoContrast || (invertInDark ? 'invert-in-dark' : 'none');

    if (!card) {
      card = {
        id: `card-${idx}-${Date.now()}`,
        company: node.company || '',
        companyLogoUrl: node.companyLogoUrl || '',
        companyLogoContrast: contrast,
        companyLogoInvertInDark: invertInDark,
        location: node.location || '',
        roles: []
      };
      cards.push(card);
    } else {
      if (node.companyLogoContrast) card.companyLogoContrast = node.companyLogoContrast;
      if (node.companyLogoInvertInDark !== undefined) card.companyLogoInvertInDark = node.companyLogoInvertInDark;
    }
    card.roles.push({
      id: node.id || `role-${idx}-${Date.now()}`,
      role: node.role || '',
      period: node.period || '',
      imageUrl: node.imageUrl || '',
      imageLayout: node.imageLayout || 'portrait-right',
      highlights: Array.isArray(node.highlights) && node.highlights.length > 0 
        ? [...node.highlights] 
        : ['']
    });
  });
  return cards;
};

const flattenCardsToNodes = (cards: ExperienceCard[]): ExperienceFlowNode[] => {
  const nodes: ExperienceFlowNode[] = [];
  cards.forEach(card => {
    card.roles.forEach(r => {
      const { startYear, endYear } = parsePeriodYears(r.period);
      const isCurrent = typeof r.period === 'string' && r.period.toLowerCase().includes('present');
      nodes.push({
        id: r.id || `exp-${Date.now()}-${Math.random().toString(36).substr(2, 7)}`,
        company: card.company.trim() || 'Organization',
        companyLogoUrl: card.companyLogoUrl?.trim() || undefined,
        companyLogoInvertInDark: card.companyLogoContrast === 'invert-in-dark' || card.companyLogoInvertInDark === true,
        companyLogoContrast: card.companyLogoContrast || (card.companyLogoInvertInDark ? 'invert-in-dark' : 'none'),
        location: card.location.trim() || '',
        role: r.role.trim() || 'Role / Milestone',
        period: r.period.trim() || `${startYear} – ${endYear}`,
        imageUrl: r.imageUrl?.trim() || undefined,
        imageLayout: r.imageLayout || 'portrait-right',
        startYear,
        endYear,
        highlights: r.highlights.map(h => h.trim()).filter(Boolean),
        status: isCurrent ? 'current' : 'completed',
        summary: ''
      });
    });
  });
  return nodes;
};

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  isOpen,
  onClose,
  profile,
  experienceNodes,
  projects,
  skills,
  sections,
  onSave,
  onReset
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'experience' | 'projects' | 'skills' | 'layout' | 'backup'>('profile');
  const [editedProfile, setEditedProfile] = useState<Profile>({ ...profile });
  const [experienceCards, setExperienceCards] = useState<ExperienceCard[]>(() => groupNodesIntoCards(experienceNodes));
  const [editedProjects, setEditedProjects] = useState<Project[]>(() =>
    projects.map((p) => ({
      ...p,
      links: normalizeProjectLinks(p)
    }))
  );
  const [editedSkills, setEditedSkills] = useState<SkillCategory[]>([...skills]);
  const [editedSections, setEditedSections] = useState<SectionConfig[]>([...sections]);
  const [savedFeedback, setSavedFeedback] = useState(false);
  const [storedPdfRecord, setStoredPdfRecord] = useState<StoredPdfRecord | null>(null);
  const [isUploadingPdf, setIsUploadingPdf] = useState(false);
  const [pdfUploadMsg, setPdfUploadMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [copiedFeedback, setCopiedFeedback] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState(false);
  const [backupStatus, setBackupStatus] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [localSnapshots, setLocalSnapshots] = useState<LocalSnapshot[]>(() => {
    try {
      const saved = localStorage.getItem('portfolio_backup_snapshots');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [manualJsonInput, setManualJsonInput] = useState('');
  const [showManualJson, setShowManualJson] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setEditedProfile({ ...profile });
      setExperienceCards(groupNodesIntoCards(experienceNodes));
      setEditedProjects(
        projects.map((p) => ({
          ...p,
          links: normalizeProjectLinks(p)
        }))
      );
      setEditedSkills([...skills]);
      setEditedSections([...sections]);
      getResumePdf()
        .then((rec) => {
          if (rec) setStoredPdfRecord(rec);
        })
        .catch(() => {});
    }
  }, [isOpen, profile, experienceNodes, projects, skills, sections]);

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setPdfUploadMsg({ type: 'error', text: 'Please select a valid PDF file (.pdf).' });
      return;
    }

    setIsUploadingPdf(true);
    setPdfUploadMsg(null);

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64Data = reader.result as string;
          await saveResumePdf(base64Data, file.name);
          setStoredPdfRecord({
            dataUrl: base64Data,
            fileName: file.name,
            updatedAt: Date.now()
          });
          setEditedProfile((prev) => ({ ...prev, resumeUrl: '/resume.pdf' }));

          // Sync to server backend
          fetch('/api/upload-resume', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fileBase64: base64Data, fileName: file.name })
          }).catch(() => {});

          setPdfUploadMsg({ type: 'success', text: `Uploaded "${file.name}" successfully! It will display as the untouched PDF.` });
          setTimeout(() => setPdfUploadMsg(null), 5000);
        } catch (err) {
          setPdfUploadMsg({ type: 'error', text: 'Failed to save PDF file' });
        } finally {
          setIsUploadingPdf(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setPdfUploadMsg({ type: 'error', text: 'Error reading file' });
      setIsUploadingPdf(false);
    }
  };

  const handleClearPdf = async () => {
    await clearResumePdf();
    setStoredPdfRecord(null);
    setPdfUploadMsg({ type: 'success', text: 'Cleared custom uploaded PDF.' });
    setTimeout(() => setPdfUploadMsg(null), 3000);
  };

  const handleSave = () => {
    const finalExperienceNodes = flattenCardsToNodes(experienceCards);
    const finalProjects = editedProjects.map((p) => {
      const cleanLinks = (p.links || []).filter((l) => l.url && l.url.trim().length > 0);
      const ghLink = cleanLinks.find(
        (l) =>
          l.url.toLowerCase().includes('github') ||
          l.label.toLowerCase().includes('github') ||
          l.label.toLowerCase().includes('repo')
      );
      const liveLink = cleanLinks.find((l) => l !== ghLink);
      return {
        ...p,
        links: cleanLinks,
        githubUrl: ghLink ? ghLink.url : p.githubUrl || '',
        githubUrlLabel: ghLink ? ghLink.label : p.githubUrlLabel || '',
        liveUrl: liveLink ? liveLink.url : p.liveUrl || '',
        liveUrlLabel: liveLink ? liveLink.label : p.liveUrlLabel || ''
      };
    });
    const finalData = {
      profile: editedProfile,
      experienceNodes: finalExperienceNodes,
      projects: finalProjects,
      skills: editedSkills,
      sections: editedSections
    };
    onSave(finalData);
    saveSnapshotToStorage('Manual Save in Editor', finalData);
    setSavedFeedback(true);
    setTimeout(() => {
      setSavedFeedback(false);
      onClose();
    }, 800);
  };

  const handleAddExperienceCard = () => {
    const newCard: ExperienceCard = {
      id: `card-${Date.now()}`,
      company: '',
      location: '',
      roles: [
        {
          id: `role-${Date.now()}`,
          role: '',
          period: '2024 – Present',
          highlights: ['']
        }
      ]
    };
    setExperienceCards(prev => [newCard, ...prev]);
  };

  const handleRemoveExperienceCard = (cardId: string) => {
    setExperienceCards(prev => prev.filter(c => c.id !== cardId));
  };

  const handleCardChange = (cardId: string, field: 'company' | 'location', value: string) => {
    setExperienceCards(prev => prev.map(c => c.id === cardId ? { ...c, [field]: value } : c));
  };

  const handleAddRoleToCard = (cardId: string) => {
    setExperienceCards(prev => prev.map(c => {
      if (c.id !== cardId) return c;
      return {
        ...c,
        roles: [
          {
            id: `role-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            role: '',
            period: '',
            highlights: ['']
          },
          ...c.roles
        ]
      };
    }));
  };

  const handleRemoveRoleFromCard = (cardId: string, roleId: string) => {
    setExperienceCards(prev => prev.map(c => {
      if (c.id !== cardId) return c;
      return {
        ...c,
        roles: c.roles.filter(r => r.id !== roleId)
      };
    }));
  };

  const handleRoleChange = (cardId: string, roleId: string, field: 'role' | 'period' | 'imageUrl' | 'imageLayout', value: string) => {
    setExperienceCards(prev => prev.map(c => {
      if (c.id !== cardId) return c;
      return {
        ...c,
        roles: c.roles.map(r => r.id === roleId ? { ...r, [field]: value } : r)
      };
    }));
  };

  const handleAddBulletToRole = (cardId: string, roleId: string) => {
    setExperienceCards(prev => prev.map(c => {
      if (c.id !== cardId) return c;
      return {
        ...c,
        roles: c.roles.map(r => {
          if (r.id !== roleId) return r;
          return {
            ...r,
            highlights: [...r.highlights, '']
          };
        })
      };
    }));
  };

  const handleUpdateBulletInRole = (cardId: string, roleId: string, bulletIdx: number, value: string) => {
    setExperienceCards(prev => prev.map(c => {
      if (c.id !== cardId) return c;
      return {
        ...c,
        roles: c.roles.map(r => {
          if (r.id !== roleId) return r;
          const updated = [...r.highlights];
          updated[bulletIdx] = value;
          return { ...r, highlights: updated };
        })
      };
    }));
  };

  const handleRemoveBulletFromRole = (cardId: string, roleId: string, bulletIdx: number) => {
    setExperienceCards(prev => prev.map(c => {
      if (c.id !== cardId) return c;
      return {
        ...c,
        roles: c.roles.map(r => {
          if (r.id !== roleId) return r;
          const updated = r.highlights.filter((_, idx) => idx !== bulletIdx);
          return { ...r, highlights: updated.length === 0 ? [''] : updated };
        })
      };
    }));
  };

  const handleMoveBulletInRole = (cardId: string, roleId: string, bulletIdx: number, direction: 'up' | 'down') => {
    setExperienceCards(prev => prev.map(c => {
      if (c.id !== cardId) return c;
      return {
        ...c,
        roles: c.roles.map(r => {
          if (r.id !== roleId) return r;
          const targetIdx = direction === 'up' ? bulletIdx - 1 : bulletIdx + 1;
          if (targetIdx < 0 || targetIdx >= r.highlights.length) return r;
          const updated = [...r.highlights];
          const temp = updated[bulletIdx];
          updated[bulletIdx] = updated[targetIdx];
          updated[targetIdx] = temp;
          return { ...r, highlights: updated };
        })
      };
    }));
  };

  const handleMoveRoleInCard = (cardId: string, roleIdx: number, direction: 'up' | 'down') => {
    setExperienceCards(prev => prev.map(c => {
      if (c.id !== cardId) return c;
      const targetIdx = direction === 'up' ? roleIdx - 1 : roleIdx + 1;
      if (targetIdx < 0 || targetIdx >= c.roles.length) return c;
      const updated = [...c.roles];
      const temp = updated[roleIdx];
      updated[roleIdx] = updated[targetIdx];
      updated[targetIdx] = temp;
      return { ...c, roles: updated };
    }));
  };

  const handleMoveExperienceCard = (cardIdx: number, direction: 'up' | 'down') => {
    setExperienceCards(prev => {
      const targetIdx = direction === 'up' ? cardIdx - 1 : cardIdx + 1;
      if (targetIdx < 0 || targetIdx >= prev.length) return prev;
      const copy = [...prev];
      const temp = copy[cardIdx];
      copy[cardIdx] = copy[targetIdx];
      copy[targetIdx] = temp;
      return copy;
    });
  };

  const handleAddProject = () => {
    const newProj: Project = {
      id: `proj-${Date.now()}`,
      title: 'New Hardware Project Title',
      tagline: 'Precision mechanical & enclosure design summary',
      category: 'Consumer Hardware',
      imageUrl: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?q=80&w=1200&auto=format&fit=crop',
      images: [
        'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?q=80&w=1200&auto=format&fit=crop'
      ],
      description: 'Overview of the enclosure, mechanism, or hardware system engineered.',
      architectureOverview: 'Mechanical architecture, material selection, and tooling design.',
      challengesSolved: ['Solved critical warpage or drop impact requirement'],
      metrics: [{ label: 'Yield / Metric', value: '99.4%' }],
      techStack: ['Siemens NX', 'SolidWorks', 'DFM'],
      links: [
        { label: 'Company Website', url: 'https://example.com' }
      ],
      liveUrl: 'https://example.com',
      githubUrl: '',
      featured: true
    };
    setEditedProjects([newProj, ...editedProjects]);
  };

  const handleRemoveProject = (id: string) => {
    setEditedProjects(editedProjects.filter((p) => p.id !== id));
  };

  const handleAddMetricToProject = (projectIndex: number, defaultLabel = '', defaultValue = '') => {
    const copy = [...editedProjects];
    const currentMetrics = copy[projectIndex].metrics || [];
    copy[projectIndex] = {
      ...copy[projectIndex],
      metrics: [...currentMetrics, { label: defaultLabel, value: defaultValue }]
    };
    setEditedProjects(copy);
  };

  const handleUpdateMetricInProject = (
    projectIndex: number,
    metricIndex: number,
    field: 'label' | 'value',
    newValue: string
  ) => {
    const copy = [...editedProjects];
    const currentMetrics = [...(copy[projectIndex].metrics || [])];
    if (currentMetrics[metricIndex]) {
      currentMetrics[metricIndex] = {
        ...currentMetrics[metricIndex],
        [field]: newValue
      };
      copy[projectIndex] = {
        ...copy[projectIndex],
        metrics: currentMetrics
      };
      setEditedProjects(copy);
    }
  };

  const handleRemoveMetricFromProject = (projectIndex: number, metricIndex: number) => {
    const copy = [...editedProjects];
    const currentMetrics = [...(copy[projectIndex].metrics || [])];
    currentMetrics.splice(metricIndex, 1);
    copy[projectIndex] = {
      ...copy[projectIndex],
      metrics: currentMetrics
    };
    setEditedProjects(copy);
  };

  const handleMoveMetricInProject = (
    projectIndex: number,
    metricIndex: number,
    direction: 'up' | 'down'
  ) => {
    const copy = [...editedProjects];
    const currentMetrics = [...(copy[projectIndex].metrics || [])];
    const targetIndex = direction === 'up' ? metricIndex - 1 : metricIndex + 1;
    if (targetIndex < 0 || targetIndex >= currentMetrics.length) return;
    const temp = currentMetrics[metricIndex];
    currentMetrics[metricIndex] = currentMetrics[targetIndex];
    currentMetrics[targetIndex] = temp;
    copy[projectIndex] = {
      ...copy[projectIndex],
      metrics: currentMetrics
    };
    setEditedProjects(copy);
  };

  const handleMoveProject = (projectIndex: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? projectIndex - 1 : projectIndex + 1;
    if (targetIndex < 0 || targetIndex >= editedProjects.length) return;
    const copy = [...editedProjects];
    const temp = copy[projectIndex];
    copy[projectIndex] = copy[targetIndex];
    copy[targetIndex] = temp;
    setEditedProjects(copy);
  };

  const handleAddChallengeToProject = (projectIndex: number) => {
    const copy = [...editedProjects];
    const currentChallenges = copy[projectIndex].challengesSolved || [];
    copy[projectIndex] = {
      ...copy[projectIndex],
      challengesSolved: [...currentChallenges, '']
    };
    setEditedProjects(copy);
  };

  const handleUpdateChallengeInProject = (projectIndex: number, challengeIndex: number, value: string) => {
    const copy = [...editedProjects];
    const currentChallenges = [...(copy[projectIndex].challengesSolved || [])];
    currentChallenges[challengeIndex] = value;
    copy[projectIndex] = {
      ...copy[projectIndex],
      challengesSolved: currentChallenges
    };
    setEditedProjects(copy);
  };

  const handleRemoveChallengeFromProject = (projectIndex: number, challengeIndex: number) => {
    const copy = [...editedProjects];
    const currentChallenges = [...(copy[projectIndex].challengesSolved || [])];
    currentChallenges.splice(challengeIndex, 1);
    copy[projectIndex] = {
      ...copy[projectIndex],
      challengesSolved: currentChallenges
    };
    setEditedProjects(copy);
  };

  const handleMoveChallengeInProject = (projectIndex: number, challengeIndex: number, direction: 'up' | 'down') => {
    const copy = [...editedProjects];
    const currentChallenges = [...(copy[projectIndex].challengesSolved || [])];
    const targetIndex = direction === 'up' ? challengeIndex - 1 : challengeIndex + 1;
    if (targetIndex < 0 || targetIndex >= currentChallenges.length) return;
    const temp = currentChallenges[challengeIndex];
    currentChallenges[challengeIndex] = currentChallenges[targetIndex];
    currentChallenges[targetIndex] = temp;
    copy[projectIndex] = {
      ...copy[projectIndex],
      challengesSolved: currentChallenges
    };
    setEditedProjects(copy);
  };

  const handleAddLinkToProject = (projectIndex: number, defaultLabel = 'Company Website', defaultUrl = '') => {
    const copy = [...editedProjects];
    const currentLinks = copy[projectIndex].links || [];
    copy[projectIndex] = {
      ...copy[projectIndex],
      links: [...currentLinks, { label: defaultLabel, url: defaultUrl }]
    };
    setEditedProjects(copy);
  };

  const handleUpdateLinkInProject = (
    projectIndex: number,
    linkIndex: number,
    field: 'label' | 'url',
    newValue: string
  ) => {
    const copy = [...editedProjects];
    const currentLinks = [...(copy[projectIndex].links || [])];
    if (currentLinks[linkIndex]) {
      currentLinks[linkIndex] = {
        ...currentLinks[linkIndex],
        [field]: newValue
      };
      copy[projectIndex] = {
        ...copy[projectIndex],
        links: currentLinks
      };
      setEditedProjects(copy);
    }
  };

  const handleRemoveLinkFromProject = (projectIndex: number, linkIndex: number) => {
    const copy = [...editedProjects];
    const currentLinks = [...(copy[projectIndex].links || [])];
    currentLinks.splice(linkIndex, 1);
    copy[projectIndex] = {
      ...copy[projectIndex],
      links: currentLinks
    };
    setEditedProjects(copy);
  };

  const handleMoveLinkInProject = (
    projectIndex: number,
    linkIndex: number,
    direction: 'up' | 'down'
  ) => {
    const copy = [...editedProjects];
    const currentLinks = [...(copy[projectIndex].links || [])];
    const targetIndex = direction === 'up' ? linkIndex - 1 : linkIndex + 1;
    if (targetIndex < 0 || targetIndex >= currentLinks.length) return;
    const temp = currentLinks[linkIndex];
    currentLinks[linkIndex] = currentLinks[targetIndex];
    currentLinks[targetIndex] = temp;
    copy[projectIndex] = {
      ...copy[projectIndex],
      links: currentLinks
    };
    setEditedProjects(copy);
  };

  const handleMoveSkillCategory = (catIdx: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? catIdx - 1 : catIdx + 1;
    if (targetIdx < 0 || targetIdx >= editedSkills.length) return;
    const newSkills = [...editedSkills];
    const temp = newSkills[catIdx];
    newSkills[catIdx] = newSkills[targetIdx];
    newSkills[targetIdx] = temp;
    setEditedSkills(newSkills);
  };

  const handleMoveSkill = (catIdx: number, skillIdx: number, direction: 'up' | 'down') => {
    const newSkills = [...editedSkills];
    const targetIdx = direction === 'up' ? skillIdx - 1 : skillIdx + 1;
    const skillsInCat = [...newSkills[catIdx].skills];
    if (targetIdx < 0 || targetIdx >= skillsInCat.length) return;
    const temp = skillsInCat[skillIdx];
    skillsInCat[skillIdx] = skillsInCat[targetIdx];
    skillsInCat[targetIdx] = temp;
    newSkills[catIdx] = {
      ...newSkills[catIdx],
      skills: skillsInCat
    };
    setEditedSkills(newSkills);
  };

  const saveSnapshotToStorage = (label: string, dataToSave: any) => {
    try {
      const existingStr = localStorage.getItem('portfolio_backup_snapshots');
      const existing: LocalSnapshot[] = existingStr ? JSON.parse(existingStr) : [];
      const newSnapshot: LocalSnapshot = {
        id: `snap-${Date.now()}`,
        timestamp: Date.now(),
        label,
        itemCounts: {
          projects: dataToSave.projects?.length || 0,
          experiences: dataToSave.experienceNodes?.length || 0,
          skills: dataToSave.skills?.length || 0
        },
        data: dataToSave
      };
      // Keep up to 10 snapshots and avoid duplicates within 2 seconds
      const updated = [newSnapshot, ...existing.filter(s => Math.abs(s.timestamp - newSnapshot.timestamp) > 2000)].slice(0, 10);
      localStorage.setItem('portfolio_backup_snapshots', JSON.stringify(updated));
      setLocalSnapshots(updated);
    } catch (_) {}
  };

  const applyBackupData = (parsed: any, sourceLabel: string) => {
    if (!parsed || typeof parsed !== 'object') {
      throw new Error('Invalid backup file. Expected a JSON object.');
    }

    // Support both root data and wrapped data
    const backupData = parsed.data && typeof parsed.data === 'object' && (parsed.data.profile || parsed.data.projects)
      ? parsed.data 
      : parsed;

    const hasProfile = backupData.profile && typeof backupData.profile === 'object';
    const hasNodes = Array.isArray(backupData.experienceNodes);
    const hasProjects = Array.isArray(backupData.projects);
    const hasSkills = Array.isArray(backupData.skills);

    if (!hasProfile && !hasNodes && !hasProjects && !hasSkills) {
      throw new Error('Invalid portfolio backup file. Missing profile, projects, or experience timeline.');
    }

    if (hasProfile) {
      setEditedProfile((prev) => ({
        ...prev,
        ...backupData.profile,
        stats: backupData.profile.stats || prev.stats
      }));
    }

    if (hasNodes) {
      setExperienceCards(groupNodesIntoCards(backupData.experienceNodes));
    }

    if (hasProjects) {
      setEditedProjects(
        backupData.projects.map((p: Project) => ({
          ...p,
          links: normalizeProjectLinks(p)
        }))
      );
    }

    if (hasSkills) {
      setEditedSkills(backupData.skills);
    }

    if (Array.isArray(backupData.sections)) {
      setEditedSections(backupData.sections);
    }

    const restoredPayload = {
      profile: hasProfile ? backupData.profile : editedProfile,
      experienceNodes: hasNodes ? backupData.experienceNodes : flattenCardsToNodes(experienceCards),
      projects: hasProjects ? backupData.projects : editedProjects,
      skills: hasSkills ? backupData.skills : editedSkills,
      sections: Array.isArray(backupData.sections) ? backupData.sections : editedSections
    };

    saveSnapshotToStorage(sourceLabel, restoredPayload);

    setBackupStatus({
      type: 'success',
      text: `Backup restored successfully (${sourceLabel})! Review your changes and click "Save Changes" to publish.`
    });
    setTimeout(() => setBackupStatus(null), 6000);
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);
        applyBackupData(parsed, `Imported file: ${file.name}`);
      } catch (err: any) {
        setBackupStatus({
          type: 'error',
          text: err?.message || 'Failed to read backup file. Please select a valid JSON backup file.'
        });
      } finally {
        e.target.value = '';
      }
    };
    reader.readAsText(file);
  };

  const handleRestoreSnapshot = (snapshot: LocalSnapshot) => {
    if (confirm(`Restore snapshot "${snapshot.label}" created on ${new Date(snapshot.timestamp).toLocaleString()}?`)) {
      try {
        applyBackupData(snapshot.data, `Snapshot: ${snapshot.label}`);
      } catch (err: any) {
        setBackupStatus({ type: 'error', text: err?.message || 'Failed to restore snapshot.' });
      }
    }
  };

  const handleDeleteSnapshot = (id: string) => {
    const updated = localSnapshots.filter(s => s.id !== id);
    setLocalSnapshots(updated);
    try {
      localStorage.setItem('portfolio_backup_snapshots', JSON.stringify(updated));
    } catch (_) {}
  };

  const handleDownloadSnapshot = (snapshot: LocalSnapshot) => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(snapshot.data, null, 2));
    const downloadAnchor = document.createElement('a');
    const dateStr = new Date(snapshot.timestamp).toISOString().slice(0, 10);
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `portfolio-snapshot-${dateStr}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleApplyManualJson = () => {
    if (!manualJsonInput.trim()) return;
    try {
      const parsed = JSON.parse(manualJsonInput);
      applyBackupData(parsed, 'Direct JSON paste');
      setManualJsonInput('');
      setShowManualJson(false);
    } catch (err: any) {
      setBackupStatus({
        type: 'error',
        text: `JSON Parse Error: ${err?.message || 'Invalid JSON format'}`
      });
    }
  };

  const handleExportJSON = () => {
    const finalExperienceNodes = flattenCardsToNodes(experienceCards);
    const backupPayload = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      author: editedProfile.name,
      ownerEmail: AUTHORIZED_OWNER_EMAIL,
      profile: editedProfile,
      experienceNodes: finalExperienceNodes,
      projects: editedProjects,
      skills: editedSkills,
      sections: editedSections
    };

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(
      JSON.stringify(backupPayload, null, 2)
    );
    const downloadAnchor = document.createElement('a');
    const safeName = (editedProfile.name || 'portfolio').toLowerCase().replace(/[^a-z0-9]/g, '-');
    const dateStr = new Date().toISOString().slice(0, 10);
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `${safeName}-portfolio-backup-${dateStr}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    saveSnapshotToStorage('Manual Backup Exported', backupPayload);
    setBackupStatus({ type: 'success', text: 'Backup file downloaded successfully!' });
    setTimeout(() => setBackupStatus(null), 4000);
  };

  const handleCopyJSON = () => {
    const finalExperienceNodes = flattenCardsToNodes(experienceCards);
    const jsonStr = JSON.stringify({
      profile: editedProfile,
      experienceNodes: finalExperienceNodes,
      projects: editedProjects,
      skills: editedSkills,
      sections: editedSections
    }, null, 2);

    navigator.clipboard.writeText(jsonStr);
    setCopiedFeedback(true);
    setTimeout(() => setCopiedFeedback(false), 2000);
  };

  const handleSyncToCodebase = async () => {
    setIsSyncing(true);
    const finalExperienceNodes = flattenCardsToNodes(experienceCards);
    const payload = {
      profile: editedProfile,
      experienceNodes: finalExperienceNodes,
      projects: editedProjects,
      skills: editedSkills,
      sections: editedSections
    };
    try {
      const res = await fetch('/api/sync-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setSyncSuccess(true);
        setTimeout(() => setSyncSuccess(false), 2500);
      }
    } catch (e) {
      console.warn('Sync failed:', e);
    } finally {
      setIsSyncing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-950/80 backdrop-blur-xs animate-in fade-in"
    >
      <div 
        className="bg-white rounded-2xl border border-stone-200 shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col text-stone-900 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-stone-200 flex items-center justify-between bg-stone-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-stone-100 border border-stone-200 flex items-center justify-center text-stone-700">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-stone-900">Edit Portfolio</h2>
              <p className="text-xs text-stone-500">Edit profile info, experience timeline, and project items</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSyncToCodebase}
              disabled={isSyncing}
              type="button"
              className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg border transition-colors ${
                syncSuccess 
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                  : 'border-stone-200 hover:bg-stone-100 text-stone-700'
              }`}
              title="Sync current changes directly into source code (src/data/initialData.ts)"
            >
              {syncSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="hidden sm:inline">Synced to Code!</span>
                  <span className="sm:hidden">Synced!</span>
                </>
              ) : isSyncing ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-stone-500" />
                  <span>Syncing...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-3.5 h-3.5 text-blue-600" />
                  <span className="hidden sm:inline">Sync to Codebase</span>
                  <span className="sm:hidden">Sync</span>
                </>
              )}
            </button>

            <button
              onClick={handleCopyJSON}
              type="button"
              className="hidden sm:inline-flex items-center gap-1.5 text-xs font-mono px-2.5 py-1.5 rounded-lg border border-stone-200 hover:bg-stone-100 text-stone-600"
              title="Copy Portfolio JSON to clipboard"
            >
              {copiedFeedback ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy JSON</span>
                </>
              )}
            </button>

            <button
              onClick={handleExportJSON}
              type="button"
              className="hidden sm:inline-flex items-center gap-1.5 text-xs font-mono px-2.5 py-1.5 rounded-lg border border-stone-200 hover:bg-stone-100 text-stone-600"
              title="Export Portfolio as JSON file"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export</span>
            </button>

            <button
              onClick={onClose}
              className="p-1 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 border-b border-stone-200 bg-white flex items-center gap-2 text-xs font-medium">
          <button
            onClick={() => setActiveTab('profile')}
            className={`py-2.5 px-3 border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'profile'
                ? 'border-stone-900 text-stone-900 font-semibold'
                : 'border-transparent text-stone-500 hover:text-stone-900'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Profile & Contact</span>
          </button>

          <button
            onClick={() => setActiveTab('experience')}
            className={`py-2.5 px-3 border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'experience'
                ? 'border-stone-900 text-stone-900 font-semibold'
                : 'border-transparent text-stone-500 hover:text-stone-900'
            }`}
          >
            <Briefcase className="w-3.5 h-3.5" />
            <span>Work Experience ({experienceCards.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('projects')}
            className={`py-2.5 px-3 border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'projects'
                ? 'border-stone-900 text-stone-900 font-semibold'
                : 'border-transparent text-stone-500 hover:text-stone-900'
            }`}
          >
            <FolderGit2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Projects ({editedProjects.length})</span>
            <span className="sm:hidden">Proj.</span>
          </button>

          <button
            onClick={() => setActiveTab('skills')}
            className={`py-2.5 px-3 border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'skills'
                ? 'border-stone-900 text-stone-900 font-semibold'
                : 'border-transparent text-stone-500 hover:text-stone-900'
            }`}
          >
            <Wrench className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Skills ({editedSkills.length})</span>
            <span className="sm:hidden">Skills</span>
          </button>

          <button
            onClick={() => setActiveTab('layout')}
            className={`py-2.5 px-3 border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'layout'
                ? 'border-stone-900 text-stone-900 font-semibold'
                : 'border-transparent text-stone-500 hover:text-stone-900'
            }`}
          >
            <LayoutList className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sections</span>
            <span className="sm:hidden">Sect.</span>
          </button>

          <button
            onClick={() => setActiveTab('backup')}
            className={`py-2.5 px-3 border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'backup'
                ? 'border-stone-900 text-stone-900 font-semibold'
                : 'border-transparent text-stone-500 hover:text-stone-900'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Backup & Restore</span>
            <span className="sm:hidden">Backup</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* PROFILE TAB */}
          {activeTab === 'profile' && (
            <div className="space-y-4 text-xs sm:text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-mono text-stone-600">Full Name</label>
                  <input
                    type="text"
                    value={editedProfile.name}
                    onChange={(e) => setEditedProfile({ ...editedProfile, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-stone-200 text-stone-900 focus:ring-1 focus:ring-stone-900 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-mono text-stone-600">Professional Title</label>
                  <input
                    type="text"
                    value={editedProfile.title}
                    onChange={(e) => setEditedProfile({ ...editedProfile, title: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-stone-200 text-stone-900 focus:ring-1 focus:ring-stone-900 focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-mono text-stone-600">Tagline / Mission</label>
                <input
                  type="text"
                  value={editedProfile.tagline}
                  onChange={(e) => setEditedProfile({ ...editedProfile, tagline: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-stone-200 text-stone-900 focus:ring-1 focus:ring-stone-900 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-mono text-stone-600">Bio Description</label>
                <textarea
                  rows={3}
                  value={editedProfile.bio}
                  onChange={(e) => setEditedProfile({ ...editedProfile, bio: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-stone-200 text-stone-900 focus:ring-1 focus:ring-stone-900 focus:outline-none resize-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-mono text-stone-600">Footer Tagline</label>
                <input
                  type="text"
                  value={editedProfile.footerText || ''}
                  onChange={(e) => setEditedProfile({ ...editedProfile, footerText: e.target.value })}
                  placeholder="Optional tagline to display in the footer"
                  className="w-full px-3 py-2 rounded-lg border border-stone-200 text-stone-900 focus:ring-1 focus:ring-stone-900 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="font-mono text-stone-600">Email Address</label>
                  <input
                    type="email"
                    value={editedProfile.email}
                    onChange={(e) => setEditedProfile({ ...editedProfile, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-stone-200 text-stone-900 focus:ring-1 focus:ring-stone-900 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-mono text-stone-600">Phone</label>
                  <input
                    type="text"
                    value={editedProfile.phone}
                    onChange={(e) => setEditedProfile({ ...editedProfile, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-stone-200 text-stone-900 focus:ring-1 focus:ring-stone-900 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-mono text-stone-600">Location</label>
                  <input
                    type="text"
                    value={editedProfile.location}
                    onChange={(e) => setEditedProfile({ ...editedProfile, location: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-stone-200 text-stone-900 focus:ring-1 focus:ring-stone-900 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-mono text-stone-600">GitHub URL</label>
                  <input
                    type="text"
                    value={editedProfile.github}
                    onChange={(e) => setEditedProfile({ ...editedProfile, github: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-stone-200 text-stone-900 focus:ring-1 focus:ring-stone-900 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-mono text-stone-600">LinkedIn URL</label>
                  <input
                    type="text"
                    value={editedProfile.linkedin}
                    onChange={(e) => setEditedProfile({ ...editedProfile, linkedin: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-stone-200 text-stone-900 focus:ring-1 focus:ring-stone-900 focus:outline-none"
                  />
                </div>

                {/* Dedicated Untouched Resume PDF Upload Section */}
                <div className="p-4 rounded-xl border border-stone-200 bg-stone-50/70 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-stone-800" />
                      <span className="font-semibold text-stone-900 text-xs">Untouched Resume PDF</span>
                    </div>
                    {storedPdfRecord ? (
                      <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-mono flex items-center gap-1">
                        <FileCheck className="w-3 h-3 text-emerald-600" />
                        Active Untouched Upload
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-md bg-stone-200 text-stone-600 text-[10px] font-mono">
                        Default System PDF
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-stone-500 leading-relaxed">
                    Upload your authentic original PDF document. This is the exact, untouched PDF shown to all visitors when clicking &quot;Resume&quot;.
                  </p>

                  {/* Feedback Message */}
                  {pdfUploadMsg && (
                    <div className={`p-2.5 rounded-lg text-xs flex items-center justify-between ${
                      pdfUploadMsg.type === 'success' 
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                        : 'bg-rose-50 text-rose-800 border border-rose-200'
                    }`}>
                      <span>{pdfUploadMsg.text}</span>
                      <button type="button" onClick={() => setPdfUploadMsg(null)} className="text-xs opacity-60 hover:opacity-100">✕</button>
                    </div>
                  )}

                  {/* Upload Controls */}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-white text-xs font-medium cursor-pointer transition-colors">
                      {isUploadingPdf ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Upload className="w-3.5 h-3.5" />
                      )}
                      <span>{isUploadingPdf ? 'Uploading...' : 'Upload Original PDF'}</span>
                      <input
                        type="file"
                        accept="application/pdf,.pdf"
                        className="hidden"
                        onChange={handlePdfUpload}
                        disabled={isUploadingPdf}
                      />
                    </label>

                    {storedPdfRecord && (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            try {
                              if (storedPdfRecord?.dataUrl) {
                                const base64Part = storedPdfRecord.dataUrl.includes(',') 
                                  ? storedPdfRecord.dataUrl.split(',')[1] 
                                  : storedPdfRecord.dataUrl;
                                const binaryString = window.atob(base64Part);
                                const bytes = new Uint8Array(binaryString.length);
                                for (let i = 0; i < binaryString.length; i++) {
                                  bytes[i] = binaryString.charCodeAt(i);
                                }
                                const blob = new Blob([bytes], { type: 'application/pdf' });
                                const blobUrl = URL.createObjectURL(blob);
                                const win = window.open(blobUrl, '_blank', 'noopener,noreferrer');
                                if (!win) {
                                  window.open('/resume.pdf', '_blank', 'noopener,noreferrer');
                                }
                                setTimeout(() => URL.revokeObjectURL(blobUrl), 120000);
                                return;
                              }
                            } catch (e) {
                              console.warn('Preview error:', e);
                            }
                            window.open('/resume.pdf', '_blank', 'noopener,noreferrer');
                          }}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 text-xs font-medium transition-colors cursor-pointer"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>Preview</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleClearPdf}
                          className="px-2.5 py-1.5 rounded-lg text-stone-400 hover:text-rose-600 text-xs transition-colors cursor-pointer"
                        >
                          Reset
                        </button>
                      </>
                    )}
                  </div>

                  {storedPdfRecord && (
                    <div className="text-[11px] text-stone-500 font-mono flex items-center gap-1.5 pt-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      <span>Active File: <strong>{storedPdfRecord.fileName}</strong></span>
                    </div>
                  )}
                </div>

                <ImageUploadField
                  label="Profile Avatar Photo"
                  value={editedProfile.avatarUrl || ''}
                  onChange={(url) => setEditedProfile({ ...editedProfile, avatarUrl: url })}
                  aspectRatio="square"
                  helperText="Upload your headshot or portrait photo directly, or paste a link."
                />

                <div className="space-y-1">
                  <label className="font-mono text-stone-600">Status Badge Text</label>
                  <input
                    type="text"
                    value={editedProfile.statusBadge}
                    onChange={(e) => setEditedProfile({ ...editedProfile, statusBadge: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-stone-200 text-stone-900 focus:ring-1 focus:ring-stone-900 focus:outline-none"
                  />
                </div>
              </div>

              {/* Stats / Highlights Section */}
              <div className="pt-4 border-t border-stone-200">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-semibold text-stone-900 text-sm">Highlights / Stats</h4>
                  <button
                    type="button"
                    onClick={() => {
                      setEditedProfile({
                        ...editedProfile,
                        stats: [...editedProfile.stats, { label: 'New Stat', value: '0' }]
                      });
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-stone-900 text-white rounded-md hover:bg-stone-800 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Stat
                  </button>
                </div>
                <div className="space-y-3">
                  {editedProfile.stats.map((stat, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={stat.label}
                        placeholder="Label"
                        onChange={(e) => {
                          const newStats = [...editedProfile.stats];
                          newStats[idx].label = e.target.value;
                          setEditedProfile({ ...editedProfile, stats: newStats });
                        }}
                        className="w-1/2 px-3 py-2 rounded-lg border border-stone-200 text-stone-900 focus:ring-1 focus:ring-stone-900 focus:outline-none"
                      />
                      <input
                        type="text"
                        value={stat.value}
                        placeholder="Value"
                        onChange={(e) => {
                          const newStats = [...editedProfile.stats];
                          newStats[idx].value = e.target.value;
                          setEditedProfile({ ...editedProfile, stats: newStats });
                        }}
                        className="w-1/2 px-3 py-2 rounded-lg border border-stone-200 text-stone-900 focus:ring-1 focus:ring-stone-900 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const newStats = editedProfile.stats.filter((_, i) => i !== idx);
                          setEditedProfile({ ...editedProfile, stats: newStats });
                        }}
                        className="p-2 text-stone-400 hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Access Control & Security Section */}
              <div className="pt-4 border-t border-stone-200">
                <div className="p-4 rounded-xl border border-stone-200 bg-stone-50/70 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      <span className="font-semibold text-stone-900 text-xs">Admin Access Control</span>
                    </div>
                    <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-mono font-medium">
                      Google OAuth Protected
                    </span>
                  </div>
                  <p className="text-xs text-stone-500 leading-relaxed">
                    Portfolio modifications are protected exclusively via Google Sign-In. Only authenticated administrator accounts can unlock and edit this portfolio.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* EXPERIENCE TAB */}
          {activeTab === 'experience' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-stone-200">
                <div>
                  <h3 className="text-sm font-semibold text-stone-900">Work Experience Cards</h3>
                  <p className="text-xs text-stone-500 mt-0.5">
                    For each work experience card, add as many roles or milestones as you need with bullet points of what you did.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddExperienceCard}
                  className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-stone-900 text-white hover:bg-stone-800 transition-colors shrink-0 self-start sm:self-auto shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Work Experience</span>
                </button>
              </div>

              {experienceCards.length === 0 ? (
                <div className="p-8 text-center border border-dashed border-stone-300 rounded-xl space-y-2">
                  <p className="text-xs text-stone-500">No work experiences added yet.</p>
                  <button
                    type="button"
                    onClick={handleAddExperienceCard}
                    className="text-xs font-semibold text-stone-900 hover:underline"
                  >
                    + Add your first work experience
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  {experienceCards.map((card, cardIdx) => (
                    <div
                      key={card.id}
                      className="p-4 sm:p-5 rounded-xl border border-stone-200 bg-stone-50/80 space-y-4 relative"
                    >
                      {/* Main Card Header */}
                      <div className="flex items-center justify-between pb-3 border-b border-stone-200">
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-0.5">
                            <button
                              type="button"
                              disabled={cardIdx === 0}
                              onClick={() => handleMoveExperienceCard(cardIdx, 'up')}
                              className={`p-1 rounded transition-colors ${
                                cardIdx === 0
                                  ? 'text-stone-300 cursor-not-allowed'
                                  : 'text-stone-500 hover:text-stone-900 hover:bg-white cursor-pointer'
                              }`}
                              title="Move organization up"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              disabled={cardIdx === experienceCards.length - 1}
                              onClick={() => handleMoveExperienceCard(cardIdx, 'down')}
                              className={`p-1 rounded transition-colors ${
                                cardIdx === experienceCards.length - 1
                                  ? 'text-stone-300 cursor-not-allowed'
                                  : 'text-stone-500 hover:text-stone-900 hover:bg-white cursor-pointer'
                              }`}
                              title="Move organization down"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <span className="font-mono text-xs font-bold text-stone-600 bg-white px-2 py-0.5 rounded border border-stone-200">
                            Card 0{cardIdx + 1}
                          </span>
                          <span className="text-xs font-semibold text-stone-800 truncate max-w-[200px] sm:max-w-xs">
                            {card.company || 'Untitled Organization'}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveExperienceCard(card.id)}
                          className="text-stone-400 hover:text-red-600 p-1 transition-colors rounded hover:bg-red-50 cursor-pointer"
                          title="Delete entire work experience"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Main Card Properties: Company & Location */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div className="space-y-1">
                          <label className="font-mono text-stone-500 text-[11px]">Organization / Company</label>
                          <input
                            type="text"
                            placeholder="e.g. Lumina Hardware Labs"
                            value={card.company}
                            onChange={(e) => handleCardChange(card.id, 'company', e.target.value)}
                            className="w-full px-3 py-1.5 rounded-lg border border-stone-300 bg-white text-stone-900 focus:ring-1 focus:ring-stone-900 focus:outline-none"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="font-mono text-stone-500 text-[11px]">Location</label>
                          <input
                            type="text"
                            placeholder="e.g. San Francisco, CA"
                            value={card.location}
                            onChange={(e) => handleCardChange(card.id, 'location', e.target.value)}
                            className="w-full px-3 py-1.5 rounded-lg border border-stone-300 bg-white text-stone-900 focus:ring-1 focus:ring-stone-900 focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="text-xs space-y-2">
                        <label className="font-mono text-stone-500 text-[11px]">Company Logo URL (Optional)</label>
                        <input
                          type="text"
                          placeholder="e.g. https://example.com/logo.png"
                          value={card.companyLogoUrl || ''}
                          onChange={(e) => {
                            setExperienceCards(prev => prev.map(c => 
                              c.id === card.id ? { ...c, companyLogoUrl: e.target.value } : c
                            ));
                          }}
                          className="w-full px-3 py-1.5 rounded-lg border border-stone-300 bg-white text-stone-900 focus:ring-1 focus:ring-stone-900 focus:outline-none"
                        />
                        <p className="text-[10px] text-stone-500">A wide-format image (transparent PNG or SVG works best).</p>

                        {card.companyLogoUrl && (
                          <div className="p-3 bg-stone-50 rounded-lg border border-stone-200 space-y-2.5">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-semibold text-stone-700 font-mono">
                                Logo Dark / Light Contrast Mode
                              </span>
                              <span className="text-[10px] text-stone-400">Preview & Adjust</span>
                            </div>

                            {/* Option Buttons */}
                            <div className="grid grid-cols-3 gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setExperienceCards(prev => prev.map(c => 
                                    c.id === card.id ? { ...c, companyLogoContrast: 'none', companyLogoInvertInDark: false } : c
                                  ));
                                }}
                                className={`px-2 py-1.5 rounded-md text-[11px] font-medium border text-center transition-all ${
                                  (!card.companyLogoContrast || card.companyLogoContrast === 'none') && !card.companyLogoInvertInDark
                                    ? 'bg-stone-900 text-white border-stone-900 shadow-2xs'
                                    : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-100'
                                }`}
                              >
                                Original Colors
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setExperienceCards(prev => prev.map(c => 
                                    c.id === card.id ? { ...c, companyLogoContrast: 'invert-in-dark', companyLogoInvertInDark: true } : c
                                  ));
                                }}
                                className={`px-2 py-1.5 rounded-md text-[11px] font-medium border text-center transition-all ${
                                  card.companyLogoContrast === 'invert-in-dark' || card.companyLogoInvertInDark
                                    ? 'bg-stone-900 text-white border-stone-900 shadow-2xs'
                                    : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-100'
                                }`}
                              >
                                Invert in Dark
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setExperienceCards(prev => prev.map(c => 
                                    c.id === card.id ? { ...c, companyLogoContrast: 'invert-in-light', companyLogoInvertInDark: false } : c
                                  ));
                                }}
                                className={`px-2 py-1.5 rounded-md text-[11px] font-medium border text-center transition-all ${
                                  card.companyLogoContrast === 'invert-in-light'
                                    ? 'bg-stone-900 text-white border-stone-900 shadow-2xs'
                                    : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-100'
                                }`}
                              >
                                Invert in Light
                              </button>
                            </div>

                            <p className="text-[10px] text-stone-500">
                              {(card.companyLogoContrast === 'invert-in-dark' || card.companyLogoInvertInDark) && (
                                <span className="text-emerald-700 font-medium">✓ Inverts black logos into crisp pure white in dark mode. Light mode keeps original black.</span>
                              )}
                              {card.companyLogoContrast === 'invert-in-light' && (
                                <span className="text-emerald-700 font-medium">✓ Inverts white logos into pure black in light mode. Dark mode keeps original white.</span>
                              )}
                              {(!card.companyLogoContrast || card.companyLogoContrast === 'none') && !card.companyLogoInvertInDark && (
                                <span>Displays unmodified original logo in both light and dark modes (recommended for colored logos like Google).</span>
                              )}
                            </p>

                            {/* Side by side live preview */}
                            <div className="grid grid-cols-2 gap-2 pt-1">
                              {/* Light Preview */}
                              <div className="rounded border border-stone-200 bg-stone-100 p-2.5 flex flex-col items-center justify-center gap-1">
                                <span className="text-[9px] font-mono uppercase text-stone-500 font-semibold tracking-wider">Light Mode</span>
                                <div className="h-7 flex items-center justify-center">
                                  <img
                                    src={card.companyLogoUrl}
                                    alt="Light preview"
                                    className={`h-6 max-w-full object-contain ${
                                      card.companyLogoContrast === 'invert-in-light' ? 'brightness-0' : ''
                                    }`}
                                  />
                                </div>
                              </div>

                              {/* Dark Preview */}
                              <div className="rounded border border-stone-800 bg-[#232328] p-2.5 flex flex-col items-center justify-center gap-1">
                                <span className="text-[9px] font-mono uppercase text-stone-400 font-semibold tracking-wider">Dark Mode</span>
                                <div className="h-7 flex items-center justify-center">
                                  <img
                                    src={card.companyLogoUrl}
                                    alt="Dark preview"
                                    className={`h-6 max-w-full object-contain ${
                                      (card.companyLogoContrast === 'invert-in-dark' || card.companyLogoInvertInDark) ? 'brightness-0 invert' : ''
                                    }`}
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Roles & Milestones Sub-Section */}
                      <div className="pt-2 border-t border-stone-200/80 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-stone-700 font-mono tracking-tight">
                            Roles & Milestones ({card.roles.length})
                          </span>
                          <button
                            type="button"
                            onClick={() => handleAddRoleToCard(card.id)}
                            className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-md bg-white border border-stone-300 text-stone-700 hover:bg-stone-100 hover:text-stone-900 transition-colors shadow-2xs"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Add Role / Milestone</span>
                          </button>
                        </div>

                        <div className="space-y-3">
                          {card.roles.map((role, rIdx) => (
                            <div
                              key={role.id}
                              className="p-3.5 rounded-lg border border-stone-200 bg-white space-y-3 shadow-2xs"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                  {card.roles.length > 1 && (
                                    <div className="flex items-center gap-0.5">
                                      <button
                                        type="button"
                                        disabled={rIdx === 0}
                                        onClick={() => handleMoveRoleInCard(card.id, rIdx, 'up')}
                                        className={`p-0.5 rounded transition-colors ${
                                          rIdx === 0
                                            ? 'text-stone-300 cursor-not-allowed'
                                            : 'text-stone-500 hover:text-stone-900 hover:bg-stone-100 cursor-pointer'
                                        }`}
                                        title="Move role up"
                                      >
                                        <ArrowUp className="w-3 h-3" />
                                      </button>
                                      <button
                                        type="button"
                                        disabled={rIdx === card.roles.length - 1}
                                        onClick={() => handleMoveRoleInCard(card.id, rIdx, 'down')}
                                        className={`p-0.5 rounded transition-colors ${
                                          rIdx === card.roles.length - 1
                                            ? 'text-stone-300 cursor-not-allowed'
                                            : 'text-stone-500 hover:text-stone-900 hover:bg-stone-100 cursor-pointer'
                                        }`}
                                        title="Move role down"
                                      >
                                        <ArrowDown className="w-3 h-3" />
                                      </button>
                                    </div>
                                  )}
                                  <span className="text-[11px] font-mono font-medium text-stone-500">
                                    Role #{rIdx + 1}
                                  </span>
                                </div>
                                {card.roles.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveRoleFromCard(card.id, role.id)}
                                    className="text-stone-400 hover:text-red-600 p-1 transition-colors cursor-pointer"
                                    title="Delete this role/milestone"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>

                              {/* Role Name & Date / Range */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                                <div className="space-y-1">
                                  <label className="font-mono text-stone-500 text-[11px]">Role / Milestone Name</label>
                                  <input
                                    type="text"
                                    placeholder="e.g. Mechanical Design Engineer"
                                    value={role.role}
                                    onChange={(e) => handleRoleChange(card.id, role.id, 'role', e.target.value)}
                                    className="w-full px-2.5 py-1.5 rounded border border-stone-300 bg-white text-stone-900 focus:ring-1 focus:ring-stone-900 focus:outline-none"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="font-mono text-stone-500 text-[11px]">Date or Date Range</label>
                                  <input
                                    type="text"
                                    placeholder="e.g. 2021 – 2023 or Present"
                                    value={role.period}
                                    onChange={(e) => handleRoleChange(card.id, role.id, 'period', e.target.value)}
                                    className="w-full px-2.5 py-1.5 rounded border border-stone-300 bg-white text-stone-900 focus:ring-1 focus:ring-stone-900 focus:outline-none"
                                  />
                                </div>
                              </div>

                              <div className="pt-1">
                                <ImageUploadField
                                  label="Milestone / Mechanism Photo (Optional)"
                                  value={role.imageUrl || ''}
                                  onChange={(url) => handleRoleChange(card.id, role.id, 'imageUrl', url)}
                                  aspectRatio={role.imageLayout === 'landscape-top' ? 'wide' : 'square'}
                                  helperText="Upload a photo of the product, test fixture, or CAD assembly."
                                />
                              </div>

                              {role.imageUrl && (
                                <div className="text-xs space-y-1 pt-1">
                                  <label className="font-mono text-stone-500 text-[11px]">Image Layout</label>
                                  <div className="flex gap-2">
                                    <label className="flex items-center gap-1.5 cursor-pointer">
                                      <input 
                                        type="radio" 
                                        name={`layout-${role.id}`}
                                        checked={role.imageLayout !== 'landscape-top'}
                                        onChange={() => handleRoleChange(card.id, role.id, 'imageLayout', 'portrait-right')}
                                        className="text-stone-900 focus:ring-stone-900"
                                      />
                                      <span>Portrait (Right)</span>
                                    </label>
                                    <label className="flex items-center gap-1.5 cursor-pointer">
                                      <input 
                                        type="radio" 
                                        name={`layout-${role.id}`}
                                        checked={role.imageLayout === 'landscape-top'}
                                        onChange={() => handleRoleChange(card.id, role.id, 'imageLayout', 'landscape-top')}
                                        className="text-stone-900 focus:ring-stone-900"
                                      />
                                      <span>Landscape (Top)</span>
                                    </label>
                                  </div>
                                </div>
                              )}

                              {/* What I Did - Bullet points format */}
                              <div className="space-y-2 pt-1">
                                <div className="flex items-center justify-between">
                                  <label className="font-mono text-stone-500 text-[11px]">
                                    What I Did (Bullet Points)
                                  </label>
                                  <button
                                    type="button"
                                    onClick={() => handleAddBulletToRole(card.id, role.id)}
                                    className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-700 font-medium"
                                  >
                                    <Plus className="w-3 h-3" />
                                    <span>Add Bullet</span>
                                  </button>
                                </div>

                                <div className="space-y-1.5">
                                  {role.highlights.map((bullet, bIdx) => (
                                    <div key={bIdx} className="flex items-center gap-1.5">
                                      {role.highlights.length > 1 && (
                                        <div className="flex items-center gap-0.5 shrink-0">
                                          <button
                                            type="button"
                                            disabled={bIdx === 0}
                                            onClick={() => handleMoveBulletInRole(card.id, role.id, bIdx, 'up')}
                                            className={`p-0.5 rounded transition-colors ${
                                              bIdx === 0
                                                ? 'text-stone-200 cursor-not-allowed'
                                                : 'text-stone-400 hover:text-stone-900 hover:bg-stone-100 cursor-pointer'
                                            }`}
                                            title="Move bullet up"
                                          >
                                            <ArrowUp className="w-3 h-3" />
                                          </button>
                                          <button
                                            type="button"
                                            disabled={bIdx === role.highlights.length - 1}
                                            onClick={() => handleMoveBulletInRole(card.id, role.id, bIdx, 'down')}
                                            className={`p-0.5 rounded transition-colors ${
                                              bIdx === role.highlights.length - 1
                                                ? 'text-stone-200 cursor-not-allowed'
                                                : 'text-stone-400 hover:text-stone-900 hover:bg-stone-100 cursor-pointer'
                                            }`}
                                            title="Move bullet down"
                                          >
                                            <ArrowDown className="w-3 h-3" />
                                          </button>
                                        </div>
                                      )}
                                      <span className="w-1.5 h-1.5 rounded-full bg-stone-400 shrink-0 ml-0.5" />
                                      <input
                                        type="text"
                                        placeholder="Accomplishment or project milestone..."
                                        value={bullet}
                                        onChange={(e) => handleUpdateBulletInRole(card.id, role.id, bIdx, e.target.value)}
                                        className="flex-1 px-2.5 py-1 text-xs rounded border border-stone-300 bg-stone-50/50 text-stone-900 focus:bg-white focus:ring-1 focus:ring-stone-900 focus:outline-none"
                                      />
                                      {role.highlights.length > 1 && (
                                        <button
                                          type="button"
                                          onClick={() => handleRemoveBulletFromRole(card.id, role.id, bIdx)}
                                          className="text-stone-400 hover:text-red-600 p-1 transition-colors cursor-pointer"
                                          title="Remove bullet point"
                                        >
                                          <X className="w-3.5 h-3.5" />
                                        </button>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* PROJECTS TAB */}
          {activeTab === 'projects' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <p className="text-xs text-stone-600">
                  Manage projects displayed in the portfolio showcase.
                </p>
                <button
                  type="button"
                  onClick={handleAddProject}
                  className="inline-flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg bg-stone-900 text-white hover:bg-stone-800"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Project</span>
                </button>
              </div>

              <div className="space-y-4">
                {editedProjects.map((project, idx) => (
                  <div
                    key={project.id}
                    className="p-4 rounded-xl border border-stone-200 bg-stone-50/60 space-y-3"
                  >
                    <div className="flex items-center justify-between pb-2 border-b border-stone-200">
                      <div className="flex items-center gap-2">
                        {editedProjects.length > 1 && (
                          <div className="flex items-center gap-0.5">
                            <button
                              type="button"
                              disabled={idx === 0}
                              onClick={() => handleMoveProject(idx, 'up')}
                              className={`p-1 rounded transition-colors ${
                                idx === 0
                                  ? 'text-stone-300 cursor-not-allowed'
                                  : 'text-stone-500 hover:text-stone-900 hover:bg-white cursor-pointer'
                              }`}
                              title="Move project up"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              disabled={idx === editedProjects.length - 1}
                              onClick={() => handleMoveProject(idx, 'down')}
                              className={`p-1 rounded transition-colors ${
                                idx === editedProjects.length - 1
                                  ? 'text-stone-300 cursor-not-allowed'
                                  : 'text-stone-500 hover:text-stone-900 hover:bg-white cursor-pointer'
                              }`}
                              title="Move project down"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                        <span className="font-mono text-xs font-bold text-stone-600">
                          Project #{idx + 1}
                        </span>
                        {project.title && (
                          <span className="text-xs font-semibold text-stone-800 truncate max-w-[200px]">
                            {project.title}
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveProject(project.id)}
                        className="text-stone-400 hover:text-red-600 p-1 transition-colors cursor-pointer rounded hover:bg-red-50"
                        title="Delete project"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <input
                        type="text"
                        placeholder="Project Title"
                        value={project.title}
                        onChange={(e) => {
                          const copy = [...editedProjects];
                          copy[idx] = { ...copy[idx], title: e.target.value };
                          setEditedProjects(copy);
                        }}
                        className="px-3 py-1.5 rounded border border-stone-300 bg-white"
                      />
                      <input
                        type="text"
                        placeholder="Tagline"
                        value={project.tagline}
                        onChange={(e) => {
                          const copy = [...editedProjects];
                          copy[idx] = { ...copy[idx], tagline: e.target.value };
                          setEditedProjects(copy);
                        }}
                        className="px-3 py-1.5 rounded border border-stone-300 bg-white"
                      />
                    </div>

                    <div className="space-y-3">
                      <ImageUploadField
                        label="Primary Project Image"
                        value={project.imageUrl || ''}
                        onChange={(url) => {
                          const copy = [...editedProjects];
                          copy[idx] = { ...copy[idx], imageUrl: url };
                          setEditedProjects(copy);
                        }}
                        aspectRatio="wide"
                        helperText="Primary photo featured on the project card and gallery modal."
                      />

                      <MultiImageGalleryUpload
                        label="Additional Gallery Images"
                        images={project.images || []}
                        onChange={(imgs) => {
                          const copy = [...editedProjects];
                          copy[idx] = { ...copy[idx], images: imgs };
                          setEditedProjects(copy);
                        }}
                        helperText="Upload CAD views, FEA simulations, prototype test photos, or mechanism details."
                      />
                    </div>

                    <textarea
                      rows={2}
                      placeholder="Project description..."
                      value={project.description}
                      onChange={(e) => {
                        const copy = [...editedProjects];
                        copy[idx] = { ...copy[idx], description: e.target.value };
                        setEditedProjects(copy);
                      }}
                      className="w-full px-3 py-1.5 text-xs rounded border border-stone-300 bg-white resize-none"
                    />

                    <div className="text-xs space-y-1">
                      <label className="font-mono text-stone-500">Technologies (comma separated)</label>
                      <input
                        type="text"
                        value={project.techStack.join(', ')}
                        onChange={(e) => {
                          const copy = [...editedProjects];
                          copy[idx] = { ...copy[idx], techStack: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) };
                          setEditedProjects(copy);
                        }}
                        className="w-full px-3 py-1.5 rounded border border-stone-300 bg-white"
                      />
                    </div>

                    {/* Project Links & Websites (Configurable Names) */}
                    <div className="pt-2.5 border-t border-stone-200/80 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="font-mono text-stone-800 text-xs font-semibold">
                            Project Links & Websites (Custom Names)
                          </label>
                          <p className="text-[11px] text-stone-500 mt-0.5">
                            Configure custom link names such as company websites, client portals, CAD viewers, or repositories.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleAddLinkToProject(idx, 'Company Website', '')}
                          className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-md bg-white border border-stone-300 text-stone-700 hover:bg-stone-100 hover:text-stone-900 transition-colors shadow-2xs cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Add Link</span>
                        </button>
                      </div>

                      {(!project.links || project.links.length === 0) ? (
                        <div className="p-2.5 text-center rounded-lg border border-dashed border-stone-300 bg-white text-[11px] text-stone-500">
                          No links added yet. Click &ldquo;Add Link&rdquo; to configure a link with a custom display name.
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {project.links.map((link, lIdx) => (
                            <div
                              key={lIdx}
                              className="p-2.5 rounded-lg bg-white border border-stone-200 shadow-2xs space-y-2"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-1.5">
                                  {project.links && project.links.length > 1 && (
                                    <div className="flex items-center gap-0.5 shrink-0">
                                      <button
                                        type="button"
                                        disabled={lIdx === 0}
                                        onClick={() => handleMoveLinkInProject(idx, lIdx, 'up')}
                                        className={`p-0.5 rounded transition-colors ${
                                          lIdx === 0
                                            ? 'text-stone-200 cursor-not-allowed'
                                            : 'text-stone-400 hover:text-stone-900 hover:bg-stone-100 cursor-pointer'
                                        }`}
                                        title="Move link up"
                                      >
                                        <ArrowUp className="w-3 h-3" />
                                      </button>
                                      <button
                                        type="button"
                                        disabled={lIdx === (project.links?.length || 0) - 1}
                                        onClick={() => handleMoveLinkInProject(idx, lIdx, 'down')}
                                        className={`p-0.5 rounded transition-colors ${
                                          lIdx === (project.links?.length || 0) - 1
                                            ? 'text-stone-200 cursor-not-allowed'
                                            : 'text-stone-400 hover:text-stone-900 hover:bg-stone-100 cursor-pointer'
                                        }`}
                                        title="Move link down"
                                      >
                                        <ArrowDown className="w-3 h-3" />
                                      </button>
                                    </div>
                                  )}
                                  <span className="text-[11px] font-mono font-medium text-stone-500">
                                    Link #{lIdx + 1}
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveLinkFromProject(idx, lIdx)}
                                  className="p-1 text-stone-400 hover:text-red-600 rounded transition-colors cursor-pointer"
                                  title="Remove link"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                                <div className="sm:col-span-5 space-y-1">
                                  <label className="font-mono text-stone-500 text-[10px] uppercase">
                                    Link Display Name
                                  </label>
                                  <input
                                    type="text"
                                    placeholder="e.g. Dream Harvest Farms, Company Website..."
                                    value={link.label}
                                    onChange={(e) => handleUpdateLinkInProject(idx, lIdx, 'label', e.target.value)}
                                    className="w-full px-2.5 py-1 text-xs rounded border border-stone-200 bg-stone-50/50 text-stone-900 focus:bg-white focus:ring-1 focus:ring-stone-900 focus:outline-none"
                                  />
                                </div>
                                <div className="sm:col-span-7 space-y-1">
                                  <label className="font-mono text-stone-500 text-[10px] uppercase">
                                    URL / Web Address
                                  </label>
                                  <input
                                    type="text"
                                    placeholder="e.g. https://company.com or https://github.com/..."
                                    value={link.url}
                                    onChange={(e) => handleUpdateLinkInProject(idx, lIdx, 'url', e.target.value)}
                                    className="w-full px-2.5 py-1 text-xs rounded border border-stone-200 bg-stone-50/50 text-stone-900 focus:bg-white focus:ring-1 focus:ring-stone-900 focus:outline-none font-mono text-[11px]"
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Key Engineering Highlights / Bullet Points */}
                    <div className="pt-2.5 border-t border-stone-200/80 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="font-mono text-stone-800 text-xs font-semibold">
                            Key Engineering Highlights (Bullet Points)
                          </label>
                          <p className="text-[11px] text-stone-500 mt-0.5">
                            Bullet points describing engineering achievements, mechanisms, or key solutions.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleAddChallengeToProject(idx)}
                          className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-md bg-white border border-stone-300 text-stone-700 hover:bg-stone-100 hover:text-stone-900 transition-colors shadow-2xs cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Add Bullet</span>
                        </button>
                      </div>

                      {(!project.challengesSolved || project.challengesSolved.length === 0) ? (
                        <div className="p-2.5 text-center rounded-lg border border-dashed border-stone-300 bg-white text-[11px] text-stone-500">
                          No bullet points added yet. Click &ldquo;Add Bullet&rdquo; to highlight key features or engineering solutions.
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          {project.challengesSolved.map((bullet, bIdx) => (
                            <div key={bIdx} className="flex items-center gap-1.5 p-1.5 rounded-lg bg-white border border-stone-200 shadow-2xs">
                              {project.challengesSolved.length > 1 && (
                                <div className="flex items-center gap-0.5 shrink-0">
                                  <button
                                    type="button"
                                    disabled={bIdx === 0}
                                    onClick={() => handleMoveChallengeInProject(idx, bIdx, 'up')}
                                    className={`p-0.5 rounded transition-colors ${
                                      bIdx === 0
                                        ? 'text-stone-200 cursor-not-allowed'
                                        : 'text-stone-400 hover:text-stone-900 hover:bg-stone-100 cursor-pointer'
                                    }`}
                                    title="Move bullet up"
                                  >
                                    <ArrowUp className="w-3 h-3" />
                                  </button>
                                  <button
                                    type="button"
                                    disabled={bIdx === project.challengesSolved.length - 1}
                                    onClick={() => handleMoveChallengeInProject(idx, bIdx, 'down')}
                                    className={`p-0.5 rounded transition-colors ${
                                      bIdx === project.challengesSolved.length - 1
                                        ? 'text-stone-200 cursor-not-allowed'
                                        : 'text-stone-400 hover:text-stone-900 hover:bg-stone-100 cursor-pointer'
                                    }`}
                                    title="Move bullet down"
                                  >
                                    <ArrowDown className="w-3 h-3" />
                                  </button>
                                </div>
                              )}
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0 ml-1" />
                              <input
                                type="text"
                                placeholder="Key engineering highlight or challenge solved..."
                                value={bullet}
                                onChange={(e) => handleUpdateChallengeInProject(idx, bIdx, e.target.value)}
                                className="flex-1 px-2.5 py-1 text-xs rounded border border-stone-200 bg-stone-50/50 text-stone-900 focus:bg-white focus:ring-1 focus:ring-stone-900 focus:outline-none"
                              />
                              <button
                                type="button"
                                onClick={() => handleRemoveChallengeFromProject(idx, bIdx)}
                                className="p-1 text-stone-400 hover:text-red-600 rounded transition-colors cursor-pointer"
                                title="Remove bullet point"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Key Performance Specifications Section */}
                    <div className="pt-2.5 border-t border-stone-200/80 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <label className="font-mono text-stone-800 text-xs font-semibold flex items-center gap-1.5">
                            <span>Key Performance Specifications</span>
                          </label>
                          <p className="text-[11px] text-stone-500 mt-0.5">
                            Add as many performance metrics, mechanical tolerances, or ratings as needed.
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {project.metrics && project.metrics.length > 0 && (
                            <button
                              type="button"
                              onClick={() => {
                                const copy = [...editedProjects];
                                copy[idx] = { ...copy[idx], metrics: [] };
                                setEditedProjects(copy);
                              }}
                              className="text-[11px] text-stone-400 hover:text-red-600 transition-colors cursor-pointer px-2 py-1"
                              title="Clear all specifications for this project"
                            >
                              Clear All
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleAddMetricToProject(idx)}
                            className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1.5 rounded-md bg-stone-900 text-white hover:bg-stone-800 transition-colors shadow-2xs cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Add Specification</span>
                          </button>
                        </div>
                      </div>

                      {/* Quick Add Presets */}
                      <div className="flex items-center flex-wrap gap-1.5 bg-stone-100/70 p-2 rounded-lg border border-stone-200/60">
                        <span className="text-[10px] font-mono text-stone-500 mr-1">Quick Add:</span>
                        {[
                          { label: 'Drop Test Resistance', value: '1.5m' },
                          { label: 'Ingress Rating', value: 'IP68' },
                          { label: 'Thermal Headroom', value: '+14°C' },
                          { label: 'Target Mass / Weight', value: '<150g' },
                          { label: 'Critical Tolerance', value: '±0.02mm' },
                          { label: 'First Pass Yield', value: '99.2%' },
                          { label: 'Battery / Runtime', value: '18 hrs' }
                        ].map((preset, pIdx) => (
                          <button
                            key={pIdx}
                            type="button"
                            onClick={() => handleAddMetricToProject(idx, preset.label, preset.value)}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10.5px] bg-white border border-stone-200 text-stone-700 hover:border-stone-400 hover:text-stone-900 transition-colors cursor-pointer shadow-2xs"
                            title={`Add preset ${preset.label} (${preset.value})`}
                          >
                            <Plus className="w-2.5 h-2.5 text-stone-400" />
                            <span>{preset.label}</span>
                          </button>
                        ))}
                      </div>

                      {(!project.metrics || project.metrics.length === 0) ? (
                        <div className="p-3 text-center rounded-lg border border-dashed border-stone-300 bg-white text-[11px] text-stone-500 space-y-1">
                          <p>No specifications added yet for this project.</p>
                          <p className="text-[10px] text-stone-400">
                            Click &ldquo;Add Specification&rdquo; or pick a quick preset above to add specs.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {project.metrics.map((metric, mIdx) => (
                            <div
                              key={mIdx}
                              className="flex items-center gap-2 p-2.5 rounded-lg bg-white border border-stone-200 shadow-2xs text-xs"
                            >
                              <span className="font-mono text-[10px] font-bold text-stone-400 w-5 shrink-0 text-center">
                                #{mIdx + 1}
                              </span>

                              {/* Up / Down reordering buttons */}
                              <div className="flex flex-col gap-0.5 shrink-0">
                                <button
                                  type="button"
                                  disabled={mIdx === 0}
                                  onClick={() => handleMoveMetricInProject(idx, mIdx, 'up')}
                                  className={`p-0.5 rounded transition-colors ${
                                    mIdx === 0 
                                      ? 'text-stone-200 cursor-not-allowed' 
                                      : 'text-stone-400 hover:text-stone-800 hover:bg-stone-100 cursor-pointer'
                                  }`}
                                  title="Move up"
                                >
                                  <ArrowUp className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  disabled={mIdx === project.metrics.length - 1}
                                  onClick={() => handleMoveMetricInProject(idx, mIdx, 'down')}
                                  className={`p-0.5 rounded transition-colors ${
                                    mIdx === project.metrics.length - 1 
                                      ? 'text-stone-200 cursor-not-allowed' 
                                      : 'text-stone-400 hover:text-stone-800 hover:bg-stone-100 cursor-pointer'
                                  }`}
                                  title="Move down"
                                >
                                  <ArrowDown className="w-3 h-3" />
                                </button>
                              </div>

                              <div className="w-28 sm:w-36 shrink-0 space-y-0.5">
                                <label className="block text-[10px] font-mono text-stone-400">Value</label>
                                <input
                                  type="text"
                                  placeholder="e.g. 1.5m / IP67"
                                  value={metric.value}
                                  onChange={(e) => handleUpdateMetricInProject(idx, mIdx, 'value', e.target.value)}
                                  className="w-full px-2 py-1 rounded border border-stone-200 font-mono font-bold text-stone-900 text-xs focus:ring-1 focus:ring-stone-900 focus:outline-none"
                                />
                              </div>

                              <div className="flex-1 space-y-0.5">
                                <label className="block text-[10px] font-mono text-stone-400">Specification Label</label>
                                <input
                                  type="text"
                                  placeholder="e.g. Drop Test Resistance"
                                  value={metric.label}
                                  onChange={(e) => handleUpdateMetricInProject(idx, mIdx, 'label', e.target.value)}
                                  className="w-full px-2 py-1 rounded border border-stone-200 text-stone-700 text-xs focus:ring-1 focus:ring-stone-900 focus:outline-none"
                                />
                              </div>

                              <button
                                type="button"
                                onClick={() => handleRemoveMetricFromProject(idx, mIdx)}
                                className="p-1.5 text-stone-400 hover:text-red-600 rounded transition-colors cursor-pointer self-end mb-0.5"
                                title="Remove specification"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}

                          {/* Secondary Add Button at bottom for convenience when list is long */}
                          {project.metrics.length >= 2 && (
                            <div className="pt-1 flex justify-end">
                              <button
                                type="button"
                                onClick={() => handleAddMetricToProject(idx)}
                                className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded border border-dashed border-stone-300 text-stone-600 hover:bg-stone-100 hover:text-stone-900 transition-colors cursor-pointer"
                              >
                                <Plus className="w-3 h-3" />
                                <span>Add Another Specification</span>
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'skills' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-semibold text-stone-900">Skills</h3>
                <button
                  type="button"
                  onClick={() => {
                    const newCategory: SkillCategory = { name: 'New Skill Category', skills: [{ name: 'New Skill' }] };
                    setEditedSkills([newCategory, ...editedSkills]);
                  }}
                  className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-900 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Category</span>
                </button>
              </div>

              <div className="space-y-6">
                {editedSkills.map((category, catIdx) => (
                  <div key={catIdx} className="p-4 sm:p-5 rounded-xl border border-stone-200 bg-stone-50 space-y-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-mono text-stone-500">Category Name</label>
                          {editedSkills.length > 1 && (
                            <div className="flex items-center gap-0.5">
                              <button
                                type="button"
                                disabled={catIdx === 0}
                                onClick={() => handleMoveSkillCategory(catIdx, 'up')}
                                className={`p-1 rounded transition-colors ${
                                  catIdx === 0
                                    ? 'text-stone-300 cursor-not-allowed'
                                    : 'text-stone-500 hover:text-stone-900 hover:bg-white cursor-pointer'
                                }`}
                                title="Move category up"
                              >
                                <ArrowUp className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                disabled={catIdx === editedSkills.length - 1}
                                onClick={() => handleMoveSkillCategory(catIdx, 'down')}
                                className={`p-1 rounded transition-colors ${
                                  catIdx === editedSkills.length - 1
                                    ? 'text-stone-300 cursor-not-allowed'
                                    : 'text-stone-500 hover:text-stone-900 hover:bg-white cursor-pointer'
                                }`}
                                title="Move category down"
                              >
                                <ArrowDown className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                        <input
                          type="text"
                          value={category.name}
                          onChange={(e) => {
                            const newSkills = [...editedSkills];
                            newSkills[catIdx].name = e.target.value;
                            setEditedSkills(newSkills);
                          }}
                          className="w-full font-bold px-3 py-1.5 rounded-lg border border-stone-300 bg-white"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const newSkills = [...editedSkills];
                          newSkills.splice(catIdx, 1);
                          setEditedSkills(newSkills);
                        }}
                        className="p-1.5 mt-5 rounded-md text-red-500 hover:bg-red-50 hover:text-red-700 transition-colors cursor-pointer"
                        title="Remove category"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-mono text-stone-500">Skills in Category</label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {category.skills.map((skill, skillIdx) => (
                          <div key={skillIdx} className="flex items-center gap-1.5 p-1 rounded-lg bg-white border border-stone-200 shadow-2xs">
                            {category.skills.length > 1 && (
                              <div className="flex items-center gap-0.5 shrink-0">
                                <button
                                  type="button"
                                  disabled={skillIdx === 0}
                                  onClick={() => handleMoveSkill(catIdx, skillIdx, 'up')}
                                  className={`p-0.5 rounded transition-colors ${
                                    skillIdx === 0
                                      ? 'text-stone-200 cursor-not-allowed'
                                      : 'text-stone-400 hover:text-stone-900 hover:bg-stone-100 cursor-pointer'
                                  }`}
                                  title="Move skill up"
                                >
                                  <ArrowUp className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  disabled={skillIdx === category.skills.length - 1}
                                  onClick={() => handleMoveSkill(catIdx, skillIdx, 'down')}
                                  className={`p-0.5 rounded transition-colors ${
                                    skillIdx === category.skills.length - 1
                                      ? 'text-stone-200 cursor-not-allowed'
                                      : 'text-stone-400 hover:text-stone-900 hover:bg-stone-100 cursor-pointer'
                                  }`}
                                  title="Move skill down"
                                >
                                  <ArrowDown className="w-3 h-3" />
                                </button>
                              </div>
                            )}
                            <input
                              type="text"
                              value={skill.name}
                              onChange={(e) => {
                                const newSkills = [...editedSkills];
                                newSkills[catIdx].skills[skillIdx].name = e.target.value;
                                setEditedSkills(newSkills);
                              }}
                              className="flex-1 px-2.5 py-1 text-xs sm:text-sm rounded border-0 bg-transparent text-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-900"
                              placeholder="Skill name"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const newSkills = [...editedSkills];
                                newSkills[catIdx].skills[skillIdx].highlighted = !newSkills[catIdx].skills[skillIdx].highlighted;
                                setEditedSkills(newSkills);
                              }}
                              className={`p-1 rounded transition-colors cursor-pointer ${skill.highlighted ? 'text-amber-500 bg-amber-50' : 'text-stone-400 hover:bg-stone-100'}`}
                              title="Toggle highlight (displays darker)"
                            >
                              <Sparkles className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const newSkills = [...editedSkills];
                                newSkills[catIdx].skills.splice(skillIdx, 1);
                                setEditedSkills(newSkills);
                              }}
                              className="p-1 text-stone-400 hover:text-red-500 rounded hover:bg-red-50 transition-colors cursor-pointer"
                              title="Remove skill"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => {
                            const newSkills = [...editedSkills];
                            newSkills[catIdx].skills.push({ name: 'New Skill' });
                            setEditedSkills(newSkills);
                          }}
                          className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded border border-dashed border-stone-300 text-stone-500 hover:bg-stone-50 hover:text-stone-900 transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add Skill</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'layout' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-stone-900">Portfolio Layout & Sections</h3>
                <p className="text-xs text-stone-500 mt-1">Reorder sections by clicking the arrows. Hide or show sections using the eye icon.</p>
              </div>

              <div className="space-y-3">
                {[...editedSections]
                  .sort((a, b) => a.order - b.order)
                  .map((section, index, array) => (
                  <div key={section.id} className="flex flex-col gap-2">
                    <div 
                      className={`flex items-center justify-between p-3 sm:p-4 rounded-xl border ${section.visible ? 'border-stone-200 bg-white' : 'border-stone-200/50 bg-stone-50 opacity-60'} transition-all`}
                    >
                      <div className="flex items-center gap-3">
                      <div className="flex flex-col gap-0.5 text-stone-400">
                        <button
                          type="button"
                          disabled={index === 0}
                          onClick={() => {
                            if (index === 0) return;
                            const newSections = [...editedSections];
                            const curr = newSections.find(s => s.id === section.id)!;
                            const prev = newSections.find(s => s.id === array[index - 1].id)!;
                            const tempOrder = curr.order;
                            curr.order = prev.order;
                            prev.order = tempOrder;
                            setEditedSections(newSections);
                          }}
                          className={`p-0.5 rounded hover:bg-stone-100 ${index === 0 ? 'opacity-30 cursor-not-allowed' : 'hover:text-stone-900'}`}
                        >
                          <ArrowUp className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          disabled={index === array.length - 1}
                          onClick={() => {
                            if (index === array.length - 1) return;
                            const newSections = [...editedSections];
                            const curr = newSections.find(s => s.id === section.id)!;
                            const next = newSections.find(s => s.id === array[index + 1].id)!;
                            const tempOrder = curr.order;
                            curr.order = next.order;
                            next.order = tempOrder;
                            setEditedSections(newSections);
                          }}
                          className={`p-0.5 rounded hover:bg-stone-100 ${index === array.length - 1 ? 'opacity-30 cursor-not-allowed' : 'hover:text-stone-900'}`}
                        >
                          <ArrowDown className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="space-y-0.5 w-full max-w-sm">
                        {section.type === 'custom' ? (
                          <input 
                            type="text" 
                            value={section.title}
                            onChange={(e) => {
                              const newSections = [...editedSections];
                              const sec = newSections.find(s => s.id === section.id)!;
                              sec.title = e.target.value;
                              setEditedSections(newSections);
                            }}
                            className="text-sm font-semibold text-stone-900 bg-transparent border-b border-stone-300 focus:border-stone-900 focus:outline-none w-full"
                            placeholder="Custom Section Title"
                          />
                        ) : (
                          <h4 className="text-sm font-semibold text-stone-900">{section.title}</h4>
                        )}
                        <div className="text-[10px] font-mono text-stone-500 uppercase">{section.type} section</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      {section.type === 'custom' && (
                        <button
                          type="button"
                          onClick={() => {
                            const newSections = editedSections.filter(s => s.id !== section.id);
                            // re-normalize order
                            newSections.sort((a, b) => a.order - b.order).forEach((s, idx) => s.order = idx);
                            setEditedSections(newSections);
                          }}
                          className="p-2 rounded-lg text-stone-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                          title="Delete Custom Section"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          const newSections = [...editedSections];
                          const sec = newSections.find(s => s.id === section.id)!;
                          sec.visible = !sec.visible;
                          setEditedSections(newSections);
                        }}
                        className={`p-2 rounded-lg transition-colors ${section.visible ? 'text-stone-600 hover:bg-stone-100 hover:text-stone-900' : 'text-stone-400 hover:bg-stone-200 hover:text-stone-600'}`}
                        title={section.visible ? "Hide Section" : "Show Section"}
                      >
                        {section.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  {section.type === 'custom' && (
                    <div className="mt-2 ml-10 p-3 bg-stone-50 border border-stone-200 rounded-lg">
                      <label className="text-xs font-semibold text-stone-600 mb-1 block">Content (HTML/Text)</label>
                      <textarea
                        value={section.content || ''}
                        onChange={(e) => {
                          const newSections = [...editedSections];
                          const sec = newSections.find(s => s.id === section.id)!;
                          sec.content = e.target.value;
                          setEditedSections(newSections);
                        }}
                        rows={4}
                        className="w-full px-3 py-2 text-sm rounded-md border border-stone-200 focus:outline-none focus:ring-1 focus:ring-stone-900 font-mono"
                        placeholder="<p>Enter your custom HTML or text here.</p>"
                      />
                    </div>
                  )}
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => {
                    const maxOrder = editedSections.length > 0 ? Math.max(...editedSections.map(s => s.order)) : 0;
                    setEditedSections([
                      ...editedSections,
                      {
                        id: `custom-${Date.now()}`,
                        type: 'custom',
                        title: 'New Section',
                        visible: true,
                        order: maxOrder + 1,
                        content: '<p>Custom content goes here.</p>'
                      }
                    ]);
                  }}
                  className="w-full py-3 border-2 border-dashed border-stone-200 rounded-xl text-sm font-medium text-stone-500 hover:border-stone-400 hover:text-stone-800 transition-colors flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Custom Section
                </button>
              </div>
            </div>
          )}

          {/* BACKUP & RESTORE TAB */}
          {activeTab === 'backup' && (
            <div className="space-y-6 text-xs sm:text-sm">
              {/* Notification / Feedback Banner */}
              {backupStatus && (
                <div className={`p-3.5 rounded-xl border flex items-start justify-between gap-3 text-xs ${
                  backupStatus.type === 'success' 
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : backupStatus.type === 'error'
                    ? 'bg-red-50 border-red-200 text-red-800'
                    : 'bg-blue-50 border-blue-200 text-blue-800'
                }`}>
                  <div className="flex items-start gap-2.5">
                    {backupStatus.type === 'success' ? (
                      <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    )}
                    <p className="leading-relaxed font-medium">{backupStatus.text}</p>
                  </div>
                  <button 
                    type="button" 
                    onClick={() => setBackupStatus(null)} 
                    className="text-stone-400 hover:text-stone-700 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Action Cards: Export & Import */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Export Card */}
                <div className="p-5 rounded-2xl border border-stone-200 bg-stone-50/50 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-stone-900 font-semibold text-sm">
                      <div className="p-1.5 rounded-lg bg-white border border-stone-200 text-stone-700">
                        <Download className="w-4 h-4" />
                      </div>
                      <h3>Backup Portfolio Data</h3>
                    </div>
                    <p className="text-xs text-stone-600 leading-relaxed">
                      Download a complete, portable JSON file containing all your profile info, work experience timeline, project descriptions, skills, and section settings.
                    </p>

                    <div className="pt-2 flex flex-wrap gap-1.5 text-[11px] font-mono text-stone-600">
                      <span className="px-2 py-0.5 bg-white rounded-md border border-stone-200">
                        {experienceCards.length} companies
                      </span>
                      <span className="px-2 py-0.5 bg-white rounded-md border border-stone-200">
                        {editedProjects.length} projects
                      </span>
                      <span className="px-2 py-0.5 bg-white rounded-md border border-stone-200">
                        {editedSkills.length} skill groups
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      id="export-backup-btn"
                      onClick={handleExportJSON}
                      className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download Backup (.json)</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleCopyJSON}
                      className="p-2.5 rounded-xl border border-stone-200 bg-white hover:bg-stone-100 text-stone-700 transition-colors cursor-pointer"
                      title="Copy JSON to clipboard"
                    >
                      {copiedFeedback ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Import / Restore Card */}
                <div className="p-5 rounded-2xl border border-stone-200 bg-stone-50/50 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-stone-900 font-semibold text-sm">
                      <div className="p-1.5 rounded-lg bg-white border border-stone-200 text-stone-700">
                        <Upload className="w-4 h-4" />
                      </div>
                      <h3>Restore from Backup</h3>
                    </div>
                    <p className="text-xs text-stone-600 leading-relaxed">
                      Select any previously exported portfolio JSON file to instantly restore your data. Restored content loads into the editor so you can review before clicking Save.
                    </p>
                    <p className="text-[11px] text-stone-500 italic pt-1">
                      Tip: A local copy of your current data will also be kept in the snapshot history below.
                    </p>
                  </div>

                  <div className="pt-1">
                    <label 
                      htmlFor="import-backup-file-input"
                      className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border-2 border-dashed border-stone-300 hover:border-stone-400 bg-white hover:bg-stone-50 text-stone-800 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5 text-stone-600" />
                      <span>Select Backup File to Restore</span>
                      <input
                        id="import-backup-file-input"
                        type="file"
                        accept=".json,application/json"
                        className="hidden"
                        onChange={handleImportJSON}
                      />
                    </label>
                  </div>
                </div>
              </div>

              {/* Automatic Local Version History */}
              <div className="p-5 rounded-2xl border border-stone-200 bg-white space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <History className="w-4 h-4 text-stone-600" />
                    <h3 className="font-semibold text-stone-900 text-xs sm:text-sm">
                      Recent Automatic Snapshots ({localSnapshots.length})
                    </h3>
                  </div>
                  {localSnapshots.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm('Clear all local snapshot history?')) {
                          setLocalSnapshots([]);
                          localStorage.removeItem('portfolio_backup_snapshots');
                        }
                      }}
                      className="text-[11px] text-stone-400 hover:text-red-600 transition-colors cursor-pointer"
                    >
                      Clear History
                    </button>
                  )}
                </div>

                <p className="text-xs text-stone-500">
                  Every time you save changes or export a backup, a snapshot is preserved locally in your browser so you can undo changes anytime.
                </p>

                {localSnapshots.length === 0 ? (
                  <div className="py-6 text-center text-xs text-stone-400 border border-dashed border-stone-200 rounded-xl">
                    No snapshots recorded yet. Snapshots will appear automatically when you save changes or download a backup.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {localSnapshots.map((snap) => (
                      <div 
                        key={snap.id} 
                        className="p-3 rounded-xl border border-stone-200 hover:border-stone-300 bg-stone-50/60 flex items-center justify-between gap-3 text-xs transition-colors"
                      >
                        <div className="space-y-0.5 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-stone-900 truncate">
                              {snap.label}
                            </span>
                            <span className="text-[10px] font-mono text-stone-400">
                              {new Date(snap.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-[11px] text-stone-500">
                            {new Date(snap.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                            {snap.itemCounts ? ` • ${snap.itemCounts.projects} projects, ${snap.itemCounts.experiences} companies` : ''}
                          </p>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleRestoreSnapshot(snap)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-stone-900 hover:bg-stone-800 text-white text-[11px] font-medium transition-colors cursor-pointer"
                            title="Restore this version into editor"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Restore</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDownloadSnapshot(snap)}
                            className="p-1.5 rounded-lg border border-stone-200 bg-white hover:bg-stone-100 text-stone-600 transition-colors cursor-pointer"
                            title="Download this snapshot as JSON"
                          >
                            <Download className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteSnapshot(snap.id)}
                            className="p-1.5 rounded-lg text-stone-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                            title="Delete snapshot"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Direct JSON Code Inspector (Collapsible) */}
              <div className="p-4 rounded-2xl border border-stone-200 bg-stone-50/50 space-y-2">
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setShowManualJson(!showManualJson)}
                    className="flex items-center gap-2 text-xs font-semibold text-stone-800 hover:text-stone-950 transition-colors cursor-pointer"
                  >
                    <FileJson className="w-4 h-4 text-stone-600" />
                    <span>Direct JSON Code Paste / Inspector</span>
                  </button>
                  <span className="text-[11px] text-stone-400">Advanced</span>
                </div>

                {showManualJson && (
                  <div className="pt-2 space-y-3">
                    <p className="text-xs text-stone-500">
                      Paste raw portfolio JSON below to import directly:
                    </p>
                    <textarea
                      value={manualJsonInput}
                      onChange={(e) => setManualJsonInput(e.target.value)}
                      placeholder='Paste JSON here: { "profile": { ... }, "projects": [ ... ] }'
                      rows={6}
                      className="w-full p-3 font-mono text-xs rounded-xl border border-stone-200 bg-white text-stone-900 focus:ring-1 focus:ring-stone-900 focus:outline-hidden"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const currentData = {
                            profile: editedProfile,
                            experienceNodes: flattenCardsToNodes(experienceCards),
                            projects: editedProjects,
                            skills: editedSkills,
                            sections: editedSections
                          };
                          setManualJsonInput(JSON.stringify(currentData, null, 2));
                        }}
                        className="px-3 py-1.5 rounded-lg border border-stone-200 bg-white hover:bg-stone-100 text-stone-700 text-xs font-medium cursor-pointer"
                      >
                        Load Current JSON
                      </button>
                      <button
                        type="button"
                        onClick={handleApplyManualJson}
                        disabled={!manualJsonInput.trim()}
                        className="px-3.5 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
                      >
                        Apply JSON to Editor
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-stone-200 bg-stone-50/50 flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Backup & Restore Action Buttons */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              id="footer-backup-btn"
              onClick={handleExportJSON}
              className="inline-flex items-center justify-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg border border-stone-200 hover:bg-stone-100 text-stone-700 bg-white transition-colors cursor-pointer shadow-2xs"
              title="Download complete JSON backup file"
            >
              <Download className="w-3.5 h-3.5 text-stone-600" />
              <span>Backup (Export JSON)</span>
            </button>

            <label 
              htmlFor="footer-import-backup-input"
              className="inline-flex items-center justify-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg border border-stone-200 hover:bg-stone-100 text-stone-700 bg-white transition-colors cursor-pointer shadow-2xs"
              title="Restore from JSON backup file"
            >
              <Upload className="w-3.5 h-3.5 text-stone-600" />
              <span>Restore Backup</span>
              <input
                id="footer-import-backup-input"
                type="file"
                accept=".json,application/json"
                className="hidden"
                onChange={handleImportJSON}
              />
            </label>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="text-xs font-medium px-3.5 py-2 rounded-lg text-stone-600 hover:bg-stone-100 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              id="footer-save-changes-btn"
              onClick={handleSave}
              className="inline-flex items-center justify-center gap-1.5 text-xs font-medium px-4 py-2 rounded-lg bg-stone-900 hover:bg-stone-800 text-white shadow-2xs transition-all cursor-pointer"
            >
              {savedFeedback ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-300" />
                  <span>Saved!</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
