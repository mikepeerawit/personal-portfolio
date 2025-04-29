import AnimatedSection from "@/components/animated-section";
import ProjectCard from "@/components/project-card";
import { projects } from "@/data/constants/projects-data";

const Projects = () => {
  return (
    <AnimatedSection id="projects" className="scroll-mt-20 pt-4">
      <h2 className="text-2xl font-semibold tracking-tight mb-6">Projects</h2>
      <div>
        {projects.map((project, index) => (
          <ProjectCard
            key={index}
            title={project.title}
            description={project.description}
            tags={project.tags}
            githubUrl={project.githubUrl}
            liveUrl={project.liveUrl}
            year={project.year}
          />
        ))}
      </div>
    </AnimatedSection>
  );
};

export default Projects;
