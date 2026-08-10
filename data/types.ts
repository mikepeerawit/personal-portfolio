// Common types used across the application

export type TimelineItem = {
  title: string;
  subtitle: string;
  date: string;
  description: string;
  url?: string;
  tags?: string[];
};

export type Project = {
  title: string;
  description: string;
  tags: string[];
  githubUrl?: string;
  liveUrl?: string;
  year: string;
};
