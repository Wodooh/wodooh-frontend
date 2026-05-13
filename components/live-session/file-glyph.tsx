/**
 * Small color-coded glyph for a session material — PPTX (orange), PDF (red),
 * DOCX (blue), XLSX (green). Color comes from CSS data-attribute selectors
 * defined in `app/nexus.css` so it themes correctly in dark mode.
 */

import type { MaterialFormat } from "@/lib/types/live-session.types";
import { cn } from "@/lib/utils";

const LABEL: Record<MaterialFormat, string> = {
  pptx: "PPT",
  pdf:  "PDF",
  docx: "DOC",
  xlsx: "XLS",
};

interface FileGlyphProps {
  format: MaterialFormat;
  className?: string;
}

export function FileGlyph({ format, className }: FileGlyphProps) {
  return (
    <span
      className={cn("nx-file-glyph", className)}
      data-format={format}
      aria-hidden
    >
      {LABEL[format]}
    </span>
  );
}
