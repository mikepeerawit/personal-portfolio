import PageSection from "@/components/page-section";
import ProjectCard from "@/components/project-card";
import { projects } from "@/data/constants/projects-data";
import { section } from "@/lib/page-outline";

const Projects = () => {
  return (
    <PageSection section={section.projects}>
      <div>
        {projects.map((project, index) => (
          <ProjectCard key={index} {...project} />
        ))}
      </div>
    </PageSection>
  );
};

export default Projects;
