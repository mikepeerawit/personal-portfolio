import PageSection from "@/components/page-section";
import { section } from "@/lib/page-outline";

const About = () => {
  return (
    <PageSection section={section.about}>
      <div className="space-y-4 text-muted-foreground">
        <p>
          I&apos;m a full-stack developer with a passion for building
          thoughtful, well-crafted digital products. My journey started with a
          love for engineering and evolved into creating web experiences that
          combine clean design, seamless interaction, and technical depth.
        </p>
        <p>
          With experience in both software engineering and performance testing,
          I approach development with both creativity and precision. Outside of
          work, I enjoy coding side projects, exploring UI/UX trends, and
          building entrepreneurial ventures.
        </p>
      </div>
    </PageSection>
  );
};

export default About;
