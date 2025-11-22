import Header from "@/components/Header";
import Hero from "@/components/Hero";
import WhoItIsFor from "@/components/WhoItIsFor";
import FeaturePillars from "@/components/FeaturePillars";
import Timeline from "@/components/Timeline";
import HowItWorks from "@/components/HowItWorks";
import Benefits from "@/components/Benefits";
import PricingTeaser from "@/components/PricingTeaser";
import SecuritySnapshot from "@/components/SecuritySnapshot";
import FAQ from "@/components/FAQ";
import CallToAction from "@/components/CallToAction";
import Footer from "@/components/Footer";
import DemoModal from "@/components/DemoModal";
import { Suspense } from "react";
import { Analytics } from "@vercel/analytics/next"
import { SpeedInsights } from "@vercel/speed-insights/next"
import CursorSpotlight from "@/components/CursorSpotlight";

export default function Page() {
  return (
    <>
      <CursorSpotlight />

      {/* Global Background Gradient */}
      <div className="fixed inset-0 z-0 pointer-events-none bg-gradient-to-b from-black via-black to-brand-950/80" />

      <Header />
      <main className="overflow-x-hidden relative z-10">
        <Hero />
        <section id="who" className="section-padding">
          <WhoItIsFor />
        </section>
        <section
          id="features"
          className="section-padding"
        >
          <FeaturePillars />
        </section>
        <section id="stages" className="section-padding">
          <Timeline />
        </section>
        <section
          id="how-it-works"
          className="section-padding"
        >
          <HowItWorks />
        </section>
        <section id="benefits" className="section-padding">
          <Benefits />
        </section>
        <section
          id="pricing"
          className="section-padding"
        >
          <PricingTeaser />
        </section>
        <section id="security" className="section-padding">
          <SecuritySnapshot />
        </section>
        <section
          id="faq"
          className="section-padding"
        >
          <FAQ />
        </section>
        <section id="contact" className="section-padding">
          <CallToAction />
        </section>
      </main>
      <Footer />
      <Suspense>
        <DemoModal />
      </Suspense>
      <Analytics />
      <SpeedInsights />
    </>
  );
}
