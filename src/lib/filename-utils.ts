/**
 * Utilities for strictly preserving whiteboard names and uploaded/downloaded filenames.
 * 
 * Rules:
 * 1. Only remove the trailing file extension (e.g. ".png", ".jpg", ".pdf", ".json") when deriving a whiteboard title from a file.
 * 2. Preserve ALL characters literally:
 *    - Spaces
 *    - Capitalization
 *    - Dashes / hyphens (existing)
 *    - Underscores (existing)
 *    - Parentheses, brackets, ampersands, punctuation
 *    - Unicode characters (e.g. "Réunion équipe", "Проект", "数学ノート")
 *    - Dots within the name (e.g. "Board.v2.png" -> "Board.v2")
 * 3. Never slugify, lowercase, or replace spaces with hyphens/underscores.
 * 4. When downloading/exporting, append the exact target extension to the literal whiteboard name.
 */

export function stripFileExtension(filename: string): string {
  if (!filename || typeof filename !== "string") return "";
  const lastDot = filename.lastIndexOf(".");
  if (lastDot > 0) {
    return filename.substring(0, lastDot);
  }
  return filename;
}

export function buildDownloadFilename(boardName: string | undefined | null, extension: string): string {
  const baseName = (boardName && boardName.length > 0) ? boardName : "Whiteboard";
  const ext = extension.startsWith(".") ? extension : `.${extension}`;
  return `${baseName}${ext}`;
}
