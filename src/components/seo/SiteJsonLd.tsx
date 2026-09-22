import { getSiteContent } from "@/lib/content";
import { getLocalized } from "@/lib/locale";
import { getSiteUrl } from "@/lib/site-url";

const SIDE_LINE_INTERVIEW_URL =
  "https://www.side-line.com/click-interview-with-reakton-how-would-it-sound-if-kraftwerk-continued-to-write-music/";

const ALBUM_EXTERNAL_URL: Record<string, string> = {
  weltall: "https://reakton.bandcamp.com/album/weltall-erde-mensch",
  nano: "https://reakton.bandcamp.com/album/micro-macro-nano",
};

const ALBUM_DATE_PUBLISHED: Record<string, string> = {
  weltall: "2019",
  nano: "2022-07-22",
};

const MUSIC_GROUP_DESCRIPTION =
  "Elektro-Duo aus Berlin. Robotronic Music — Elektronik in der Tradition von Kraftwerk und deutscher Synthpop-Kultur.";

export function SiteJsonLd() {
  const content = getSiteContent();
  const siteUrl = getSiteUrl();
  const musicGroupId = `${siteUrl}/#musicgroup`;

  const sameAs = [
    content.siteLinks.youtube,
    content.siteLinks.instagram,
    content.siteLinks.facebook,
    "https://reakton.bandcamp.com",
    ALBUM_EXTERNAL_URL.weltall,
    ALBUM_EXTERNAL_URL.nano,
  ].filter((url) => url.trim());

  const albumNodes = content.worlds.map((world) => {
    const albumId = `${siteUrl}/#album-${world.id}`;
    const name = getLocalized(world.albumTitle, "de");
    const url = ALBUM_EXTERNAL_URL[world.id] ?? `${siteUrl}/de`;
    const datePublished = ALBUM_DATE_PUBLISHED[world.id];

    return {
      "@type": "MusicAlbum" as const,
      "@id": albumId,
      name,
      url,
      byArtist: { "@id": musicGroupId },
      ...(datePublished ? { datePublished } : {}),
    };
  });

  const data = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${siteUrl}/#website`,
        url: siteUrl,
        name: "REAKTON",
        inLanguage: ["de", "en", "ja"],
        publisher: { "@id": musicGroupId },
      },
      {
        "@type": "MusicGroup",
        "@id": musicGroupId,
        name: "REAKTON",
        url: siteUrl,
        description: MUSIC_GROUP_DESCRIPTION,
        genre: ["Electronic", "Synthpop", "Robotronic"],
        foundingLocation: {
          "@type": "Place",
          name: "Berlin",
          address: {
            "@type": "PostalAddress",
            addressLocality: "Berlin",
            addressCountry: "DE",
          },
        },
        member: [
          { "@type": "Person", name: "Robert Waters" },
          { "@type": "Person", name: "Adriano Theel" },
        ],
        album: albumNodes.map((album) => ({ "@id": album["@id"] })),
        sameAs,
        subjectOf: {
          "@type": "Article",
          headline:
            "Click Interview with Reakton: How Would It Sound If Kraftwerk Continued To Write Music?",
          url: SIDE_LINE_INTERVIEW_URL,
          inLanguage: "en",
        },
      },
      ...albumNodes,
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
