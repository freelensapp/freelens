import type { MarketplaceExtensionAuthor } from "../../marketplace-extensions/marketplace-extensions.injectable";

/**
 * The first letters of the first and the last word of the full name.
 */
export const initialsOf = (author: MarketplaceExtensionAuthor): string => {
  const words = author.name.trim().split(/\s+/);
  const first = words[0]?.[0] ?? "";
  const last = words.length > 1 ? (words[words.length - 1][0] ?? "") : "";

  return (first + last).toUpperCase();
};

export const fullNameOf = (author: MarketplaceExtensionAuthor): string => author.name;

export const isGithubUrl = (url: string): boolean => {
  try {
    return new URL(url).hostname === "github.com";
  } catch {
    return false;
  }
};

export const authorKey = (author: MarketplaceExtensionAuthor): string => `${author.name}-${author.url ?? ""}`;
