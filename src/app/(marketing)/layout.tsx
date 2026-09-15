import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export default function MarketingLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="marketing-layout">
      <div className="marketing-hero-background" aria-hidden="true" />
      <SiteHeader showMarketingNav />
      {children}
      <SiteFooter />
    </div>
  );
}
