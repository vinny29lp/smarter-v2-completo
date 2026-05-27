/**
 * Wraps any document HTML with print-to-PDF infrastructure.
 * The browser opens the page and immediately triggers window.print(),
 * so the user sees the native "Save as PDF" dialog.
 */
export function wrapParaPDF(html: string, titulo: string = "Documento"): string {
  // If the HTML already has <html> wrapper, inject the print script before </body>
  if (html.includes("</body>")) {
    return html
      .replace("</body>", `
<script>
  window.addEventListener("load", function () {
    setTimeout(function () { window.print(); }, 300);
  });
</script>
</body>`)
      .replace(/<title>[^<]*<\/title>/, `<title>${titulo}</title>`);
  }

  // Otherwise wrap it
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${titulo}</title>
  <style>
    @media print { @page { margin: 10mm; } }
    body { font-family: Arial, sans-serif; }
  </style>
</head>
<body>
${html}
<script>
  window.addEventListener("load", function () {
    setTimeout(function () { window.print(); }, 300);
  });
</script>
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
