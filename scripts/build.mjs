import { promises as fs } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";

const rootDir = process.cwd();
const contentDir = path.join(rootDir, "content");
const postsDir = path.join(contentDir, "posts");
const distDir = path.join(rootDir, "dist");
const assetsDir = path.join(rootDir, "src");
const plausibleDomain = process.env.PLAUSIBLE_DOMAIN || "vikramchopra.in";
const plausibleScriptSrc = process.env.PLAUSIBLE_SCRIPT_SRC || "https://plausible.io/js/script.js";
const mediaAssetVersion = resolveMediaAssetVersion();
const CURATED_ESSAY_COLLECTIONS = [
  {
    id: "mobility-ownership-trust",
    title: "Mobility, Ownership, and Trust",
    description: "How messy assets become trustworthy enough to buy, finance, keep, and use.",
    slugs: [
      "the-coming-decade-of-car-ownership-in-india",
      "used-car-ownership-is-a-lending-problem",
      "the-greenest-car-in-india-is-the-one-already-built",
      "indias-road-deaths-are-a-trust-problem-not-a-traffic-problem",
      "why-we-are-not-selling-cars"
    ]
  },
  {
    id: "ai-work-company-design",
    title: "Organization, AI, and Company Design",
    description: "How companies learn, stay steady under pressure, and redesign themselves as context gets cheaper and builders close loops faster.",
    slugs: [
      "scale-is-a-learning-problem",
      "ai-native-is-not-ai-first",
      "builder-is-the-only-role-left",
      "execution-problems-begin-as-trust-problems",
      "ai-will-do-for-consumer-what-saas-did-for-software"
    ]
  },
  {
    id: "judgment-desire-human-nature",
    title: "Judgment, Desire, and Human Nature",
    description: "How we misread our own desires, misjudge other people, and carry invisible psychological machinery into everyday life.",
    slugs: [
      "paranoid-survive-regulated-thrive",
      "who-taught-you-to-want-this",
      "you-judge-others-by-character-and-yourself-by-circumstance"
    ]
  }
];

const REDIRECTS = [
  {
    from: "most-execution-problems-are-trust-problems",
    to: "execution-problems-begin-as-trust-problems"
  },
  {
    from: "the-context-we-refuse-to-see",
    to: "you-judge-others-by-character-and-yourself-by-circumstance"
  },
  {
    from: "ai-may-do-for-consumer-what-saas-did-for-software",
    to: "ai-will-do-for-consumer-what-saas-did-for-software"
  },
  {
    from: "the-car-is-the-artifact-trust-is-the-product",
    to: "why-we-are-not-selling-cars"
  }
];

const START_HERE_SLUGS = [
  "the-coming-decade-of-car-ownership-in-india",
  "why-we-are-not-selling-cars",
  "paranoid-survive-regulated-thrive"
];

const CULTURE_DOCUMENTS = [
  {
    id: "flatland",
    slug: "flatland",
    title: "Flatland",
    meta: "Culture book - 33 pages",
    href: "/media/docs/flatland.pdf",
    cover: "/media/docs/flatland-cover-01.png",
    sourceFile: "flatland.en.txt",
    translationFile: "flatland.md",
    description: "An operating note for a flatter, faster Cars24: builder ownership, open information, AI-native work, and clarity over hierarchy."
  },
  {
    id: "values",
    slug: "values",
    title: "Our Values",
    meta: "Culture book - 22 pages",
    href: "/media/docs/cars24-values.pdf",
    cover: "/media/docs/values-cover-01.png",
    sourceFile: "cars24-values.en.txt",
    translationFile: "cars24-values.md",
    description: "Five values for how Cars24 works: customer love, ownership, truth, high standards, and becoming better humans through work."
  }
];

const CULTURE_LANGUAGES = [
  {
    code: "en",
    htmlLang: "en",
    label: "English",
    nativeLabel: "English",
    homePath: "/",
    readerNote: "Original English"
  },
  {
    code: "hi",
    htmlLang: "hi",
    label: "Hindi",
    nativeLabel: "हिन्दी",
    homePath: "/hi/",
    readerNote: "Claude translated",
    landingTitle: "हिन्दी reader",
    landingDek: "Flatland और Cars24 Values को हिन्दी में पढ़ें. ये pages Claude से tone-preserving translation के रूप में बनाए गए हैं, literal browser translation नहीं."
  },
  {
    code: "mr",
    htmlLang: "mr",
    label: "Marathi",
    nativeLabel: "मराठी",
    homePath: "/mr/",
    readerNote: "Claude translated",
    landingTitle: "मराठी reader",
    landingDek: "Flatland आणि Cars24 Values मराठीत वाचा. हे pages Claude ने message आणि tone जपत तयार केले आहेत; literal browser translation नाही."
  },
  {
    code: "gu",
    htmlLang: "gu",
    label: "Gujarati",
    nativeLabel: "ગુજરાતી",
    homePath: "/gu/",
    readerNote: "Claude translated",
    landingTitle: "ગુજરાતી reader",
    landingDek: "Flatland અને Cars24 Values ગુજરાતી ભાષામાં વાંચો. આ pages Claude દ્વારા message અને tone સાચવીને બનાવવામાં આવ્યા છે; literal browser translation નથી."
  },
  {
    code: "bn",
    htmlLang: "bn",
    label: "Bengali",
    nativeLabel: "বাংলা",
    homePath: "/bn/",
    readerNote: "Claude translated",
    landingTitle: "বাংলা reader",
    landingDek: "Flatland এবং Cars24 Values বাংলায় পড়ুন. এই pages Claude দিয়ে message এবং tone ধরে অনুবাদ করা হয়েছে; literal browser translation নয়."
  },
  {
    code: "ta",
    htmlLang: "ta",
    label: "Tamil",
    nativeLabel: "தமிழ்",
    homePath: "/ta/",
    readerNote: "Claude translated",
    landingTitle: "தமிழ் reader",
    landingDek: "Flatland மற்றும் Cars24 Values-ஐ தமிழில் படிக்கவும். இந்த pages Claude மூலம் message மற்றும் tone காக்கப்பட்ட translation ஆக உருவாக்கப்பட்டவை; literal browser translation அல்ல."
  },
  {
    code: "te",
    htmlLang: "te",
    label: "Telugu",
    nativeLabel: "తెలుగు",
    homePath: "/te/",
    readerNote: "Claude translated",
    landingTitle: "తెలుగు reader",
    landingDek: "Flatland మరియు Cars24 Values తెలుగులో చదవండి. ఇవి Claude ద్వారా message మరియు tone కాపాడుతూ రూపొందించిన pages; literal browser translation కాదు."
  },
  {
    code: "kn",
    htmlLang: "kn",
    label: "Kannada",
    nativeLabel: "ಕನ್ನಡ",
    homePath: "/kn/",
    readerNote: "Claude translated",
    landingTitle: "ಕನ್ನಡ reader",
    landingDek: "Flatland ಮತ್ತು Cars24 Values ಅನ್ನು ಕನ್ನಡದಲ್ಲಿ ಓದಿ. ಈ pages Claude ಮೂಲಕ message ಮತ್ತು tone ಉಳಿಸಿಕೊಂಡ translation ಆಗಿವೆ; literal browser translation ಅಲ್ಲ."
  },
  {
    code: "ml",
    htmlLang: "ml",
    label: "Malayalam",
    nativeLabel: "മലയാളം",
    homePath: "/ml/",
    readerNote: "Claude translated",
    landingTitle: "മലയാളം reader",
    landingDek: "Flatlandയും Cars24 Valuesയും മലയാളത്തിൽ വായിക്കുക. ഈ pages Claude ഉപയോഗിച്ച് message ഉം tone ഉം നിലനിർത്തി തയ്യാറാക്കിയ translation ആണ്; literal browser translation അല്ല."
  },
  {
    code: "pa",
    htmlLang: "pa",
    label: "Punjabi",
    nativeLabel: "ਪੰਜਾਬੀ",
    homePath: "/pa/",
    readerNote: "Claude translated",
    landingTitle: "ਪੰਜਾਬੀ reader",
    landingDek: "Flatland ਅਤੇ Cars24 Values ਪੰਜਾਬੀ ਵਿੱਚ ਪੜ੍ਹੋ. ਇਹ pages Claude ਨਾਲ message ਅਤੇ tone ਬਚਾ ਕੇ ਬਣਾਏ ਗਏ ਹਨ; literal browser translation ਨਹੀਂ."
  },
  {
    code: "or",
    htmlLang: "or",
    label: "Odia",
    nativeLabel: "ଓଡ଼ିଆ",
    homePath: "/or/",
    readerNote: "Claude translated",
    landingTitle: "ଓଡ଼ିଆ reader",
    landingDek: "Flatland ଓ Cars24 Values ଓଡ଼ିଆରେ ପଢ଼ନ୍ତୁ. ଏହି pages Claude ଦ୍ୱାରା message ଓ tone ରଖି translation ଭାବେ ତିଆରି; literal browser translation ନୁହେଁ."
  }
];

const DEFAULT_CULTURE_LANGUAGE = CULTURE_LANGUAGES[0];

async function main() {
  const site = JSON.parse(await fs.readFile(path.join(contentDir, "site.json"), "utf8"));
  site.socialImageMeta = await resolveImageMeta(site.socialImage || "");
  const posts = await loadPosts(site);
  const mediaDir = path.join(assetsDir, "media");
  const essayCollections = buildEssayCollections(posts);
  const collectionBySlug = buildCollectionBySlug(essayCollections);
  const cultureDocuments = await loadCultureDocuments();

  posts.sort((left, right) => right.date.localeCompare(left.date));

  await fs.rm(distDir, { recursive: true, force: true });
  await ensureDir(path.join(distDir, "archive"));
  await ensureDir(path.join(distDir, "posts"));
  await ensureDir(path.join(distDir, "subscribe"));
  await ensureDir(path.join(distDir, "culture"));
  await fs.copyFile(path.join(assetsDir, "styles.css"), path.join(distDir, "styles.css"));
  await fs.copyFile(path.join(assetsDir, "favicon.svg"), path.join(distDir, "favicon.svg"));
  await copyDirectoryIfPresent(mediaDir, path.join(distDir, "media"));
  await copyVerificationFiles();

  await fs.writeFile(path.join(distDir, "index.html"), renderHome(site, posts, essayCollections, cultureDocuments), "utf8");
  await fs.writeFile(path.join(distDir, "archive", "index.html"), renderArchive(site, essayCollections), "utf8");
  await fs.writeFile(path.join(distDir, "subscribe", "index.html"), renderSubscribePage(site), "utf8");
  await fs.writeFile(path.join(distDir, "404.html"), renderNotFound(site), "utf8");

  for (const language of CULTURE_LANGUAGES.filter((entry) => entry.code !== "en")) {
    const languageDir = path.join(distDir, language.code);
    await ensureDir(languageDir);
    await fs.writeFile(path.join(languageDir, "index.html"), renderCultureLanguageHome(site, cultureDocuments, language), "utf8");
  }

  for (const doc of cultureDocuments) {
    for (const version of doc.versions) {
      const docDir = path.join(distDir, version.pathName.replace(/^\/|\/$/g, ""));
      await ensureDir(docDir);
      await fs.writeFile(path.join(docDir, "index.html"), renderCultureDocumentPage(site, doc, version), "utf8");
    }
  }

  for (const post of posts) {
    const postDir = path.join(distDir, "posts", post.slug);
    await ensureDir(postDir);
    await fs.writeFile(path.join(postDir, "index.html"), renderPost(site, post, collectionBySlug.get(post.slug) || null), "utf8");
  }

  for (const redirect of REDIRECTS) {
    const postDir = path.join(distDir, "posts", redirect.from);
    await ensureDir(postDir);
    await fs.writeFile(
      path.join(postDir, "index.html"),
      renderRedirectPage(site, `/posts/${redirect.from}/`, `/posts/${redirect.to}/`),
      "utf8"
    );
  }

  await fs.writeFile(path.join(distDir, "rss.xml"), renderRss(site, posts), "utf8");
  await fs.writeFile(path.join(distDir, "sitemap.xml"), renderSitemap(site, posts, cultureDocuments), "utf8");
  await fs.writeFile(path.join(distDir, "robots.txt"), renderRobots(site), "utf8");
  await fs.writeFile(path.join(distDir, "llms.txt"), renderLlmsTxt(site, essayCollections, cultureDocuments), "utf8");
  await fs.writeFile(path.join(distDir, "_redirects"), renderRedirects(site), "utf8");
  await fs.writeFile(path.join(distDir, "_headers"), renderHeaders(), "utf8");

  console.log(`Built ${posts.length} post(s) into ${distDir}`);
}

async function copyVerificationFiles() {
  const entries = await fs.readdir(rootDir, { withFileTypes: true });
  const verificationFiles = entries
    .filter((entry) =>
      entry.isFile() && (
        entry.name === "CNAME" ||
        /^google[a-z0-9]+\.html$/i.test(entry.name) ||
        /^[a-z0-9]{8,128}\.txt$/i.test(entry.name)
      )
    )
    .map((entry) => entry.name);

  await Promise.all(
    verificationFiles.map((fileName) =>
      fs.copyFile(path.join(rootDir, fileName), path.join(distDir, fileName))
    )
  );
}

async function loadPosts(site) {
  const files = await fs.readdir(postsDir);
  const markdownFiles = files
    .filter((file) => file.endsWith(".md") && !path.basename(file).startsWith("_"))
    .sort();

  return Promise.all(
    markdownFiles.map(async (file) => {
      const absolutePath = path.join(postsDir, file);
      const raw = await fs.readFile(absolutePath, "utf8");
      const { attributes, body } = parseFrontMatter(raw);
      const { body: articleBody, sourcesLine } = extractSourcesLine(body);
      const slug = attributes.slug || file.replace(/\.md$/, "");
      const wordCount = articleBody.trim().split(/\s+/).filter(Boolean).length;
      const readingMinutes = Math.max(1, Math.round(wordCount / 220));
      const { html: bodyHtml, headings } = renderMarkdown(articleBody);
      warnIfEssayNeedsMainSections({ slug, category: attributes.category || "Essay", headings });
      return {
        site,
        slug,
        title: attributes.title || slugToTitle(slug),
        displayTitle: attributes.displayTitle || attributes.title || slugToTitle(slug),
        metaTitle: attributes.metaTitle || "",
        date: attributes.date || new Date().toISOString().slice(0, 10),
        description: attributes.description || createExcerpt(body),
        socialDescription: attributes.socialDescription || "",
        image: attributes.image || "",
        imageAlt: attributes.imageAlt || attributes.title || slugToTitle(slug),
        imageMeta: await resolveImageMeta(attributes.image || ""),
        articleImage: attributes.articleImage || "",
        articleImageAlt: attributes.articleImageAlt || attributes.imageAlt || attributes.title || slugToTitle(slug),
        summary: attributes.summary || "",
        category: attributes.category || "Essay",
        featured: attributes.featured === true,
        wordCount,
        readingMinutes,
        bodyHtml,
        headings,
        sourcesLine
      };
    })
  );
}

async function loadCultureDocuments() {
  return Promise.all(
    CULTURE_DOCUMENTS.map(async (doc) => {
      const englishSource = await fs.readFile(path.join(contentDir, "culture-docs", doc.sourceFile), "utf8");
      const versions = [
        {
          language: CULTURE_LANGUAGES[0],
          markdown: normalizeCultureSourceText(englishSource, doc),
          pathName: `/culture/${doc.slug}/`,
          pdfPath: doc.href
        }
      ];

      for (const language of CULTURE_LANGUAGES.slice(1)) {
        const translationPath = path.join(contentDir, "culture-docs", "translations", language.code, doc.translationFile);
        try {
          const markdown = await fs.readFile(translationPath, "utf8");
          versions.push({
            language,
            markdown,
            pathName: `/${language.code}/culture/${doc.slug}/`,
            pdfPath: culturePdfPath(doc, language)
          });
        } catch {
          // Missing translations are simply not exposed.
        }
      }

      return {
        ...doc,
        versions
      };
    })
  );
}

function culturePdfPath(doc, language) {
  if (!language || language.code === "en") {
    return doc.href;
  }

  const baseName = doc.id === "values" ? "cars24-values" : doc.slug;
  return `/media/docs/${baseName}-${language.code}.pdf`;
}

function getCultureVersion(doc, languageCode = "en") {
  return (doc.versions || []).find((version) => version.language.code === languageCode)
    || (doc.versions || []).find((version) => version.language.code === "en")
    || null;
}

function cultureLanguageTargets(site, activeLanguageCode = "en", doc = null) {
  return CULTURE_LANGUAGES.map((language) => {
    const version = doc ? getCultureVersion(doc, language.code) : null;
    const pathName = version?.pathName || language.homePath;

    return {
      language,
      pathName: sitePath(site, pathName),
      active: language.code === activeLanguageCode
    };
  });
}

function normalizeCultureSourceText(source, doc) {
  const lines = String(source || "")
    .replace(/\r/g, "")
    .replace(/\f/g, "\n\n")
    .split("\n")
    .map((line) => line.trimEnd())
    .filter((line) => {
      const trimmed = line.trim();
      if (!trimmed) {
        return true;
      }
      return ![
        /^CARS24\s*\/\s*2026\s*\/\s*FLATLAND/i,
        /^CARS24\s+2026\s+FLATLAND/i,
        /^CARS24\s+2026$/i,
        /^@ CARS24$/i,
        /^READ IN\b/i,
        /^SCROLL TO BEGIN$/i,
        /^LET.S BEGIN$/i,
        /^PAGE\s+\d+$/i,
        /^\d{1,2}$/
      ].some((pattern) => pattern.test(trimmed));
    });

  const blocks = lines
    .join("\n")
    .split(/\n{2,}/)
    .map((block) => block.trim().replace(/\n+/g, " "))
    .filter(Boolean)
    .filter((block) => block !== doc.title)
    .map((block) => {
      if (/^(PART|Part)\b/.test(block) || (block.length < 72 && !/[.!?।]$/.test(block))) {
        return `## ${block}`;
      }
      return block;
    });

  return `# ${doc.title}\n\n${blocks.join("\n\n")}`;
}

function extractSourcesLine(body) {
  const normalized = String(body || "").trim();
  const match = normalized.match(/\n\n\*Sources:\s*([\s\S]+?)\*\s*$/);

  if (!match) {
    return { body: normalized, sourcesLine: "" };
  }

  const articleBody = normalized.slice(0, match.index).trim();
  return {
    body: articleBody,
    sourcesLine: match[1].trim()
  };
}

function warnIfEssayNeedsMainSections({ slug, category, headings }) {
  if (category !== "Essay") {
    return;
  }

  const levelTwoHeadings = (headings || []).filter((heading) => heading.level === 2);

  if (levelTwoHeadings.length === 0) {
    return;
  }

  const notesIndex = levelTwoHeadings.findIndex((heading) => heading.id === "notes-and-sources");
  const mainHeadings = notesIndex === -1
    ? levelTwoHeadings
    : levelTwoHeadings.slice(0, notesIndex);

  if (mainHeadings.length === 0) {
    console.warn(`[toc] ${slug}: add main-article ## sections before "Notes and Sources" so the sidebar table of contents reflects the essay.`);
  }
}

function parseFrontMatter(raw) {
  if (!raw.startsWith("---\n")) {
    return { attributes: {}, body: raw.trim() };
  }

  const marker = "\n---\n";
  const closingIndex = raw.indexOf(marker, 4);

  if (closingIndex === -1) {
    return { attributes: {}, body: raw.trim() };
  }

  const frontMatter = raw.slice(4, closingIndex).trim();
  const body = raw.slice(closingIndex + marker.length).trim();
  const attributes = {};

  for (const line of frontMatter.split("\n")) {
    const separator = line.indexOf(":");
    if (separator === -1) {
      continue;
    }

    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim();
    attributes[key] = coerceValue(value);
  }

  return { attributes, body };
}

function coerceValue(value) {
  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }

  return value;
}

function renderMarkdown(markdown) {
  const lines = markdown.replace(/\r/g, "").split("\n");
  const blocks = [];
  const headings = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];

    if (!line.trim()) {
      index += 1;
      continue;
    }

    if (line.startsWith("```")) {
      const language = line.slice(3).trim();
      const codeLines = [];
      index += 1;

      while (index < lines.length && !lines[index].startsWith("```")) {
        codeLines.push(lines[index]);
        index += 1;
      }

      blocks.push(
        `<pre><code${language ? ` class="language-${escapeAttribute(language)}"` : ""}>${escapeHtml(codeLines.join("\n"))}</code></pre>`
      );
      index += 1;
      continue;
    }

    if (/^###\s+/.test(line)) {
      const text = line.replace(/^###\s+/, "");
      const id = slugifyHeading(text, headings);
      headings.push({ level: 3, text: stripFormatting(text), id });
      blocks.push(renderHeadingTag(3, id, text));
      index += 1;
      continue;
    }

    if (/^##\s+/.test(line)) {
      const text = line.replace(/^##\s+/, "");
      const id = slugifyHeading(text, headings);
      headings.push({ level: 2, text: stripFormatting(text), id });
      blocks.push(renderHeadingTag(2, id, text));
      index += 1;
      continue;
    }

    if (/^#\s+/.test(line)) {
      const text = line.replace(/^#\s+/, "");
      const id = slugifyHeading(text, headings);
      headings.push({ level: 1, text: stripFormatting(text), id });
      blocks.push(renderHeadingTag(1, id, text));
      index += 1;
      continue;
    }

    if (/^---+$/.test(line.trim())) {
      blocks.push("<hr>");
      index += 1;
      continue;
    }

    if (/^>\s?/.test(line)) {
      const quoteLines = [];

      while (index < lines.length && /^>\s?/.test(lines[index])) {
        quoteLines.push(lines[index].replace(/^>\s?/, ""));
        index += 1;
      }

      blocks.push(`<blockquote>${renderMarkdown(quoteLines.join("\n"))}</blockquote>`);
      continue;
    }

    if (/^[-*]\s+/.test(line)) {
      const items = [];

      while (index < lines.length && /^[-*]\s+/.test(lines[index])) {
        items.push(`<li>${renderInline(lines[index].replace(/^[-*]\s+/, ""))}</li>`);
        index += 1;
      }

      blocks.push(`<ul>${items.join("")}</ul>`);
      continue;
    }

    if (/^\d+\.\s+/.test(line)) {
      const items = [];

      while (index < lines.length && /^\d+\.\s+/.test(lines[index])) {
        items.push(`<li>${renderInline(lines[index].replace(/^\d+\.\s+/, ""))}</li>`);
        index += 1;
      }

      blocks.push(`<ol>${items.join("")}</ol>`);
      continue;
    }

    const paragraphLines = [];

    while (index < lines.length && !startsNewBlock(lines[index])) {
      paragraphLines.push(lines[index].trim());
      index += 1;
    }

    const paragraphText = paragraphLines.join(" ");
    const strongOnlyMatch = paragraphText.match(/^\*\*([^*]+)\*\*$/);

    if (strongOnlyMatch) {
      const text = strongOnlyMatch[1].trim();
      const id = slugifyHeading(text, headings);
      headings.push({ level: 2, text: stripFormatting(text), id });
      blocks.push(renderHeadingTag(2, id, text));
      continue;
    }

    blocks.push(`<p>${renderInline(paragraphText)}</p>`);
  }

  return { html: blocks.join("\n"), headings };
}

function renderHeadingTag(level, id, text) {
  const headingClass = id === "notes-and-sources" ? ` class="essay-summary-label"` : "";
  return `<h${level} id="${escapeAttribute(id)}"${headingClass}>${renderInline(text)}</h${level}>`;
}

function startsNewBlock(line) {
  if (!line.trim()) {
    return true;
  }

  return [
    /^```/,
    /^###\s+/,
    /^##\s+/,
    /^#\s+/,
    /^>\s?/,
    /^[-*]\s+/,
    /^\d+\.\s+/,
    /^---+$/
  ].some((pattern) => pattern.test(line));
}

function renderInline(text) {
  let output = escapeHtml(text);
  output = output.replace(/`([^`]+)`/g, "<code>$1</code>");
  output = output.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, href) => {
    return `<a href="${escapeAttribute(href)}">${label}</a>`;
  });
  output = output.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  output = output.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  return output;
}

function renderHome(site, posts, essayCollections, cultureDocuments) {
  const featured = posts.find((post) => post.featured) || posts[0];
  const interviews = Array.isArray(site.interviews) ? site.interviews : [];
  const interviewSections = groupBy(interviews, (interview) => interview.section || "Interviews");
  const elsewhere = Array.isArray(site.elsewhere) ? site.elsewhere : [];
  const postBySlug = new Map(posts.map((post) => [post.slug, post]));
  const imagePath = site.socialImage || featured?.image || "";
  const imageAlt = site.socialImageAlt || featured?.imageAlt || site.siteTitle;
  const imageMeta = site.socialImageMeta || featured?.imageMeta || null;

  return renderDocument({
    site,
    title: site.siteTitle,
    description: site.socialDescription || site.description,
    pathName: "/",
    imagePath,
    imageAlt,
    imageWidth: imageMeta?.width || null,
    imageHeight: imageMeta?.height || null,
    socialTitle: site.socialTitle || site.siteTitle,
    socialDescription: site.socialDescription || site.description,
    bodyClass: "home-page",
    openGraphType: "website",
    structuredData: buildWebsiteStructuredData(site),
    content: `
      <div class="page-shell">
        ${renderHeader(site)}
        <main class="content">
          <section class="home-intro">
            <h1>I write to think. I publish to be argued with.</h1>
            <p class="home-intro-copy">${renderHomeIntro(site)}</p>
            ${renderStartHere(site, postBySlug)}
          </section>

          ${renderCultureDocuments(site, cultureDocuments)}

          <section class="home-writing">
            <div class="home-section-head">
              <p class="home-label">Writing</p>
              <a href="${sitePath(site, "/archive/")}" class="inline-link">Essays</a>
            </div>
            <div class="essay-collections essay-collections-home">
              ${essayCollections.map((collection) => renderEssayCollection(collection, "home", site)).join("")}
            </div>
          </section>
          ${renderSubscribeModule(site, "home")}

          ${interviews.length > 0 ? renderHomeInterviewSections(interviewSections) : ""}
          ${elsewhere.length > 0 ? renderElsewhereSection(elsewhere) : ""}
        </main>
        ${renderFooter(site)}
      </div>
    `
  });
}

function renderArchive(site, essayCollections) {
  const archiveDescription = `Essays by ${site.name} on car ownership, trust, AI-native companies, and leadership under pressure.`;

  return renderDocument({
    site,
    title: `Essays | ${site.siteTitle}`,
    description: archiveDescription,
    pathName: "/archive/",
    imagePath: "",
    bodyClass: "archive-page",
    openGraphType: "website",
    structuredData: buildCollectionPageStructuredData(site, {
      pathName: "/archive/",
      title: `Essays | ${site.siteTitle}`,
      description: archiveDescription
    }),
    content: `
      <div class="page-shell">
        ${renderHeader(site)}
        <main class="content archive-content">
          <section class="archive-hero">
            <p class="eyebrow">Essays</p>
            <h1>Published writing</h1>
          </section>

          <div class="essay-collections essay-collections-archive">
            ${essayCollections.map((collection) => renderEssayCollection(collection, "archive", site)).join("")}
          </div>
        </main>
        ${renderFooter(site)}
      </div>
    `
  });
}

function renderSubscribePage(site) {
  const subscribe = normalizeSubscribe(site);

  return renderDocument({
    site,
    title: `Subscribe | ${site.siteTitle}`,
    description: subscribe.pageDek,
    pathName: "/subscribe/",
    imagePath: "",
    bodyClass: "subscribe-page",
    openGraphType: "website",
    structuredData: buildCollectionPageStructuredData(site, {
      pathName: "/subscribe/",
      title: `Subscribe | ${site.siteTitle}`,
      description: subscribe.pageDek
    }),
    content: `
      <div class="page-shell">
        ${renderHeader(site)}
        <main class="content">
          <section class="archive-hero subscribe-hero">
            <p class="eyebrow">${escapeHtml(subscribe.pageEyebrow)}</p>
            <h1>${escapeHtml(subscribe.pageTitle)}</h1>
            <p class="dek">${escapeHtml(subscribe.pageDek)}</p>
            <p class="home-intro-copy">${escapeHtml(subscribe.pageBody)}</p>
          </section>
          <section class="subscribe-page-panel" aria-label="Newsletter">
            <div class="subscribe-page-points">
              <p class="subscribe-page-label">What to expect</p>
              <ul class="subscribe-points">
                <li>New essays only.</li>
                <li>A few times a year, not every week.</li>
                <li>One confirmation email finishes the subscription.</li>
              </ul>
            </div>
            <div class="subscribe-page-form">
              ${renderSubscribeForm(site, "page")}
            </div>
          </section>
        </main>
        ${renderFooter(site)}
      </div>
    `
  });
}

function renderPost(site, post, collection) {
  const toc = renderTableOfContents(post);
  const metaTitle = post.metaTitle || post.title;
  return renderDocument({
    site,
    title: `${metaTitle} | ${site.siteTitle}`,
    description: post.description,
    socialTitle: `${metaTitle} | ${site.siteTitle}`,
    socialDescription: post.socialDescription || post.description,
    pathName: `/posts/${post.slug}/`,
    imagePath: post.image,
    imageAlt: post.imageAlt,
    imageWidth: post.imageMeta?.width || null,
    imageHeight: post.imageMeta?.height || null,
    bodyClass: "post-page",
    openGraphType: "article",
    publishedDate: post.date,
    structuredData: [
      buildArticleStructuredData(site, post),
      buildBreadcrumbStructuredData(site, post)
    ],
    content: `
      <div class="page-shell">
        ${renderHeader(site)}
        <main class="content">
          <article class="essay">
            <nav class="breadcrumb">
              <a href="${sitePath(site, "/")}">Home</a>
              <span>/</span>
              <a href="${sitePath(site, "/archive/")}">Essays</a>
            </nav>
            <header class="essay-header">
              <p class="eyebrow">${escapeHtml(post.category)}</p>
              <h1>${renderDisplayTitle(post.displayTitle)}</h1>
              <p class="dek">${escapeHtml(post.description)}</p>
              <div class="essay-meta-row">
                <div class="meta">
                  <span>${post.readingMinutes} min read</span>
                  <span>${post.wordCount} words</span>
                </div>
                <button class="share-button" type="button" data-share-button data-share-url="${escapeAttribute(absoluteUrl(site.domain, sitePath(site, `/posts/${post.slug}/`)))}" data-share-title="${escapeAttribute(post.title)}">Share</button>
              </div>
            </header>
            <div class="essay-layout">
              ${toc}
              <div class="essay-main">
              ${renderArticleImage(post)}
              ${renderSummary(post)}
              <div class="article-body">
                ${post.bodyHtml}
              </div>
              <p class="essay-signoff">Vikram Chopra, Founder &amp; Builder</p>
              ${renderSources(post)}
              ${renderSubscribeModule(site, "essay")}
              ${renderRelatedEssays(site, post, collection)}
            </div>
            </div>
          </article>
        </main>
        ${renderFooter(site)}
      </div>
    `
  });
}

function renderNotFound(site) {
  return renderDocument({
    site,
    title: `Not found | ${site.siteTitle}`,
    description: site.description,
    pathName: "/404.html",
    imagePath: "",
    bodyClass: "not-found-page",
    openGraphType: "website",
    content: `
      <div class="page-shell">
        ${renderHeader(site)}
        <main class="content">
          <section class="not-found">
            <p class="eyebrow">404</p>
            <h1>That page drifted off.</h1>
            <p class="intro">The writing is still intact. Start again from the homepage or the essays.</p>
            <div class="cta-row">
              <a class="button-link" href="${sitePath(site, "/")}">Go home</a>
              <a class="button-link button-link-muted" href="${sitePath(site, "/archive/")}">Open essays</a>
            </div>
          </section>
        </main>
        ${renderFooter(site)}
      </div>
    `
  });
}

function renderRedirectPage(site, pathName, targetPath) {
  const targetUrl = absoluteUrl(site.domain, sitePath(site, targetPath));

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta http-equiv="refresh" content="0; url=${escapeAttribute(targetUrl)}">
    <link rel="canonical" href="${escapeAttribute(targetUrl)}">
    <meta name="robots" content="noindex">
    <title>Redirecting...</title>
    <script>window.location.replace(${JSON.stringify(targetUrl)});</script>
  </head>
  <body>
    <p>Redirecting to <a href="${escapeAttribute(targetUrl)}">${escapeHtml(targetUrl)}</a>.</p>
  </body>
</html>`;
}

function renderDocument({
  site,
  title,
  description,
  pathName,
  imagePath,
  imageAlt = "",
  imageWidth = null,
  imageHeight = null,
  content,
  bodyClass,
  openGraphType = "website",
  publishedDate = "",
  structuredData = null,
  socialTitle = "",
  socialDescription = "",
  htmlLang = "en"
}) {
  const canonical = absoluteUrl(site.domain, sitePath(site, pathName));
  const ogImage = imagePath ? absoluteUrl(site.domain, sitePath(site, imagePath)) : "";
  const metaTitle = socialTitle || title;
  const metaDescription = socialDescription || description;

  return stripTrailingWhitespace(`<!doctype html>
<html lang="${escapeAttribute(htmlLang)}">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeAttribute(metaDescription)}">
    <meta name="author" content="${escapeAttribute(site.name)}">
    <link rel="canonical" href="${escapeAttribute(canonical)}">
    <link rel="alternate" type="application/rss+xml" title="${escapeAttribute(site.siteTitle)} RSS" href="${escapeAttribute(absoluteUrl(site.domain, sitePath(site, "/rss.xml")))}">
    <meta property="og:site_name" content="${escapeAttribute(site.siteTitle)}">
    <meta property="og:title" content="${escapeAttribute(metaTitle)}">
    <meta property="og:description" content="${escapeAttribute(metaDescription)}">
    <meta property="og:type" content="${escapeAttribute(openGraphType)}">
    <meta property="og:url" content="${escapeAttribute(canonical)}">
    ${ogImage ? `<meta property="og:image" content="${escapeAttribute(ogImage)}">` : ""}
    ${ogImage && imageWidth ? `<meta property="og:image:width" content="${escapeAttribute(String(imageWidth))}">` : ""}
    ${ogImage && imageHeight ? `<meta property="og:image:height" content="${escapeAttribute(String(imageHeight))}">` : ""}
    ${ogImage && imageAlt ? `<meta property="og:image:alt" content="${escapeAttribute(imageAlt)}">` : ""}
    ${publishedDate ? `<meta property="article:published_time" content="${escapeAttribute(`${publishedDate}T12:00:00Z`)}">` : ""}
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${escapeAttribute(metaTitle)}">
    <meta name="twitter:description" content="${escapeAttribute(metaDescription)}">
    ${ogImage ? `<meta name="twitter:image" content="${escapeAttribute(ogImage)}">` : ""}
    ${ogImage && imageAlt ? `<meta name="twitter:image:alt" content="${escapeAttribute(imageAlt)}">` : ""}
    <meta name="theme-color" content="#f4ecdf">
    <link rel="icon" type="image/svg+xml" href="${sitePath(site, "/favicon.svg")}">
    ${structuredData ? `<script type="application/ld+json">${serializeStructuredData(structuredData)}</script>` : ""}
    ${renderPlausibleScript()}
    <script>
      (() => {
        const storageKey = "vikram-theme";
        const root = document.documentElement;
        const themeMeta = document.querySelector('meta[name="theme-color"]');
        const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
        const storedTheme = localStorage.getItem(storageKey);
        const activeTheme = storedTheme === "dark" || storedTheme === "light" ? storedTheme : systemTheme;
        root.dataset.theme = activeTheme;
        if (themeMeta) {
          themeMeta.setAttribute("content", activeTheme === "dark" ? "#12100d" : "#f4ecdf");
        }
      })();
    </script>
    <link rel="stylesheet" href="${sitePath(site, "/styles.css")}">
  </head>
  <body class="${escapeAttribute(bodyClass)}">
    ${content}
    <button class="quote-copy-button" type="button" data-quote-copy hidden>Copy quote</button>
    <script>
      (() => {
        const storageKey = "vikram-theme";
        const root = document.documentElement;
        const button = document.querySelector("[data-theme-toggle]");
        const languageSelect = document.querySelector("[data-language-select]");
        const shareButton = document.querySelector("[data-share-button]");
        const quoteButton = document.querySelector("[data-quote-copy]");
        const quoteRegion = document.querySelector(".article-body");
        const themeMeta = document.querySelector('meta[name="theme-color"]');

        if (button) {
          const applyTheme = (theme) => {
            root.dataset.theme = theme;
            button.dataset.themeState = theme;
            button.setAttribute("aria-label", theme === "dark" ? "Switch to light mode" : "Switch to dark mode");
            button.querySelector("[data-theme-label]").textContent = theme === "dark" ? "Light" : "Dark";
            if (themeMeta) {
              themeMeta.setAttribute("content", theme === "dark" ? "#12100d" : "#f4ecdf");
            }
          };

          applyTheme(root.dataset.theme || "light");

          button.addEventListener("click", () => {
            const nextTheme = root.dataset.theme === "dark" ? "light" : "dark";
            localStorage.setItem(storageKey, nextTheme);
            applyTheme(nextTheme);
          });
        }

        if (languageSelect) {
          languageSelect.addEventListener("change", () => {
            const nextPath = languageSelect.value;
            if (nextPath && nextPath !== window.location.pathname) {
              window.location.href = nextPath;
            }
          });
        }

        if (shareButton) {
          shareButton.addEventListener("click", async () => {
            const url = shareButton.dataset.shareUrl || window.location.href;
            const title = shareButton.dataset.shareTitle || document.title;
            const previousLabel = shareButton.textContent;

            try {
              if (navigator.share) {
                await navigator.share({ title, url });
              } else {
                await navigator.clipboard.writeText(url);
                shareButton.textContent = "Copied";
                window.setTimeout(() => {
                  shareButton.textContent = previousLabel;
                }, 1600);
              }
            } catch (error) {
              if (error && error.name === "AbortError") {
                return;
              }
              try {
                await navigator.clipboard.writeText(url);
                shareButton.textContent = "Copied";
                window.setTimeout(() => {
                  shareButton.textContent = previousLabel;
                }, 1600);
              } catch (_) {
                shareButton.textContent = previousLabel;
              }
            }
          });
        }

        const subscribeForms = Array.from(document.querySelectorAll("[data-subscribe-form]"));

        for (const form of subscribeForms) {
          const submitButton = form.querySelector("[data-subscribe-submit]");
          const nextLabel = form.dataset.submittingLabel || "Continuing...";

          if (!submitButton) {
            continue;
          }

          form.addEventListener("submit", () => {
            form.classList.add("is-submitting");
            submitButton.textContent = nextLabel;
            submitButton.disabled = true;
          });
        }

        if (quoteButton && quoteRegion) {
          const baseLabel = "Copy quote";

          const normalizeSelection = (value) => {
            return String(value || "")
              .replace(/\\s+/g, " ")
              .trim();
          };

          const hideQuoteButton = () => {
            quoteButton.hidden = true;
            quoteButton.textContent = baseLabel;
          };

          const updateQuoteButton = () => {
            const selection = window.getSelection();

            if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
              hideQuoteButton();
              return;
            }

            const text = normalizeSelection(selection.toString());
            const range = selection.getRangeAt(0);

            if (!text || text.length < 24 || !quoteRegion.contains(range.commonAncestorContainer)) {
              hideQuoteButton();
              return;
            }

            const rect = range.getBoundingClientRect();
            const titleNode = document.querySelector(".essay-header h1");
            const pageTitle = titleNode ? titleNode.textContent.replace(/\\s+/g, " ").trim() : document.title;

            quoteButton.dataset.quoteText = text;
            quoteButton.dataset.quoteTitle = pageTitle;
            quoteButton.dataset.quoteUrl = window.location.href;
            quoteButton.hidden = false;

            const maxLeft = Math.max(12, window.innerWidth - quoteButton.offsetWidth - 12);
            const left = Math.min(
              Math.max(12, rect.left + (rect.width / 2) - (quoteButton.offsetWidth / 2)),
              maxLeft
            );
            const top = window.innerWidth < 640
              ? Math.max(12, window.innerHeight - 68)
              : Math.max(12, rect.top - 48);

            quoteButton.style.left = left + "px";
            quoteButton.style.top = top + "px";
          };

          quoteButton.addEventListener("mousedown", (event) => {
            event.preventDefault();
          });

          quoteButton.addEventListener("click", async () => {
            const quoteText = normalizeSelection(quoteButton.dataset.quoteText || "");
            const quoteTitle = quoteButton.dataset.quoteTitle || document.title;
            const quoteUrl = quoteButton.dataset.quoteUrl || window.location.href;

            if (!quoteText) {
              hideQuoteButton();
              return;
            }

            const payload = '"' + quoteText + '"\\n\\nSource: Vikram Chopra, "' + quoteTitle + '"\\n' + quoteUrl;

            try {
              await navigator.clipboard.writeText(payload);
              quoteButton.textContent = "Copied quote";
            } catch (_) {
              quoteButton.textContent = "Copy failed";
            }

            window.setTimeout(() => {
              hideQuoteButton();
            }, 1400);
          });

          document.addEventListener("selectionchange", () => {
            window.requestAnimationFrame(updateQuoteButton);
          });

          document.addEventListener("scroll", () => {
            if (!quoteButton.hidden) {
              window.requestAnimationFrame(updateQuoteButton);
            }
          }, { passive: true });

          document.addEventListener("pointerdown", (event) => {
            if (quoteButton.contains(event.target)) {
              return;
            }

            if (!quoteRegion.contains(event.target)) {
              hideQuoteButton();
            }
          });
        }

        const tocLinks = Array.from(document.querySelectorAll(".essay-toc a[href^='#']"));
        const tocSections = tocLinks
          .map((link) => {
            const id = link.getAttribute("href")?.slice(1);
            const section = id ? document.getElementById(id) : null;
            return section ? { link, section } : null;
          })
          .filter(Boolean);

        if (tocSections.length > 0 && "IntersectionObserver" in window) {
          let activeId = "";

          const setActive = (id) => {
            if (!id || id === activeId) {
              return;
            }

            activeId = id;
            for (const item of tocSections) {
              const isActive = item.section.id === id;
              item.link.classList.toggle("is-active", isActive);
              item.link.setAttribute("aria-current", isActive ? "true" : "false");
            }
          };

          const observer = new IntersectionObserver(
            (entries) => {
              const visibleEntries = entries
                .filter((entry) => entry.isIntersecting)
                .sort((left, right) => left.boundingClientRect.top - right.boundingClientRect.top);

              if (visibleEntries.length > 0) {
                setActive(visibleEntries[0].target.id);
              }
            },
            {
              rootMargin: "-18% 0px -62% 0px",
              threshold: [0, 0.2, 0.6, 1]
            }
          );

          for (const item of tocSections) {
            observer.observe(item.section);
          }

          setActive(tocSections[0].section.id);
        }
      })();
    </script>
  </body>
</html>`);
}

function stripTrailingWhitespace(value) {
  return String(value).replace(/[ \t]+$/gm, "");
}

function renderPlausibleScript() {
  if (!plausibleDomain) {
    return "";
  }

  return `<script defer data-domain="${escapeAttribute(plausibleDomain)}" src="${escapeAttribute(plausibleScriptSrc)}"></script>`;
}

function renderHeader(site, options = {}) {
  const languageTargets = options.languageTargets || cultureLanguageTargets(site, options.activeLanguageCode || "en", options.doc || null);
  return `
    <header class="site-header">
      <a class="brand" href="${sitePath(site, "/")}">
        <span class="brand-mark"></span>
        <span>${escapeHtml(site.name)}</span>
      </a>
      <div class="site-header-actions">
      ${renderCompactLanguageControl(languageTargets)}
      <nav class="site-nav" aria-label="Primary">
        <a href="${sitePath(site, "/archive/")}">Essays</a>
        <a href="${sitePath(site, "/#culture-docs")}">Docs</a>
      </nav>
      <button class="theme-toggle" type="button" data-theme-toggle aria-label="Switch color theme">
        <span class="theme-toggle-mark" aria-hidden="true"></span>
        <span data-theme-label>Dark</span>
      </button>
      </div>
    </header>
  `;
}

function renderCompactLanguageControl(languageTargets) {
  return `
    <div class="language-control language-control-compact">
      <label for="language-select">Language</label>
      <select id="language-select" class="language-select" data-language-select aria-label="Language">
        ${languageTargets.map(({ language, pathName, active }) => `<option value="${escapeAttribute(pathName)}"${active ? " selected" : ""}>${escapeHtml(language.nativeLabel)}</option>`).join("")}
      </select>
    </div>
  `.trim();
}

function renderCultureDocuments(site, cultureDocuments = CULTURE_DOCUMENTS, language = DEFAULT_CULTURE_LANGUAGE) {
  return `
    <section class="culture-docs" id="culture-docs" aria-labelledby="culture-docs-title">
      <div class="home-section-head">
        <div>
          <p class="home-label">Cars24 Culture</p>
          <h2 id="culture-docs-title">Flatland and values</h2>
          <p>Use the language selector in the top masthead. The PDF links below follow the selected language.</p>
        </div>
      </div>
      <div class="culture-doc-grid">
        ${cultureDocuments.map((doc) => renderCultureDocumentCard(site, doc, language)).join("")}
      </div>
    </section>
  `.trim();
}

function renderCultureDocumentCard(site, doc, language = DEFAULT_CULTURE_LANGUAGE) {
  const version = getCultureVersion(doc, language.code) || getCultureVersion(doc, "en");
  const pdfLabel = language.code === "en" ? "Open PDF" : `Open PDF - ${language.nativeLabel}`;
  return `
    <article class="culture-doc-card">
      <a class="culture-doc-cover" href="${sitePath(site, version.pdfPath)}" target="_blank" rel="noreferrer">
        <img src="${sitePath(site, doc.cover)}" alt="${escapeAttribute(doc.title)} cover" loading="lazy">
      </a>
      <div class="culture-doc-copy">
        <p class="culture-doc-meta">${escapeHtml(doc.meta)}</p>
        <h3>${escapeHtml(doc.title)}</h3>
        <p>${escapeHtml(doc.description)}</p>
        <div class="culture-doc-actions">
          <a class="button-link" href="${sitePath(site, version.pdfPath)}" target="_blank" rel="noreferrer">${escapeHtml(pdfLabel)}</a>
          <a class="button-link button-link-muted" href="${sitePath(site, version.pathName)}">Read online</a>
        </div>
      </div>
    </article>
  `.trim();
}

function renderCultureLanguageHome(site, cultureDocuments, language) {
  const title = `${language.nativeLabel} culture docs | ${site.siteTitle}`;
  const description = `Claude-translated Cars24 culture documents in ${language.label}.`;

  return renderDocument({
    site,
    title,
    description,
    pathName: language.homePath,
    imagePath: site.socialImage || "",
    imageAlt: site.socialImageAlt || site.siteTitle,
    imageWidth: site.socialImageMeta?.width || null,
    imageHeight: site.socialImageMeta?.height || null,
    bodyClass: "culture-language-page",
    htmlLang: language.htmlLang,
    openGraphType: "website",
    structuredData: buildCollectionPageStructuredData(site, {
      pathName: language.homePath,
      title,
      description
    }),
    content: `
      <div class="page-shell">
        ${renderHeader(site, { activeLanguageCode: language.code })}
        <main class="content">
          <section class="archive-hero culture-language-hero">
            <p class="eyebrow">${escapeHtml(language.readerNote)}</p>
            <h1>${escapeHtml(language.landingTitle || `${language.nativeLabel} reader`)}</h1>
            <p class="dek">${escapeHtml(language.landingDek || `Read Cars24 culture documents in ${language.label}.`)}</p>
          </section>
          <section class="culture-docs culture-docs-standalone" aria-labelledby="culture-language-docs-title">
            <div class="home-section-head">
              <div>
                <p class="home-label">Cars24 Culture</p>
                <h2 id="culture-language-docs-title">Documents</h2>
              </div>
            </div>
            <div class="culture-doc-grid">
              ${cultureDocuments.map((doc) => renderCultureDocumentCard(site, doc, language)).join("")}
            </div>
          </section>
        </main>
        ${renderFooter(site)}
      </div>
    `
  });
}

function renderCultureDocumentPage(site, doc, version) {
  const language = version.language;
  const isEnglish = language.code === "en";
  const title = isEnglish ? `${doc.title} | ${site.siteTitle}` : `${doc.title} in ${language.label} | ${site.siteTitle}`;
  const description = isEnglish
    ? `${doc.title} as a readable web page, alongside the original PDF.`
    : `${doc.title}, translated into ${language.label} with Claude to preserve tone and meaning.`;
  const bodyHtml = renderCultureReaderBody(version.markdown);

  return renderDocument({
    site,
    title,
    description,
    pathName: version.pathName,
    imagePath: doc.cover,
    imageAlt: `${doc.title} cover`,
    bodyClass: "culture-reader-page",
    htmlLang: language.htmlLang,
    openGraphType: "article",
    structuredData: buildCollectionPageStructuredData(site, {
      pathName: version.pathName,
      title,
      description
    }),
    content: `
      <div class="page-shell">
        ${renderHeader(site, { activeLanguageCode: language.code, doc })}
        <main class="content">
          <article class="culture-reader">
            <nav class="breadcrumb">
              <a href="${sitePath(site, "/")}">Home</a>
              <span>/</span>
              <a href="${sitePath(site, "/#culture-docs")}">Docs</a>
            </nav>
            <header class="culture-reader-header">
              <p class="eyebrow">${escapeHtml(language.readerNote)}</p>
              <h1>${escapeHtml(doc.title)}</h1>
              <p class="dek">${escapeHtml(description)}</p>
              <div class="culture-reader-actions">
                <a class="button-link" href="${sitePath(site, version.pdfPath)}" target="_blank" rel="noreferrer">${escapeHtml(language.code === "en" ? "Open PDF" : `Open PDF - ${language.nativeLabel}`)}</a>
              </div>
            </header>
            <div class="article-body culture-reader-body">
              ${bodyHtml}
            </div>
          </article>
        </main>
        ${renderFooter(site)}
      </div>
    `
  });
}

function renderCultureReaderBody(markdown) {
  const bodyMarkdown = String(markdown || "")
    .replace(/^#\s+.+(?:\n|$)/, "")
    .trim();
  return renderMarkdown(bodyMarkdown).html;
}

function renderFooter(site) {
  return `
    <footer class="site-footer">
      <p>${escapeHtml(site.footerNote)}</p>
      <p class="footer-note">
        <a href="${sitePath(site, "/archive/")}">Essays</a>
        <span aria-hidden="true"> · </span>
        <a href="${escapeAttribute(site.companyUrl)}">Cars24</a>
        <span aria-hidden="true"> · </span>
        <a href="${escapeAttribute(site.linkedInUrl)}">LinkedIn</a>
        <span aria-hidden="true"> · </span>
        <a href="${escapeAttribute(site.xUrl)}">X</a>
        <span aria-hidden="true"> · </span>
        <a href="${sitePath(site, "/rss.xml")}">RSS</a>
        <span aria-hidden="true"> · </span>
        <a href="${sitePath(site, "/subscribe/")}">Subscribe</a>
      </p>
    </footer>
  `;
}

function renderHomeIntro(site) {
  const intro = escapeHtml(site.intro);
  const companyUrl = escapeAttribute(site.companyUrl || "https://www.cars24.com");
  return intro.replace("Cars24", `<a href="${companyUrl}">Cars24</a>`);
}

function renderStartHere(site, postBySlug) {
  const items = START_HERE_SLUGS
    .map((slug) => postBySlug.get(slug))
    .filter(Boolean);

  if (items.length === 0) {
    return "";
  }

  return `
    <p class="home-start-here">
      <span>Start here:</span>
      ${items.map((post, index) => `${index === 0 ? " " : '<span aria-hidden="true"> · </span>'}<a href="${sitePath(site, `/posts/${post.slug}/`)}">${renderDisplayTitle(post.displayTitle)}</a>`).join("")}
    </p>
  `;
}

function normalizeSubscribe(site) {
  const subscribe = site.subscribe && typeof site.subscribe === "object" ? site.subscribe : {};

  return {
    href: String(subscribe.href || "").trim(),
    action: String(subscribe.action || "").trim(),
    line: String(subscribe.line || "New essays by email, a few times a year.").trim(),
    homeEyebrow: String(subscribe.homeEyebrow || "By Email").trim(),
    homeTitle: String(subscribe.homeTitle || "Get the next essay by email").trim(),
    homeBody: String(subscribe.homeBody || "I publish infrequently. Email is the cleanest way to hear when a new essay is live.").trim(),
    homeDetail: String(subscribe.homeDetail || "No cadence for the sake of cadence. Just new essays when there is something worth saying.").trim(),
    essayTitle: String(subscribe.essayTitle || "If this was worth your time, get the next one by email").trim(),
    essayBody: String(subscribe.essayBody || "A few essays a year. No feed-chasing. No filler.").trim(),
    pageEyebrow: String(subscribe.pageEyebrow || "By Email").trim(),
    pageTitle: String(subscribe.pageTitle || "Get new essays without depending on the feed").trim(),
    pageDek: String(subscribe.pageDek || "I publish infrequently. Email is the cleanest way to hear when a new essay is live.").trim(),
    pageBody: String(subscribe.pageBody || "No newsletter treadmill. No weekly note. Just new writing when there is something worth sending.").trim(),
    placeholder: String(subscribe.placeholder || "Email address").trim(),
    button: String(subscribe.button || "Subscribe").trim(),
    submittingLabel: String(subscribe.submittingLabel || "Continuing...").trim(),
    finePrint: String(subscribe.finePrint || "After you submit, Buttondown may ask for a quick verification and will then send a confirmation email.").trim()
  };
}

function renderSubscribeModule(site, variant) {
  const subscribe = normalizeSubscribe(site);

  if (!subscribe.href) {
    return "";
  }

  if (variant === "home") {
    return `
      <section class="subscribe-module subscribe-module-home" aria-label="Subscribe">
        <div class="subscribe-copy">
          <p class="subscribe-kicker">${escapeHtml(subscribe.homeEyebrow)}</p>
          <h2>${escapeHtml(subscribe.homeTitle)}</h2>
          <p class="subscribe-body">${escapeHtml(subscribe.homeBody)}</p>
          <p class="subscribe-detail">${escapeHtml(subscribe.homeDetail)}</p>
        </div>
        <div class="subscribe-actions">
          ${renderSubscribeForm(site, "home")}
        </div>
      </section>
    `;
  }

  if (variant === "essay") {
    return `
      <section class="subscribe-module subscribe-module-essay" aria-label="Subscribe">
        <div class="subscribe-copy">
          <p class="subscribe-kicker">By Email</p>
          <h2>${escapeHtml(subscribe.essayTitle)}</h2>
          <p class="subscribe-body">${escapeHtml(subscribe.essayBody)}</p>
        </div>
        <div class="subscribe-actions">
          ${renderSubscribeForm(site, "essay")}
        </div>
      </section>
    `;
  }

  return "";
}

function renderSubscribeForm(site, variant) {
  const subscribe = normalizeSubscribe(site);

  if (!subscribe.action) {
    return "";
  }

  const formId = `subscribe-email-${variant}`;

  return `
    <form class="subscribe-form subscribe-form-${variant}" method="post" action="${escapeAttribute(subscribe.action)}" data-subscribe-form data-submitting-label="${escapeAttribute(subscribe.submittingLabel)}">
      <label class="sr-only" for="${escapeAttribute(formId)}">Email address</label>
      <div class="subscribe-input-row">
        <input class="subscribe-input" id="${escapeAttribute(formId)}" name="email" type="email" placeholder="${escapeAttribute(subscribe.placeholder)}" autocomplete="email" required>
        <button class="subscribe-submit" type="submit" data-subscribe-submit>${escapeHtml(subscribe.button)}</button>
      </div>
      <p class="subscribe-fine-print">${escapeHtml(subscribe.finePrint)}</p>
    </form>
  `;
}

function renderEntryRow(post) {
  const meta = post.category && post.category !== "Essay"
    ? `
          <span>${escapeHtml(post.category)}</span>
          <span>${post.readingMinutes} min read</span>
        `
    : `<span>${post.readingMinutes} min read</span>`;

  return `
    <article class="entry-row">
      <a class="entry-copy" href="${sitePath(post.site, `/posts/${post.slug}/`)}">
        <div class="entry-meta">
          ${meta}
        </div>
        <h2 class="entry-title">${renderDisplayTitle(post.displayTitle)}</h2>
        <p class="entry-description">${escapeHtml(post.description)}</p>
      </a>
      ${renderEntryVisual(post, "entry-thumb", "card")}
    </article>
  `;
}

function renderEssayCover(post) {
  if (!post.image) {
    return "";
  }

  return `
    <figure class="essay-cover">
      <img src="${escapeAttribute(sitePath(post.site, post.image))}" alt="${escapeAttribute(post.imageAlt)}">
    </figure>
  `;
}

function renderHomeArchiveRow(post) {
  return `
    <article class="home-archive-row">
      <a class="home-archive-copy" href="${sitePath(post.site, `/posts/${post.slug}/`)}">
        <h3>${renderDisplayTitle(post.displayTitle)}</h3>
        <p>${escapeHtml(post.description)}</p>
      </a>
      ${renderEntryVisual(post, "home-archive-visual", "card")}
    </article>
  `;
}

function renderEssayCollection(collection, variant, site) {
  const count = collection.posts.length;
  const anchorHref = sitePath(site, `/archive/#${collection.id}`);
  const title = variant === "archive"
    ? `<a href="${anchorHref}">${escapeHtml(collection.title)}</a>`
    : `<a href="${anchorHref}">${escapeHtml(collection.title)}</a>`;
  const rows = variant === "archive"
    ? `<div class="entry-list">${collection.posts.map((post) => renderEntryRow(post)).join("")}</div>`
    : `<div class="home-archive-list">${collection.posts.map((post) => renderHomeArchiveRow(post)).join("")}</div>`;

  return `
    <section class="essay-collection essay-collection-${variant}"${variant === "archive" ? ` id="${escapeAttribute(collection.id)}"` : ""}>
      <div class="essay-collection-head">
        <p class="essay-collection-meta">${count} essay${count === 1 ? "" : "s"}</p>
        <h2 class="essay-collection-title">${title}</h2>
      </div>
      ${rows}
    </section>
  `;
}

function renderEntryVisual(post, className, variant = "article") {
  const visualPath = entryVisualPath(post, variant);
  const altText = variant === "card"
    ? (post.imageAlt || post.articleImageAlt)
    : (post.articleImageAlt || post.imageAlt);

  if (!visualPath) {
    return "";
  }

  return `
    <a class="${className}" href="${sitePath(post.site, `/posts/${post.slug}/`)}" aria-label="Open ${escapeAttribute(post.title)}">
      <img src="${escapeAttribute(sitePath(post.site, visualPath))}" alt="${escapeAttribute(altText)}" loading="lazy">
    </a>
  `;
}

function entryVisualPath(post, variant = "article") {
  if (variant === "card" && post.image) {
    return post.image;
  }

  if (post.articleImage) {
    return post.articleImage;
  }

  if (post.image) {
    return post.image.replace("-preview.", "-cover.");
  }

  return "";
}

function renderHomeInterviewSections(sections) {
  const sectionEntries = Object.entries(sections).filter(([, items]) =>
    items.some((interview) => String(interview.videoId || "").trim())
  );

  if (sectionEntries.length === 0) {
    return "";
  }

  return sectionEntries
    .map(([sectionTitle, items], index) => renderHomeInterviewsSection(sectionTitle, items, index === 0))
    .join("");
}

function renderHomeInterviewsSection(sectionTitle, interviews, includeIntro = false) {
  const validInterviews = interviews.filter((interview) => String(interview.videoId || "").trim());

  if (validInterviews.length === 0) {
    return "";
  }

  return `
    <section class="home-interviews">
      <div class="home-section-head">
        <p class="home-label">${escapeHtml(sectionTitle)}</p>
      </div>
      <div class="interview-grid">
        ${validInterviews.map((interview) => renderHomeInterviewCard(interview)).join("")}
      </div>
    </section>
  `;
}

function renderHomeInterviewCard(interview) {
  const videoId = String(interview.videoId || "").trim();

  if (!videoId) {
    return "";
  }

  const title = interview.title || "Interview";
  const host = interview.host || "";
  const description = interview.description || "";
  const meta = [host].filter(Boolean).join(" • ");
  const watchUrl = interview.url || `https://www.youtube.com/watch?v=${videoId}`;
  const embedUrl = `https://www.youtube-nocookie.com/embed/${videoId}`;

  return `
    <article class="interview-card">
      <div class="interview-video">
        <iframe
          src="${escapeAttribute(embedUrl)}"
          title="${escapeAttribute(title)}"
          loading="lazy"
          referrerpolicy="strict-origin-when-cross-origin"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowfullscreen
        ></iframe>
      </div>
      ${meta ? `<p class="interview-meta">${escapeHtml(meta)}</p>` : ""}
      <h3 class="interview-title">${escapeHtml(title)}</h3>
      ${description ? `<p class="interview-description">${escapeHtml(description)}</p>` : ""}
      <p class="interview-action"><a class="inline-link" href="${escapeAttribute(watchUrl)}" target="_blank" rel="noreferrer">Watch on YouTube</a></p>
    </article>
  `;
}

function renderElsewhereSection(items) {
  const validItems = items.filter((item) => String(item.url || "").trim());

  if (validItems.length === 0) {
    return "";
  }

  return `
    <section class="home-elsewhere">
      <div class="home-section-head">
        <p class="home-label">Elsewhere</p>
      </div>
      <div class="elsewhere-list">
        ${validItems.map((item) => renderElsewhereRow(item)).join("")}
      </div>
    </section>
  `;
}

function renderElsewhereRow(item) {
  const meta = [item.type || "", item.source || ""].filter(Boolean).join(" • ");

  return `
    <article class="elsewhere-row">
      ${meta ? `<p class="elsewhere-meta">${escapeHtml(meta)}</p>` : ""}
      <h3 class="elsewhere-title"><a href="${escapeAttribute(item.url)}" target="_blank" rel="noreferrer">${escapeHtml(item.title || "Untitled")}</a></h3>
      ${item.description ? `<p class="elsewhere-description">${escapeHtml(item.description)}</p>` : ""}
    </article>
  `;
}

function buildEssayCollections(posts) {
  const postBySlug = new Map(posts.map((post) => [post.slug, post]));
  const assigned = new Set();
  const collections = CURATED_ESSAY_COLLECTIONS.map((collection) => {
    const collectionPosts = collection.slugs
      .map((slug) => postBySlug.get(slug))
      .filter(Boolean);

    collectionPosts.forEach((post) => assigned.add(post.slug));
    return {
      ...collection,
      posts: collectionPosts
    };
  }).filter((collection) => collection.posts.length > 0);

  const unassignedPosts = posts.filter((post) => !assigned.has(post.slug));
  if (unassignedPosts.length > 0) {
    collections.push({
      id: "more-essays",
      title: "More Essays",
      description: "Additional writing that does not yet sit inside one of the main thematic tracks.",
      posts: unassignedPosts
    });
  }

  return collections;
}

function buildCollectionBySlug(collections) {
  const map = new Map();

  for (const collection of collections) {
    for (const post of collection.posts) {
      map.set(post.slug, collection);
    }
  }

  return map;
}

function pickRelatedPosts(posts, currentSlug, limit) {
  const index = posts.findIndex((item) => item.slug === currentSlug);

  if (index === -1) {
    return posts.slice(0, limit);
  }

  const related = [];

  for (let offset = 1; related.length < limit && offset < posts.length; offset += 1) {
    const forward = posts[index + offset];
    const backward = posts[index - offset];

    if (forward && forward.slug !== currentSlug) {
      related.push(forward);
    }

    if (related.length >= limit) {
      break;
    }

    if (backward && backward.slug !== currentSlug) {
      related.push(backward);
    }
  }

  return related.slice(0, limit);
}

function renderDisplayTitle(title) {
  const parts = String(title)
    .split("|")
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 0) {
    return "";
  }

  return parts.map((part) => renderInline(part)).join("<br>");
}

function renderTableOfContents(post) {
  const allHeadings = post.headings || [];
  const preferredLevel = allHeadings.some((heading) => heading.level === 2) ? 2 : 3;
  const headings = allHeadings.filter((heading) => heading.level === preferredLevel);

  if (headings.length === 0) {
    return "";
  }

  return `
    <aside class="essay-toc" aria-label="Table of contents">
      <p class="essay-toc-label">On this page</p>
      <ol class="essay-toc-list">
        ${headings
          .map((heading) => {
            return `<li class="essay-toc-item essay-toc-level-${heading.level}"><a href="#${escapeAttribute(heading.id)}">${escapeHtml(heading.text)}</a></li>`;
          })
          .join("")}
      </ol>
    </aside>
  `;
}

function renderSummary(post) {
  const items = String(post.summary || "")
    .split("|")
    .map((item) => item.trim())
    .filter(Boolean);

  if (items.length === 0) {
    return "";
  }

  return `
    <section class="essay-summary" aria-label="Essay summary">
      <p class="essay-summary-label">In Brief</p>
      <ul>
        ${items.map((item) => `<li>${renderInline(item)}</li>`).join("")}
      </ul>
    </section>
  `;
}

function renderArticleImage(post) {
  const visualPath = post.articleImage || post.image;
  const altText = post.articleImageAlt || post.imageAlt || post.title;

  if (!visualPath) {
    return "";
  }

  return `
    <figure class="article-visual">
      <img src="${escapeAttribute(sitePath(post.site, visualPath))}" alt="${escapeAttribute(altText)}">
    </figure>
  `;
}

function renderSources(post) {
  const sourcesLine = String(post.sourcesLine || "").trim();

  if (!sourcesLine) {
    return "";
  }

  return `
    <section class="essay-summary essay-sources" aria-label="Notes and sources">
      <h2 id="notes-and-sources" class="essay-summary-label">Notes and Sources</h2>
      <p><em>Sources: ${renderInline(sourcesLine)}</em></p>
    </section>
  `;
}

function renderRelatedEssays(site, post, collection) {
  if (!collection || !Array.isArray(collection.posts)) {
    return "";
  }

  const relatedPosts = pickRelatedPosts(collection.posts, post.slug, 3);

  if (relatedPosts.length === 0) {
    return "";
  }

  return `
    <section class="related-essays" aria-label="Related essays">
      <p class="essay-summary-label">Continue Reading</p>
      <h2>More in ${escapeHtml(collection.title)}</h2>
      <div class="related-essay-list">
        ${relatedPosts.map((item) => `
          <a class="related-essay-card" href="${sitePath(site, `/posts/${item.slug}/`)}">
            <h3>${renderDisplayTitle(item.displayTitle)}</h3>
            <p>${escapeHtml(item.description)}</p>
          </a>
        `).join("")}
      </div>
    </section>
  `;
}

function buildArticleStructuredData(site, post) {
  const canonical = absoluteUrl(site.domain, sitePath(site, `/posts/${post.slug}/`));
  const image = post.image ? absoluteUrl(site.domain, sitePath(site, post.image)) : "";
  const person = buildPersonStructuredData(site);

  const data = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.description,
    datePublished: `${post.date}T12:00:00Z`,
    dateModified: `${post.date}T12:00:00Z`,
    author: person,
    publisher: person,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": canonical
    }
  };

  if (image) {
    data.image = [image];
  }

  return data;
}

function buildPersonStructuredData(site) {
  return {
    "@type": "Person",
    name: site.name,
    jobTitle: "Founder, Cars24",
    url: absoluteUrl(site.domain, sitePath(site, "/")),
    sameAs: [
      site.linkedInUrl,
      site.xUrl,
      site.companyUrl
    ].filter(Boolean)
  };
}

function buildWebsiteStructuredData(site) {
  const person = buildPersonStructuredData(site);
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: site.siteTitle,
    url: absoluteUrl(site.domain, sitePath(site, "/")),
    description: site.description,
    author: person,
    publisher: person
  };
}

function buildCollectionPageStructuredData(site, page) {
  const person = buildPersonStructuredData(site);
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: page.title,
    url: absoluteUrl(site.domain, sitePath(site, page.pathName)),
    description: page.description,
    author: person,
    publisher: person
  };
}

function renderLlmsTxt(site, essayCollections, cultureDocuments = []) {
  const lines = [
    "# Vikram Chopra",
    "Founder of Cars24. Essays on car ownership in India, trust as the product, AI-native companies, and leadership.",
    "",
    `- [Home](${absoluteUrl(site.domain, sitePath(site, "/"))})`,
    `- [Essays](${absoluteUrl(site.domain, sitePath(site, "/archive/"))})`,
    `- [Hindi culture docs](${absoluteUrl(site.domain, sitePath(site, "/hi/"))})`,
    ""
  ];

  if (cultureDocuments.length > 0) {
    lines.push("## Culture Documents");
    for (const doc of cultureDocuments) {
      for (const version of doc.versions) {
        lines.push(`- [${doc.title} - ${version.language.label}](${absoluteUrl(site.domain, sitePath(site, version.pathName))})`);
      }
    }
    lines.push("");
  }

  for (const collection of essayCollections) {
    lines.push(`## ${collection.title}`);
    for (const post of collection.posts) {
      lines.push(`- [${post.displayTitle}](${absoluteUrl(site.domain, sitePath(site, `/posts/${post.slug}/`))}): ${post.description}`);
    }
    lines.push("");
  }

  return `${lines.join("\n").trim()}\n`;
}

function buildBreadcrumbStructuredData(site, post) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: absoluteUrl(site.domain, sitePath(site, "/"))
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Essays",
        item: absoluteUrl(site.domain, sitePath(site, "/archive/"))
      },
      {
        "@type": "ListItem",
        position: 3,
        name: post.title,
        item: absoluteUrl(site.domain, sitePath(site, `/posts/${post.slug}/`))
      }
    ]
  };
}

function serializeStructuredData(data) {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

function stripFormatting(text) {
  return String(text).replace(/[*_`]/g, "").trim();
}

function slugifyHeading(text, headings) {
  const base = stripFormatting(text)
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "section";

  let slug = base;
  let counter = 2;

  while (headings.some((heading) => heading.id === slug)) {
    slug = `${base}-${counter}`;
    counter += 1;
  }

  return slug;
}

function renderRss(site, posts) {
  const items = posts
    .map((post) => {
      const url = absoluteUrl(site.domain, sitePath(site, `/posts/${post.slug}/`));
      const description = escapeXml(post.description);
      const content = escapeXml(post.bodyHtml);

      return `
    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${escapeXml(url)}</link>
      <guid>${escapeXml(url)}</guid>
      <pubDate>${new Date(`${post.date}T12:00:00Z`).toUTCString()}</pubDate>
      <description>${description}</description>
      <content:encoded><![CDATA[${post.bodyHtml}]]></content:encoded>
    </item>`;
    })
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>${escapeXml(site.siteTitle)}</title>
    <link>${escapeXml(site.domain)}</link>
    <description>${escapeXml(site.description)}</description>${items}
  </channel>
</rss>`;
}

function renderSitemap(site, posts, cultureDocuments = []) {
  const urls = [
    "/",
    "/archive/",
    ...CULTURE_LANGUAGES.filter((language) => language.code !== "en").map((language) => language.homePath),
    ...cultureDocuments.flatMap((doc) => doc.versions.map((version) => version.pathName)),
    ...posts.map((post) => `/posts/${post.slug}/`)
  ];
  const nodes = urls
    .map((url) => {
      return `
  <url>
    <loc>${escapeXml(absoluteUrl(site.domain, sitePath(site, url)))}</loc>
  </url>`;
    })
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${nodes}
</urlset>`;
}

function renderRedirects(site) {
  return `${REDIRECTS
    .map((redirect) => {
      const from = sitePath(site, `/posts/${redirect.from}/`);
      const to = sitePath(site, `/posts/${redirect.to}/`);
      return `${from} ${to} 301`;
    })
    .join("\n")}\n`;
}

function renderHeaders() {
  return `/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  X-Frame-Options: SAMEORIGIN

/media/*
  Cache-Control: public, max-age=31536000, immutable

/styles.css
  Cache-Control: public, max-age=3600

/favicon.svg
  Cache-Control: public, max-age=86400
`;
}

function renderRobots(site) {
  return `User-agent: *
Allow: /

Sitemap: ${absoluteUrl(site.domain, sitePath(site, "/sitemap.xml"))}
`;
}

function sitePath(site, pathName) {
  const basePath = normalizeBasePath(site.basePath || "");
  const normalizedPath = withMediaVersion(pathName);

  if (!basePath) {
    return normalizedPath;
  }

  if (normalizedPath === "/") {
    return `${basePath}/`;
  }

  return `${basePath}${normalizedPath}`;
}

function withMediaVersion(pathName) {
  const value = String(pathName || "");

  if (!value.startsWith("/media/") || !mediaAssetVersion) {
    return value;
  }

  const separator = value.includes("?") ? "&" : "?";
  return `${value}${separator}v=${mediaAssetVersion}`;
}

function resolveMediaAssetVersion() {
  const gitSha = String(process.env.GITHUB_SHA || "").trim();

  if (gitSha) {
    return gitSha.slice(0, 7);
  }

  try {
    return execFileSync("git", ["rev-parse", "--short", "HEAD"], {
      cwd: rootDir,
      encoding: "utf8"
    }).trim();
  } catch {
    return "";
  }
}

function normalizeBasePath(basePath) {
  if (!basePath || basePath === "/") {
    return "";
  }

  const withLeadingSlash = basePath.startsWith("/") ? basePath : `/${basePath}`;
  return withLeadingSlash.endsWith("/") ? withLeadingSlash.slice(0, -1) : withLeadingSlash;
}

function formatDate(dateString) {
  return new Intl.DateTimeFormat("en", {
    month: "long",
    day: "numeric",
    year: "numeric"
  }).format(new Date(`${dateString}T12:00:00Z`));
}

function formatShortDate(dateString) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric"
  }).format(new Date(`${dateString}T12:00:00Z`));
}

function groupBy(items, selector) {
  return items.reduce((groups, item) => {
    const key = selector(item);
    groups[key] ||= [];
    groups[key].push(item);
    return groups;
  }, {});
}

function slugToTitle(slug) {
  return slug
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function createExcerpt(body) {
  const plainText = body.replace(/\s+/g, " ").trim();
  return plainText.length <= 160 ? plainText : `${plainText.slice(0, 157).trimEnd()}...`;
}

function absoluteUrl(domain, pathName) {
  return new URL(pathName, ensureTrailingSlash(domain)).toString();
}

function ensureTrailingSlash(value) {
  return value.endsWith("/") ? value : `${value}/`;
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeAttribute(value) {
  return escapeHtml(String(value));
}

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

async function resolveImageMeta(imagePath) {
  const value = String(imagePath || "").trim();

  if (!value || !value.startsWith("/media/")) {
    return null;
  }

  const absolutePath = path.join(assetsDir, value.replace(/^\//, ""));
  const extension = path.extname(absolutePath).toLowerCase();

  try {
    if (extension === ".png") {
      const buffer = await fs.readFile(absolutePath);
      if (buffer.length >= 24) {
        return {
          width: buffer.readUInt32BE(16),
          height: buffer.readUInt32BE(20)
        };
      }
    }

    if (extension === ".jpg" || extension === ".jpeg") {
      const jpeg = await fs.readFile(absolutePath);
      const dimensions = getJpegDimensions(jpeg);
      if (dimensions) {
        return dimensions;
      }
    }

    if (extension === ".svg") {
      const svg = await fs.readFile(absolutePath, "utf8");
      const viewBoxMatch = svg.match(/viewBox="([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)"/i);
      if (viewBoxMatch) {
        return {
          width: Math.round(Number(viewBoxMatch[3])),
          height: Math.round(Number(viewBoxMatch[4]))
        };
      }

      const widthMatch = svg.match(/width="([\d.]+)"/i);
      const heightMatch = svg.match(/height="([\d.]+)"/i);
      if (widthMatch && heightMatch) {
        return {
          width: Math.round(Number(widthMatch[1])),
          height: Math.round(Number(heightMatch[1]))
        };
      }
    }
  } catch {
    return null;
  }

  return null;
}

function getJpegDimensions(buffer) {
  if (!buffer || buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) {
    return null;
  }

  let offset = 2;

  while (offset + 9 < buffer.length) {
    while (offset < buffer.length && buffer[offset] === 0xff) {
      offset += 1;
    }

    const marker = buffer[offset];
    offset += 1;

    if (marker === 0xd9 || marker === 0xda) {
      break;
    }

    if (offset + 1 >= buffer.length) {
      break;
    }

    const segmentLength = buffer.readUInt16BE(offset);
    if (segmentLength < 2 || offset + segmentLength > buffer.length) {
      break;
    }

    const isStartOfFrame =
      marker >= 0xc0 &&
      marker <= 0xcf &&
      marker !== 0xc4 &&
      marker !== 0xc8 &&
      marker !== 0xcc;

    if (isStartOfFrame) {
      return {
        height: buffer.readUInt16BE(offset + 3),
        width: buffer.readUInt16BE(offset + 5)
      };
    }

    offset += segmentLength;
  }

  return null;
}

async function ensureDir(directory) {
  await fs.mkdir(directory, { recursive: true });
}

async function copyDirectoryIfPresent(source, destination) {
  try {
    await fs.access(source);
  } catch {
    return;
  }

  await fs.cp(source, destination, { recursive: true });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
