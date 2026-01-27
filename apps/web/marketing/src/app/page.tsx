import { HeroSection } from '@/components/sections/HeroSection';
import { TrustedBySection } from '@/components/sections/TrustedBySection';
import { FeaturesSection } from '@/components/sections/FeaturesSection';
import { StatsSection } from '@/components/sections/StatsSection';
import { TokenizedAssetsSection } from '@/components/sections/TokenizedAssetsSection';
import { PricingSection } from '@/components/sections/PricingSection';
import { TestimonialsSection } from '@/components/sections/TestimonialsSection';
import { FAQSection } from '@/components/sections/FAQSection';
import { CTASection } from '@/components/sections/CTASection';

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <TrustedBySection />
      <FeaturesSection />
      <StatsSection />
      <TokenizedAssetsSection />
      <PricingSection />
      <TestimonialsSection />
      <FAQSection />
      <CTASection />
    </>
  );
}
