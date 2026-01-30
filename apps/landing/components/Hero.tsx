"use client";

import { Button } from "./ui/button"
import { ArrowRight } from "lucide-react"
import { ParticleTextEffect } from "./particle-text-effect"
import { InfiniteSlider } from "./ui/infinite-slider"
import { ProgressiveBlur } from "./ui/progressive-blur"
import { SITE_CONFIG } from "@/lib/site.config";
import Link from "next/link";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export default function Hero() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const particleColor = mounted && resolvedTheme === "light"
    ? { r: 0, g: 0, b: 0 } // Black
    : { r: 255, g: 255, b: 255 };

  const fadeColor = mounted && resolvedTheme === "light"
    ? { r: 255, g: 255, b: 255 } // White
    : { r: 0, g: 0, b: 0 }; // Black
  return (
    <section className="relative min-h-screen flex flex-col justify-between overflow-hidden pt-20 pb-4 md:py-20 px-4">
      {/* Full Screen Particle Effect */}
      <div className="absolute inset-0 z-0">
        <ParticleTextEffect
          key={mounted ? resolvedTheme : "initial"}
          words={["SAMI", "Predict", "Protect", "Profit"]}
          backgroundColor="transparent"
          particleColor={particleColor}
          fadeColor={fadeColor}
        />
      </div>

      {/* spacer to push content down if needed, or just center the text effect visually by default */}
      <div className="flex-1"></div>

      {/* Content Overlay */}
      <div className="container mx-auto text-center relative z-10 pb-8 pointer-events-none">
        {/* Pointer events auto for interactive children */}
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-neutral-900 dark:text-white mb-6 text-balance">
            Shed AI Manager Interface - <span className="text-red-500">Predict. Protect. Profit.</span>
          </h2>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12 pointer-events-auto">
            <Button asChild size="lg" className="bg-red-700 hover:bg-red-600 text-white group">
              <Link href={SITE_CONFIG.loginPath}>
                Login
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
            <Button
              data-demo-trigger
              size="lg"
              variant="outline"
              className="border-red-500 text-red-500 hover:bg-red-50 hover:text-red-600 bg-transparent"
            >
              Request a Demo
            </Button>
          </div>

          <div className="mt-16 mb-8 pointer-events-auto">
            <div className="group relative m-auto max-w-6xl">
              <div className="flex flex-col items-center md:flex-row">
                <div className="md:max-w-44 md:border-r md:border-gray-600 md:pr-6 mb-4 md:mb-0">
                  <p className="text-end text-md text-neutral-900 dark:text-gray-400">Powering All Sheds</p>
                </div>
                <div className="relative py-6 md:w-[calc(100%-11rem)]">
                  {/* Mobile View: Static Row */}
                  <div className="md:hidden flex flex-row justify-center gap-6 items-center px-2">
                    <div className="flex">
                      <img
                        className="mx-auto h-8 w-fit opacity-60 hover:opacity-100 transition-opacity"
                        src="/images/ioc_logo_circle_color.svg"
                        alt="IOC Logo"
                        height="16"
                        width="auto"
                      />
                    </div>
                    <div className="flex">
                      <img
                        className="mx-auto h-8 w-fit opacity-60 hover:opacity-100 transition-opacity"
                        src="/images/sinopec_logo_circle_color.svg"
                        alt="Sinopec Logo"
                        height="16"
                        width="auto"
                      />
                    </div>
                    <div className="flex">
                      <img
                        className="mx-auto h-8 w-fit opacity-60 hover:opacity-100 transition-opacity"
                        src="/images/ceypetco_logo_circle_color.svg"
                        alt="Ceypetco Logo"
                        height="20"
                        width="auto"
                      />
                    </div>
                    <div className="flex">
                      <img
                        className="mx-auto h-8 w-fit opacity-60 hover:opacity-100 transition-opacity"
                        src="/images/shell_logo_circle_color.svg"
                        alt="Shell Logo"
                        height="16"
                        width="auto"
                      />
                    </div>
                  </div>

                  {/* Desktop View: Infinite Slider */}
                  <div className="hidden md:block">
                    <InfiniteSlider durationOnHover={20} duration={40} gap={112}>
                      <div className="flex">
                        <img
                          className="mx-auto h-9 w-fit opacity-60 hover:opacity-100 transition-opacity"
                          src="/images/ioc_logo_circle_color.svg"
                          alt="IOC Logo"
                          height="16"
                          width="auto"
                        />
                      </div>
                      <div className="flex">
                        <img
                          className="mx-auto h-9 w-fit opacity-60 hover:opacity-100 transition-opacity"
                          src="/images/sinopec_logo_circle_color.svg"
                          alt="Sinopec Logo"
                          height="16"
                          width="auto"
                        />
                      </div>
                      <div className="flex">
                        <img
                          className="mx-auto h-9 w-fit opacity-60 hover:opacity-100 transition-opacity"
                          src="/images/ceypetco_logo_circle_color.svg"
                          alt="Ceypetco Logo"
                          height="20"
                          width="auto"
                        />
                      </div>
                      <div className="flex">
                        <img
                          className="mx-auto h-9 w-fit opacity-60 hover:opacity-100 transition-opacity"
                          src="/images/shell_logo_circle_color.svg"
                          alt="Shell Logo"
                          height="16"
                          width="auto"
                        />
                      </div>
                    </InfiniteSlider>
                  </div>

                  <ProgressiveBlur
                    className="pointer-events-none absolute left-0 top-0 h-full w-20 hidden md:block"
                    direction="left"
                    blurIntensity={1}
                  />
                  <ProgressiveBlur
                    className="pointer-events-none absolute right-0 top-0 h-full w-20 hidden md:block"
                    direction="right"
                    blurIntensity={1}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
