/**
 * Builds the public legal site from the Markdown in ../legal/.
 *
 * No dependencies — run with:  node build.mjs
 *
 * Regenerate and re-push whenever you edit the Markdown so the hosted
 * pages don't drift from the source of truth.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const LEGAL_DIR = join(__dirname, "..", "legal");

const SITE = {
  appName: "Thyroid Compass",
  tagline: "Make sense of your thyroid labs.",
  email: "support@thyroidcompass.app",
  accent: "#0F766E",
  accentDark: "#134E4A",
};

// ---------------------------------------------------------------------------
// Minimal Markdown → HTML. Handles the subset our documents actually use.
// ---------------------------------------------------------------------------

function mdToHtml(md) {
  const lines = md.split("\n");
  const out = [];
  let inList = false;
  let inQuote = false;

  const inline = (s) =>
    s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      // links must run before emphasis so URLs aren't mangled
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/(^|[^*])\*([^*]+)\*/g, "$1<em>$2</em>")
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      // bare URLs
      .replace(
        /(^|\s)(https?:\/\/[^\s<]+)/g,
        '$1<a href="$2">$2</a>'
      );

  const closeList = () => {
    if (inList) {
      out.push("</ul>");
      inList = false;
    }
  };
  const closeQuote = () => {
    if (inQuote) {
      out.push("</blockquote>");
      inQuote = false;
    }
  };

  for (const raw of lines) {
    const line = raw.trimEnd();

    if (!line.trim()) {
      closeList();
      closeQuote();
      continue;
    }

    if (line.startsWith("---")) {
      closeList();
      closeQuote();
      out.push("<hr />");
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      closeList();
      closeQuote();
      const level = heading[1].length;
      out.push(`<h${level}>${inline(heading[2])}</h${level}>`);
      continue;
    }

    if (line.startsWith("> ")) {
      closeList();
      if (!inQuote) {
        out.push("<blockquote>");
        inQuote = true;
      }
      out.push(`${inline(line.slice(2))}<br />`);
      continue;
    }
    closeQuote();

    const bullet = line.match(/^\s*[-*]\s+(.*)$/);
    if (bullet) {
      if (!inList) {
        out.push("<ul>");
        inList = true;
      }
      out.push(`<li>${inline(bullet[1])}</li>`);
      continue;
    }
    closeList();

    out.push(`<p>${inline(line)}</p>`);
  }

  closeList();
  closeQuote();
  return out.join("\n");
}

// ---------------------------------------------------------------------------
// Page shell
// ---------------------------------------------------------------------------

function page({ title, body, showBack = true }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${title} — ${SITE.appName}</title>
<meta name="description" content="${SITE.appName} — ${SITE.tagline}" />
<style>
  :root {
    --accent: ${SITE.accent};
    --accent-dark: ${SITE.accentDark};
    --bg: #fbfaf8;
    --card: #ffffff;
    --text: #1c1917;
    --muted: #78716c;
    --border: #edeae4;
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --accent: #5eead4;
      --accent-dark: #99f6e4;
      --bg: #0a0a0a;
      --card: #1c1917;
      --text: #fafaf9;
      --muted: #a8a29e;
      --border: #2d2b27;
    }
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    background: var(--bg);
    color: var(--text);
    font: 16px/1.65 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
      Helvetica, Arial, sans-serif;
    -webkit-font-smoothing: antialiased;
  }
  header {
    background: linear-gradient(135deg, ${SITE.accent}, ${SITE.accentDark});
    color: #fff;
    padding: 40px 24px;
  }
  header .inner { max-width: 760px; margin: 0 auto; }
  header a { color: #fff; text-decoration: none; }
  header h1 { margin: 0; font-size: 26px; letter-spacing: -0.3px; }
  header p { margin: 6px 0 0; opacity: 0.85; font-size: 15px; }
  main {
    max-width: 760px;
    margin: 0 auto;
    padding: 40px 24px 80px;
  }
  h1, h2, h3 { line-height: 1.25; letter-spacing: -0.2px; }
  main > h1 { font-size: 30px; margin-top: 0; }
  h2 {
    font-size: 21px;
    margin-top: 40px;
    padding-top: 20px;
    border-top: 1px solid var(--border);
  }
  h3 { font-size: 17px; margin-top: 28px; }
  a { color: var(--accent); }
  code {
    background: var(--border);
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 0.9em;
  }
  blockquote {
    margin: 20px 0;
    padding: 14px 18px;
    background: var(--card);
    border-left: 3px solid var(--accent);
    border-radius: 8px;
    color: var(--muted);
  }
  hr { border: none; border-top: 1px solid var(--border); margin: 32px 0; }
  ul { padding-left: 22px; }
  li { margin: 6px 0; }
  .back {
    display: inline-block;
    margin-bottom: 24px;
    font-size: 14px;
    text-decoration: none;
  }
  .cards { display: grid; gap: 14px; margin-top: 28px; }
  .card {
    display: block;
    padding: 20px;
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 14px;
    text-decoration: none;
    color: var(--text);
    transition: transform 0.15s ease, border-color 0.15s ease;
  }
  .card:hover { transform: translateY(-2px); border-color: var(--accent); }
  .card strong { display: block; font-size: 17px; margin-bottom: 4px; }
  .card span { color: var(--muted); font-size: 14px; }
  footer {
    max-width: 760px;
    margin: 0 auto;
    padding: 0 24px 60px;
    color: var(--muted);
    font-size: 14px;
  }
</style>
</head>
<body>
<header>
  <div class="inner">
    <a href="./"><h1>${SITE.appName}</h1></a>
    <p>${SITE.tagline}</p>
  </div>
</header>
<main>
${showBack ? '<a class="back" href="./">← Back</a>' : ""}
${body}
</main>
<footer>
  <p>Questions? <a href="mailto:${SITE.email}">${SITE.email}</a></p>
</footer>
</body>
</html>
`;
}

// ---------------------------------------------------------------------------
// Build
// ---------------------------------------------------------------------------

const privacyMd = readFileSync(join(LEGAL_DIR, "privacy-policy.md"), "utf8");
const termsMd = readFileSync(join(LEGAL_DIR, "terms-of-service.md"), "utf8");

writeFileSync(
  join(__dirname, "privacy.html"),
  page({ title: "Privacy Policy", body: mdToHtml(privacyMd) })
);

writeFileSync(
  join(__dirname, "terms.html"),
  page({ title: "Terms of Service", body: mdToHtml(termsMd) })
);

const indexBody = `
<h1>${SITE.tagline}</h1>
<p>
  Thyroid Compass helps people with Hashimoto's, hypothyroidism, Graves'
  disease, and post-thyroidectomy make sense of their lab results — tracking
  markers over time, spotting patterns alongside symptoms, and preparing for
  appointments.
</p>
<p style="color:var(--muted);font-size:15px">
  Thyroid Compass is a wellness tool, not a medical device. It does not
  diagnose or treat any condition. Always discuss your results with a
  qualified healthcare provider.
</p>

<div class="cards">
  <a class="card" href="./privacy.html">
    <strong>Privacy Policy</strong>
    <span>What we collect, where it's stored, and the control you have over it.</span>
  </a>
  <a class="card" href="./terms.html">
    <strong>Terms of Service</strong>
    <span>Subscription terms, medical disclaimers, and acceptable use.</span>
  </a>
  <a class="card" href="mailto:${SITE.email}">
    <strong>Support</strong>
    <span>${SITE.email}</span>
  </a>
</div>
`;

writeFileSync(
  join(__dirname, "index.html"),
  page({ title: "Home", body: indexBody, showBack: false })
);

console.log("Built: index.html, privacy.html, terms.html");
