// React 19 place automatiquement <title>, <meta> et <link> dans le <head>.
export function Seo({ title, description, path, image, noindex, jsonLd }: {
  title: string; description?: string; path?: string; image?: string; noindex?: boolean; jsonLd?: Record<string, unknown>;
}) {
  const url = path ? `${window.location.origin}${path}` : undefined;
  return (
    <>
      <title>{title}</title>
      {description && <meta name="description" content={description} />}
      {url && <link rel="canonical" href={url} />}
      <meta property="og:title" content={title} />
      {description && <meta property="og:description" content={description} />}
      {image && <meta property="og:image" content={image} />}
      {noindex && <meta name="robots" content="noindex" />}
      {jsonLd && <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>}
    </>
  );
}
