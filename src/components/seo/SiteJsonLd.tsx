import { getSiteContent } from "@/lib/content";
import { getSiteUrl } from "@/lib/site-url";

export function SiteJsonLd() {
  const content = getSiteContent();
  const sameAs = [
    content.siteLinks.youtube,
    content.siteLinks.instagram,
    content.siteLinks.facebook,
  ].filter((url) => url.trim());

  const data = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${getSiteUrl()}/#website`,
        url: getSiteUrl(),
        name: "REAKTON",
        inLanguage: ["de", "en", "ja"],
      },
      {
        "@type": "MusicGroup",
        "@id": `${getSiteUrl()}/#musicgroup`,
        name: "REAKTON",
        url: getSiteUrl(),
        genre: "Electronic",
        sameAs,
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
