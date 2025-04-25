import { Badge } from "@/components/ui/badge";
import { ExternalLink, Github } from "lucide-react";
import { Project } from "@/data/types";

type ProjectCardProps = Project;

export function ProjectCard({
  title,
  description,
  tags,
  githubUrl,
  liveUrl,
  year,
}: ProjectCardProps) {
  return (
    <div className="mb-12 last:mb-0">
      <div className="flex flex-wrap items-baseline justify-between mb-1 gap-2">
        <h3 className="text-lg font-medium">{title}</h3>
        {year && <div className="text-sm text-muted-foreground">{year}</div>}
      </div>
      <p className="text-muted-foreground">{description}</p>
      <div className="flex flex-wrap gap-1.5 mt-3">
        {tags.map((tag) => (
          <Badge
            key={tag}
            variant="outline"
            className="text-xs px-2 py-0.5 border-muted-foreground/20 text-muted-foreground"
          >
            {tag}
          </Badge>
        ))}
      </div>
      <div className="flex gap-4 mt-3">
        {githubUrl && (
          <a
            href={githubUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1 group"
          >
            <Github className="h-4 w-4" />
            <span className="text-sm group-hover:underline">GitHub</span>
          </a>
        )}
        {liveUrl && (
          <a
            href={liveUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1 group"
          >
            <ExternalLink className="h-4 w-4" />
            <span className="text-sm group-hover:underline">Live Demo</span>
          </a>
        )}
      </div>
    </div>
  );
}
