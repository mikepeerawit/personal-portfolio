import Header from "@/components/sections/header";
import Hero from "@/components/sections/hero";
import About from "@/components/sections/about";
import Experience from "@/components/sections/experience";
import Projects from "@/components/sections/projects";
import Education from "@/components/sections/education";
import ContactForm from "@/components/contact-form";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col">
      <Header />
      <div className="w-full">
        <div className="max-w-[650px] mx-auto px-4 sm:px-6 pt-6 pb-12 md:pt-10 md:pb-20 space-y-16 sm:space-y-24">
          <Hero />
          <About />
          <Experience />
          <Projects />
          <Education />
          <ContactForm />
        </div>
      </div>
    </main>
  );
}
