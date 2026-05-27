/**
 * Wraps any document HTML with print-to-PDF infrastructure.
 * The browser opens the page and immediately triggers window.print(),
 * so the user sees the native "Save as PDF" dialog.
 *
 * Key CSS approach:
 *   @page { margin: 0 } → removes browser default margins
 *   .doc { padding: 12mm 14mm } → document controls its own margins
 *   print-color-adjust: exact → preserves gradient headers and colored elements
 */

const PRINT_CSS = `
/* ── PRINT RESET ─────────────────────────────────────────── */
@page {
  size: A4 portrait;
  margin: 0;
}

@media print {
  html, body {
    margin: 0 !important;
    padding: 0 !important;
    background: white !important;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
    color-adjust: exact !important;
  }

  /* Remove body background (gray canvas), let .doc fill entire page */
  body { background: white !important; }

  /* .doc fills full A4 page — padding is the margin */
  .doc {
    width: 100% !important;
    max-width: 100% !important;
    min-height: 0 !important;
    margin: 0 !important;
    padding: 12mm 14mm 16mm !important;
    box-shadow: none !important;
  }

  /* Force color/background preservation on all elements */
  * {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
    color-adjust: exact !important;
  }

  /* Preserve grid and flex layouts */
  .grid-2, [style*="grid-template-columns"],
  [style*="display:grid"], [style*="display: grid"] {
    display: grid !important;
  }
  [style*="display:flex"], [style*="display: flex"] {
    display: flex !important;
  }

  /* Prevent awkward page breaks inside sections */
  .section-box, .cls-block, .party-box,
  .sec, .fg, .disc-header, .grid-2 > div {
    break-inside: avoid;
    page-break-inside: avoid;
  }

  /* Keep headers from being orphaned at page bottom */
  h2, h3, h4, .sec-head, .dh {
    break-after: avoid;
    page-break-after: avoid;
  }

  /* Watermark visible in print */
  .watermark {
    display: block !important;
    -webkit-print-color-adjust: exact !important;
  }
}

/* ── SCREEN: show print preview styled like the document ── */
@media screen {
  body { background: #e5e7eb; }
}
`;

export function wrapParaPDF(html: string, titulo: string = "Documento"): string {
  // Inject print CSS into existing <style> or add new <style> tag in <head>
  const printStyleTag = `<style>${PRINT_CSS}</style>`;
  const printScript = `<script>
  window.addEventListener("load", function () {
    setTimeout(function () { window.print(); }, 400);
  });
</script>`;

  if (html.includes("</head>")) {
    // Inject print CSS into head and print script before </body>
    return html
      .replace("</head>", `${printStyleTag}\n</head>`)
      .replace("</body>", `${printScript}\n</body>`)
      .replace(/<title>[^<]*<\/title>/, `<title>${titulo}</title>`);
  }

  if (html.includes("</body>")) {
    return html
      .replace("</body>", `${printStyleTag}\n${printScript}\n</body>`)
      .replace(/<title>[^<]*<\/title>/, `<title>${titulo}</title>`);
  }

  // Fallback: full wrapper
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${titulo}</title>
  ${printStyleTag}
</head>
<body>
${html}
${printScript}
</body>
</html>`;
}

/** Returns the HTTP headers for a print-to-PDF HTML response */
export function pdfResponseHeaders(filename: string) {
  const safe = filename.replace(/[^a-zA-Z0-9_\-\.]/g, "_");
  return {
    "Content-Type": "text/html; charset=utf-8",
    "Content-Disposition": `inline; filename="${safe}.html"`,
    "X-Download-As": "pdf",
  };
}
