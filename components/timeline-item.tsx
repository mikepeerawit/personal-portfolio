import { Badge } from "@/components/ui/badge";
import { ExternalLink } from "lucide-react";
import { TimelineItem as TimelineItemType } from "@/data/types";

type TimelineItemProps = TimelineItemType & {
  tags?: string[];
};

export function TimelineItem({
  title,
  subtitle,
  date,
  description,
  tags,
  url,
}: TimelineItemProps) {
  return (
    <div className="mb-12 last:mb-0">
      <div className="mb-1 text-muted-foreground">{date}</div>
      {url ? (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 group"
        >
          <h3 className="text-lg font-medium group-hover:text-foreground transition-colors">
            {title} – {subtitle}
          </h3>
          <ExternalLink className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
        </a>
      ) : (
        <h3 className="text-lg font-medium">
          {title} – {subtitle}
        </h3>
      )}
      <p className="mt-2 text-muted-foreground">{description}</p>
      {tags && tags.length > 0 && (
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
      )}
    </div>
  );
}
