import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Mail, Download } from "lucide-react";
import AnimatedSection from "@/components/animated-section";

const Hero = () => {
  return (
    <AnimatedSection className="flex flex-col gap-8">
      <div className="flex flex-col md:flex-row items-start gap-6 md:gap-8">
        <div className="w-24 h-24 md:w-28 md:h-28 rounded-full overflow-hidden flex-shrink-0">
          <Image
            src="/profile-pic.jpeg"
            alt="Profile picture"
            width={112}
            height={112}
            className="object-cover w-full h-full"
            priority
          />
        </div>
        <div className="space-y-3">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
            Peerawit Chariyawongsiri
          </h1>
          <p className="text-xl text-muted-foreground">Full Stack Developer</p>
          <p className="text-sm text-muted-foreground">
            Based in Bangkok, Thailand
          </p>
        </div>
      </div>
      <div className="flex gap-4">
        <Button
          variant="outline"
          size="sm"
          className="rounded-md px-4 transition-all border-foreground/20 text-foreground/80 hover:text-foreground hover:border-foreground/50"
          asChild
        >
          <a href="mailto:business@mikepeerawit.com">
            <Mail className="mr-2 h-4 w-4" />
            Contact me
          </a>
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="rounded-md px-4 transition-all border-foreground/20 text-foreground/80 hover:text-foreground hover:border-foreground/50"
          asChild
        >
          <a href="/Peerawit_Chariyawongsiri___CV2025.pdf" download>
            <Download className="mr-2 h-4 w-4" />
            Download CV
          </a>
        </Button>
      </div>
    </AnimatedSection>
  );
};

export default Hero;
