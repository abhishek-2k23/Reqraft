import { LandingNav } from "./landing/nav";
import { LandingHero } from "./landing/hero";
import { FeatureBento } from "./landing/feature-bento";
import { LandingMetrics } from "./landing/metrics";
import { LandingCta } from "./landing/cta";
import { LandingFooter } from "./landing/footer";

export function LandingPage() {
  return (
    <main className="relative flex min-h-screen flex-col overflow-x-hidden">
      <LandingNav />
      <LandingHero />
      <FeatureBento />
      <LandingMetrics />
      <LandingCta />
      <LandingFooter />
    </main>
  );
}
