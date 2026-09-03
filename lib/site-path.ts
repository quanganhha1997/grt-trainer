const requestedBasePath =
  process.env.NEXT_PUBLIC_GITHUB_PAGES_BASE_PATH?.trim() ?? "";

export const siteBasePath = requestedBasePath
  ? `/${requestedBasePath.replace(/^\/+|\/+$/g, "")}`
  : "";

export function sitePath(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${siteBasePath}${normalizedPath}`;
}
