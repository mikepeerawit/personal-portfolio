import Header from "@/components/sections/header";
import Hero from "@/components/sections/hero";
import About from "@/components/sections/about";
import Projects from "@/components/sections/projects";
import TimelineSection from "@/components/timeline-section";
import ContactForm from "@/components/contact-form";
import { experiences } from "@/data/constants/experience-data";
import { education } from "@/data/constants/education-data";
import { section } from "@/lib/page-outline";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col">
      <Header />
      <div className="w-full">
        <div className="max-w-[650px] mx-auto px-4 md:px-6 pt-6 pb-12 md:pt-10 md:pb-20 space-y-10 md:space-y-10">
          <Hero />
          <About />
          <TimelineSection section={section.experience} items={experiences} />
          <Projects />
          <TimelineSection section={section.education} items={education} />
          <ContactForm />
        </div>
      </div>
    </main>
  );
}
