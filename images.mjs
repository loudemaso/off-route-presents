// All displayed images use the same CDN transformation path. Source URLs are
// immutable for published media; the originals stay in Blobs or the repository.
export function imageURL(source, width) {
  const query = new URLSearchParams({
    url: source,
    w: String(width),
    fm: "webp",
    q: "82",
  });
  return "/.netlify/images?" + query.toString().replaceAll("&", "&amp;");
}

export function imageTag(
  item,
  {
    eager = false,
    sizes = "(max-width: 700px) 89vw, 420px",
    widths = [320, 640, 960],
    className = "",
    width,
    height,
  } = {},
) {
  const source = item.image;
  const dimensions =
    item.imageWidth && item.imageHeight
      ? ` width="${item.imageWidth}" height="${item.imageHeight}"`
      : width && height
        ? ` width="${width}" height="${height}"`
        : "";
  const srcset = widths
    .map((size) => `${imageURL(source, size)} ${size}w`)
    .join(", ");
  return `<img${className ? ` class="${className}"` : ""} src="${imageURL(source, widths[1] || widths[0])}" srcset="${srcset}" sizes="${sizes}" alt="${item.alt || ""}"${dimensions} loading="${eager ? "eager" : "lazy"}" decoding="async"${eager ? ' fetchpriority="high"' : ""}>`;
}
