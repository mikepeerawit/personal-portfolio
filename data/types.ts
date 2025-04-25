// Common types used across the application

export type TimelineItem = {
  title: string;
  subtitle: string;
  date: string;
  description: string;
  url?: string;
};

export type Experience = TimelineItem & {
  tags?: string[];
};

export type Education = TimelineItem;

export type Project = {
  title: string;
  description: string;
  tags: string[];
  githubUrl?: string;
  liveUrl?: string;
  year: string;
};

export type NavigationItem = {
  href: string;
  label: string;
};
