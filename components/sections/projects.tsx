import AnimatedSection from "@/components/animated-section";
import ProjectCard from "@/components/project-card";
import SectionHeading from "@/components/section-heading";
import { projects } from "@/data/constants/projects-data";
import { section } from "@/lib/page-outline";

const Projects = () => {
  return (
    <AnimatedSection id={section.projects.id} className="scroll-mt-20 pt-4">
      <SectionHeading section={section.projects} />
      <div>
        {projects.map((project, index) => (
          <ProjectCard key={index} {...project} />
        ))}
      </div>
    </AnimatedSection>
  );
};

export default Projects;
