import { WebText, useWebText } from "@/components/website-content";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Microscope } from "lucide-react";
import { Button } from "@/components/ui/button";
import homeImage from "@/assets/home-physiology.jpg";

const TITLE = "Physiology Practical Record | BGS Medical College Hospital";
const DESC =
  "Digital practical record system for MBBS Phase I physiology — student journal, faculty evaluation and department administration.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Landing,
});

function Landing() {
  const webText = useWebText();
  return (
    <div className="home-page min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-5 py-5 sm:px-8">
          <div className="flex size-10 items-center justify-center rounded-lg bg-primary font-display text-sm font-bold text-primary-foreground">
            <WebText text={"BG"} /></div>
          <div className="min-w-0">
            <p className="truncate font-display text-sm font-bold"><WebText text={"BGS Medical College Hospital"} /></p>
            <p className="truncate text-xs text-muted-foreground"><WebText text={"Department of Physiology"} /></p>
          </div>
          <Button asChild variant="outline" className="ml-auto shrink-0"><Link to="/login"><WebText text={"Sign In"} /><ArrowRight className="size-4" /></Link></Button>
        </div>
      </header>

      <section className="home-banner relative mx-auto mt-6 max-w-7xl overflow-hidden bg-secondary sm:mx-6 sm:rounded-lg lg:mx-auto">
        <img src={homeImage} alt={webText("Physiology teaching laboratory with a microscope and blood pressure cuff")} width={1600} height={912} className="absolute inset-0 size-full object-cover object-right" />
        <div className="home-banner-copy relative px-6 py-14 sm:px-12 sm:py-20 lg:px-16 lg:py-24">
          <p className="flex max-w-sm items-center gap-2 text-xs font-semibold text-muted-foreground"><Microscope className="size-4 text-primary" /><WebText text={"MBBS Phase I • Academic Year 2026-27"} /></p>
          <p className="mt-9 text-sm font-semibold text-primary"><WebText text={"Digital Journal"} /></p>
          <h1 className="home-title mt-3 max-w-lg font-display text-5xl font-semibold leading-tight sm:text-6xl"><WebText text={"Physiology Practical"} /></h1>
          <div className="mt-6 h-1 w-12 bg-primary" />
          <p className="mt-6 max-w-sm text-sm leading-7 text-muted-foreground"><WebText text={"One place for students to record experiments and for faculty to review, assess and certify every practical — live and paperless."} /></p>
          <Button asChild className="mt-8 h-12 gap-4 px-6"><Link to="/login"><WebText text={"Enter Portal"} /><ArrowRight /></Link></Button>
        </div>
      </section>

      <footer className="mt-8 border-t border-border">
        <div className="mx-auto max-w-7xl px-5 py-6 text-xs text-muted-foreground sm:px-8">
          <WebText text={"© 2026 BGS Medical College Hospital — Department of Physiology"} /></div>
      </footer>
    </div>
  );
}
