import Link from "next/link";
import { Menu } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetClose,
  SheetTitle,
} from "@/components/ui/sheet";

const navItems = [
  { href: "#about", label: "About" },
  { href: "#experience", label: "Experience" },
  { href: "#projects", label: "Projects" },
  { href: "#education", label: "Education" },
  { href: "#contact", label: "Contact" },
];

const Header = () => {
  return (
    <header className="sticky top-0 z-50 w-full bg-black/50 backdrop-blur supports-[backdrop-filter]:bg-black/50">
      <div className="w-full max-w-full flex h-20 sm:h-20 items-center justify-end md:justify-center px-4">
        <nav className="hidden md:flex gap-6 text-sm">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-foreground/60 transition-all duration-300 hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="md:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <div className="flex items-center justify-center h-10 w-10">
                <Menu className="w-10 h-10 text-foreground/60 hover:text-foreground" />
                <span className="sr-only">Toggle Menu</span>
              </div>
            </SheetTrigger>
            <SheetContent side="right" className="bg-black/95">
              <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
              <nav className="grid gap-6 text-lg mt-10 pl-6">
                {navItems.map((item) => (
                  <SheetClose key={item.href} asChild>
                    <Link
                      href={item.href}
                      className="text-foreground/60 hover:text-foreground transition-all duration-300 pl-4"
                    >
                      {item.label}
                    </Link>
                  </SheetClose>
                ))}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
};

export default Header;
