export interface ExperienceFlowNode {
  id: string;
  role: string;
  company: string;
  companyLogoUrl?: string; // Optional wide format logo for the company
  location: string;
  period: string;
  startYear: number;
  endYear: number | 'Present';
  flowLabel?: string; // Transition label leading into this node (e.g., "Promotion to Staff", "Startup Pivot")
  summary: string;
  highlights: string[];
  metrics?: string;
  decisionContext?: string; // For pivot/decision nodes
  imageUrl?: string; // Optional photo for the milestone/product
  imageLayout?: 'landscape-top' | 'portrait-right'; // Layout preference for the image
  status: 'completed' | 'current';
}

export interface ProjectMetric {
  label: string;
  value: string;
}

export type ProjectCategory = 'All' | 'Consumer Hardware' | 'Mechanisms & Kinematics' | 'DFM & Tooling' | 'Wearables & IoT';

export interface Project {
  id: string;
  title: string;
  tagline: string;
  category: 'Consumer Hardware' | 'Mechanisms & Kinematics' | 'DFM & Tooling' | 'Wearables & IoT';
  description: string;
  architectureOverview: string;
  challengesSolved: string[];
  metrics: ProjectMetric[];
  techStack: string[];
  liveUrl?: string;
  githubUrl?: string;
  featured: boolean;
  imageUrl?: string;
  images?: string[];
}

export interface SkillCategory {
  name: string;
  skills: { name: string; level?: string; highlighted?: boolean }[];
}

export type SectionType = 'hero' | 'experience' | 'projects' | 'skills' | 'custom';

export interface SectionConfig {
  id: string;
  type: SectionType;
  title: string;
  visible: boolean;
  order: number;
  content?: string; // For custom sections
}

export interface Profile {
  name: string;
  title: string;
  tagline: string;
  bio: string;
  footerText?: string;
  location: string;
  timezone: string;
  email: string;
  phone: string;
  github: string;
  linkedin: string;
  resumeUrl?: string;
  twitter?: string;
  avatarUrl?: string;
  availableForHire: boolean;
  statusBadge: string;
  stats: {
    label: string;
    value: string;
  }[];
}
