import AnimatedSection from "@/components/animated-section";
import TimelineItem from "@/components/timeline-item";
import { experiences } from "@/data/constants/experience-data";
import { section } from "@/lib/page-outline";

const Experience = () => {
  return (
    <AnimatedSection id={section.experience.id} className="scroll-mt-20 pt-4">
      <h2 className="text-2xl font-semibold tracking-tight mb-6">
        Work Experience
      </h2>
      <div>
        {experiences.map((experience, index) => (
          <TimelineItem
            key={index}
            title={experience.title}
            subtitle={experience.subtitle}
            date={experience.date}
            description={experience.description}
            tags={experience.tags}
            url={experience.url}
          />
        ))}
      </div>
    </AnimatedSection>
  );
};

export default Experience;
