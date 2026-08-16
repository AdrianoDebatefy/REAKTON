/** Encode public asset paths so special characters in upload filenames load correctly. */
export function resolvePublicAssetUrl(path: string): string {
  if (!path || path.startsWith("http") || path.startsWith("blob:") || path.startsWith("data:")) {
    return path;
  }
  if (!path.startsWith("/")) return path;

  const lastSlash = path.lastIndexOf("/");
  if (lastSlash === -1) return path;

  const directory = path.slice(0, lastSlash + 1);
  const filename = path.slice(lastSlash + 1);
  return `${directory}${encodeURIComponent(filename)}`;
}
