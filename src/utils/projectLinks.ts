import { Project, ProjectLink } from '../types';

/**
 * Returns clean, populated links for displaying in project cards or modals.
 * Favors the configured `links` array, with graceful fallback to `githubUrl` / `liveUrl`.
 */
export function getProjectLinks(project: Project): ProjectLink[] {
  if (project.links && Array.isArray(project.links) && project.links.length > 0) {
    const valid = project.links
      .map((l) => ({
        label: (l.label || '').trim() || 'Link',
        url: (l.url || '').trim()
      }))
      .filter((l) => l.url.length > 0);

    if (valid.length > 0) {
      return valid;
    }
  }

  const fallback: ProjectLink[] = [];

  if (project.githubUrl && project.githubUrl.trim().length > 0) {
    fallback.push({
      label:
        project.githubUrlLabel?.trim() ||
        (project.githubUrl.toLowerCase().includes('github') ? 'GitHub Repo' : 'Source / CAD Repo'),
      url: project.githubUrl.trim()
    });
  }

  if (project.liveUrl && project.liveUrl.trim().length > 0) {
    fallback.push({
      label: project.liveUrlLabel?.trim() || 'Product Specification',
      url: project.liveUrl.trim()
    });
  }

  return fallback;
}

/**
 * Normalizes project links into an editable array for the editor modal.
 */
export function normalizeProjectLinks(project: Project): ProjectLink[] {
  if (project.links && Array.isArray(project.links) && project.links.length > 0) {
    return project.links.map((l) => ({
      label: l.label ?? '',
      url: l.url ?? ''
    }));
  }

  const links: ProjectLink[] = [];

  if (project.githubUrl && project.githubUrl.trim().length > 0) {
    links.push({
      label:
        project.githubUrlLabel?.trim() ||
        (project.githubUrl.toLowerCase().includes('github') ? 'GitHub Repo' : 'Source / CAD Repo'),
      url: project.githubUrl.trim()
    });
  }

  if (project.liveUrl && project.liveUrl.trim().length > 0) {
    links.push({
      label: project.liveUrlLabel?.trim() || 'Product Specification',
      url: project.liveUrl.trim()
    });
  }

  return links;
}
