// ——————————————————————————————————————
//  MigrateX — structural component detector v3
//
//  Principles:
//  1. Every <section> is a component candidate. Also: main > * and [data-component].
//  2. Header/footer/nav and landmark roles (banner, contentinfo, navigation)
//     are chrome, not content — removed / skipped entirely.
//  3. Classification is purely structural. No hardcoded IDs, class names, or
//     keywords specific to any particular site.
//  4. Signals score DOM shape: element counts, nesting, presence of media,
//     repetition, ARIA/semantic hints.
// ——————————————————————————————————————

import * as cheerio from "cheerio";
import type {
  ComponentKind,
  DetectedComponent,
  DetectedField,
  FieldType,
} from "@/types";

type $Node = ReturnType<cheerio.CheerioAPI>;

type Signal = {
  test: ($: cheerio.CheerioAPI, $n: $Node) => number;
  weight: number;
};

interface Rule {
  kind: ComponentKind;
  name: string;
  signals: Signal[];
  extract: (
    $: cheerio.CheerioAPI,
    $n: $Node,
    baseUrl: string,
  ) => DetectedField[];
}

// —— helpers ——

const text = ($el: $Node) => $el.text().trim().replace(/\s+/g, " ");

const abs = (u: string | undefined, base: string) => {
  if (!u) return "";
  try {
    return new URL(u, base).toString();
  } catch {
    return u;
  }
};

const snakeCase = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 40) || "field";

const field = (
  displayName: string,
  type: FieldType,
  value: unknown,
  opts: Partial<DetectedField> = {},
): DetectedField => ({
  uid: snakeCase(displayName),
  displayName,
  type,
  value,
  ...opts,
});

// True if the node is (or lives inside) site chrome — never emit as a component.
const CHROME_SEL =
  'header, nav, footer, [role="banner"], [role="contentinfo"], [role="navigation"]';

const isChrome = ($n: $Node) =>
  $n.is(CHROME_SEL) || $n.parents(CHROME_SEL).length > 0;

// Count direct-or-near-direct "item" children that share a shape.
// Looks at children of depth 1 and 2 so grid wrappers don't hide the items.
function repeatingItems(
  $: cheerio.CheerioAPI,
  $n: $Node,
  itemSelector: string,
  shapeFn: (el: $Node) => boolean,
): $Node {
  let best: $Node | null = null;
  const containers = $n.find("div, ul, ol, section").addBack();
  containers.each((_, container) => {
    const $c = $(container);
    const kids = $c.children(itemSelector);
    if (kids.length < 2) return;
    const matching = kids.filter((_, el) => shapeFn($(el)));
    if (
      matching.length >= 2 &&
      matching.length >= kids.length * 0.6 &&
      (!best || matching.length > best.length)
    ) {
      best = matching as $Node;
    }
  });
  return best ?? ($n as $Node).filter(() => false);
}

// Finds repeating card-shaped elements (article first, else divs/lis with heading).
function findCards($: cheerio.CheerioAPI, $n: $Node): $Node {
  const articles = $n.find("article").filter(
    (_, el) =>
      $(el).find("h1, h2, h3, h4").length > 0 &&
      ($(el).find("p").length > 0 || $(el).find("img, picture").length > 0),
  );
  if (articles.length >= 2) return articles as $Node;

  return repeatingItems(
    $,
    $n,
    "div, li, article",
    (el) =>
      el.find("h1, h2, h3, h4").length > 0 &&
      (el.find("p, span").length > 0 || el.find("img").length > 0),
  );
}

// Finds accordion-style repeating items.
function findAccordionItems($: cheerio.CheerioAPI, $n: $Node): $Node {
  // 1. Native <details>/<summary>.
  const details = $n.find("details");
  if (details.length >= 2) return details as $Node;

  // 2. ARIA pattern: buttons with aria-expanded next to a region/panel.
  const ariaBtns = $n.find("[aria-expanded]");
  if (ariaBtns.length >= 2) return ariaBtns as $Node;

  // 3. Heading + sibling content pattern inside a repeating container.
  return repeatingItems(
    $,
    $n,
    "div, li",
    (el) =>
      el.find("h2, h3, h4, h5, button, summary").length > 0 &&
      el.find("p, div, ul").length > 0 &&
      text(el).length > 20,
  );
}

// Finds repeating "feature-ish" items: icon/image + title + short body.
function findFeatureItems($: cheerio.CheerioAPI, $n: $Node): $Node {
  return repeatingItems(
    $,
    $n,
    "div, li",
    (el) =>
      el.find("svg, img, i[class*='icon'], [class*='icon']").length > 0 &&
      el.find("h1, h2, h3, h4, h5, strong").length > 0,
  );
}

// —— rules (purely structural scoring) ——

const RULES: Rule[] = [
  // ——— Hero ———
  {
    kind: "hero",
    name: "Hero",
    signals: [
      {
        weight: 0.7,
        test: (_, $n) => ($n.find("h1").length > 0 ? 1 : 0),
      },
      // CTA pair often present in a hero
      {
        weight: 0.15,
        test: ($, $n) => {
          const btnGroup = $n
            .find("div")
            .filter((_, el) => $(el).children("a, button").length >= 2);
          return btnGroup.length > 0 ? 1 : 0;
        },
      },
      // Decorative/background/hero imagery
      {
        weight: 0.15,
        test: ($, $n) => {
          const bg = $n
            .find("div")
            .filter((_, el) =>
              /absolute|fixed|inset-0|bg-|cover|hero/i.test(
                $(el).attr("class") ?? "",
              ),
            )
            .find("img, picture").length;
          return bg > 0 || $n.find("img, picture").length === 1 ? 1 : 0;
        },
      },
    ],
    extract: ($, $n, base) => {
      const h1 = $n.find("h1").first();
      const headline = text(h1);

      const badge = text(
        $n
          .find("span, div, p")
          .filter((_, el) => {
            const $el = $(el);
            if ($el.parents("h1, h2, h3").length) return false;
            const t = text($el);
            return t.length > 0 && t.length < 60;
          })
          .first(),
      );

      const subtitle = text(
        $n
          .find("p")
          .filter((_, el) => text($(el)).length > 20)
          .first(),
      );

      const ctas = $n
        .find("a[href], button")
        .map((_, el) => ({
          title: text($(el)),
          href: abs($(el).attr("href"), base),
        }))
        .get()
        .filter((c) => c.title)
        .slice(0, 3);

      const imgSrc = abs($n.find("img, picture img").first().attr("src"), base);

      const out: DetectedField[] = [
        field("Headline", "single_line", headline, { required: true }),
      ];
      if (badge && badge !== headline) out.push(field("Badge", "single_line", badge));
      if (subtitle) out.push(field("Subtitle", "multi_line", subtitle));
      if (ctas[0]) out.push(field("Primary CTA", "url", ctas[0]));
      if (ctas[1]) out.push(field("Secondary CTA", "url", ctas[1]));
      if (imgSrc) out.push(field("Image", "file", imgSrc, { assetUrl: imgSrc }));
      return out;
    },
  },

  // ——— FAQ / Accordion ———
  {
    kind: "faq",
    name: "FAQ",
    signals: [
      // Native accordion is the strongest signal.
      {
        weight: 0.8,
        test: (_, $n) => ($n.find("details").length >= 2 ? 1 : 0),
      },
      // ARIA accordion pattern.
      {
        weight: 0.7,
        test: (_, $n) => ($n.find("[aria-expanded]").length >= 2 ? 1 : 0),
      },
      // Repeating Q+A as heading/button + following body.
      {
        weight: 0.5,
        test: ($, $n) => (findAccordionItems($, $n).length >= 3 ? 1 : 0),
      },
    ],
    extract: ($, $n) => {
      const items: Array<{ question: string; answer: string }> = [];

      const details = $n.find("details");
      if (details.length >= 2) {
        details.each((_, el) => {
          const $el = $(el);
          const q = text($el.find("summary").first());
          const a = text($el).replace(q, "").trim();
          if (q) items.push({ question: q, answer: a });
        });
      } else {
        const ariaBtns = $n.find("[aria-expanded]");
        if (ariaBtns.length >= 2) {
          ariaBtns.each((_, el) => {
            const $el = $(el);
            const q = text($el);
            const panelId = $el.attr("aria-controls");
            const panel = panelId ? $(`#${panelId}`) : $el.next();
            const a = text(panel as $Node);
            if (q) items.push({ question: q, answer: a });
          });
        } else {
          const accItems = findAccordionItems($, $n);
          accItems.each((_, el) => {
            const $el = $(el);
            const q = text($el.find("h2, h3, h4, h5, button, summary").first());
            const a = text($el.find("p, div").last());
            if (q) items.push({ question: q, answer: a });
          });
        }
      }

      return [
        field(
          "Section Title",
          "single_line",
          text($n.find("h2").first()) || "FAQ",
        ),
        field("Items", "group", items, {
          itemSchema: [
            field("Question", "single_line", ""),
            field("Answer", "rich_text", ""),
          ],
        }),
      ];
    },
  },

  // ——— Testimonials ———
  {
    kind: "testimonial",
    name: "Testimonials",
    signals: [
      {
        weight: 0.8,
        test: (_, $n) => {
          const n = $n.find("blockquote, q").length;
          return n >= 3 ? 1 : n === 2 ? 0.8 : n === 1 ? 0.4 : 0;
        },
      },
      // <cite> attribution
      {
        weight: 0.3,
        test: (_, $n) => ($n.find("cite").length > 0 ? 1 : 0),
      },
      // Repeating quote-like items (rounded avatar + short paragraph of text)
      {
        weight: 0.3,
        test: ($, $n) => {
          const rounded = $n.find("img").filter((_, el) => {
            const cls = $(el).attr("class") ?? "";
            return /rounded-full|avatar|circle/i.test(cls);
          });
          return rounded.length >= 2 ? 1 : 0;
        },
      },
    ],
    extract: ($, $n) => {
      const sectionTitle = text($n.find("h2").first());
      const quotes = $n.find("blockquote, q");
      let items: Array<{
        quote: string;
        author_name: string;
        role: string;
        avatar: string;
      }> = [];

      if (quotes.length > 0) {
        items = quotes
          .map((_, el) => {
            const $bq = $(el);
            const quote = text($bq);
            const $card = $bq.closest("div, article, li, figure");
            const $cite = $card.find("cite, figcaption").first();
            const citeText = text($cite);
            const [author_name = "", role = ""] = citeText
              .split(/[,—–·]/)
              .map((s) => s.trim());
            const avatar = abs($card.find("img").first().attr("src"), "");
            return { quote, author_name, role, avatar };
          })
          .get();
      }

      return [
        ...(sectionTitle ? [field("Section Title", "single_line", sectionTitle)] : []),
        field("Testimonials", "group", items, {
          itemSchema: [
            field("Quote", "multi_line", ""),
            field("Author Name", "single_line", ""),
            field("Role", "single_line", ""),
            field("Avatar", "file", ""),
          ],
        }),
      ];
    },
  },

  // ——— Media Gallery (video/iframe or many images) ———
  {
    kind: "media_gallery",
    name: "Media",
    signals: [
      {
        weight: 0.8,
        test: (_, $n) => ($n.find("iframe, video").length > 0 ? 1 : 0),
      },
      // Grid of images (not inside cards)
      {
        weight: 0.5,
        test: ($, $n) => {
          const imgs = $n.find("img").filter((_, el) => {
            return $(el).parents("article").length === 0;
          });
          return imgs.length >= 4 ? 1 : imgs.length === 3 ? 0.6 : 0;
        },
      },
      // No cards / no blockquotes (guard against misclassification)
      {
        weight: 0.15,
        test: (_, $n) =>
          $n.find("article, blockquote").length === 0 ? 1 : 0,
      },
    ],
    extract: ($, $n, base) => {
      const title = text($n.find("h2, h3").first());
      const description = text(
        $n.find("p").filter((_, el) => text($(el)).length > 10).first(),
      );
      const iframeSrc = abs($n.find("iframe").first().attr("src"), base);
      const videoSrc = abs($n.find("video source").first().attr("src"), base);
      const mediaSrc = iframeSrc || videoSrc;
      const images = $n
        .find("img")
        .map((_, el) => abs($(el).attr("src"), base))
        .get()
        .filter(Boolean);

      const out: DetectedField[] = [];
      if (title) out.push(field("Title", "single_line", title));
      if (description) out.push(field("Description", "multi_line", description));
      if (mediaSrc)
        out.push(field("Media URL", "url", { title: "Watch", href: mediaSrc }));
      if (images.length > 1) {
        out.push(
          field("Images", "group", images.map((src) => ({ image: src })), {
            itemSchema: [field("Image", "file", "")],
          }),
        );
      }
      return out;
    },
  },

  // ——— Card Grid ———
  {
    kind: "card_grid",
    name: "Card Grid",
    signals: [
      // Canonical: multiple <article> cards with image + heading
      {
        weight: 0.8,
        test: ($, $n) => {
          const cards = $n.find("article").filter(
            (_, el) =>
              $(el).find("h1, h2, h3, h4").length > 0 &&
              ($(el).find("img, picture").length > 0 ||
                $(el).find("p").length > 0),
          );
          return cards.length >= 3 ? 1 : cards.length >= 2 ? 0.8 : 0;
        },
      },
      // Repeating non-article cards
      {
        weight: 0.5,
        test: ($, $n) => {
          const cards = findCards($, $n);
          return cards.length >= 3 ? 1 : cards.length >= 2 ? 0.7 : 0;
        },
      },
    ],
    extract: ($, $n, base) => {
      let cardEls = $n
        .find("article")
        .filter((_, el) => $(el).find("h1, h2, h3, h4").length > 0);
      if (cardEls.length < 2) {
        const found = findCards($, $n);
        if (found.length >= 2) cardEls = found as typeof cardEls;
      }

      const cards = cardEls
        .map((_, el) => {
          const $el = $(el);
          const title = text($el.find("h1, h2, h3, h4").first());
          const image = abs($el.find("img, picture img").first().attr("src"), base);
          const link = abs($el.find("a").first().attr("href"), base);
          const excerpt = text($el.find("p").first());
          return { title, image, link, excerpt };
        })
        .get();

      const sectionTitle = text($n.find("h2").first());
      const sectionSub = text(
        $n
          .find("p")
          .filter((_, el) => $(el).parents("article").length === 0)
          .first(),
      );

      return [
        ...(sectionTitle ? [field("Section Title", "single_line", sectionTitle)] : []),
        ...(sectionSub ? [field("Section Subtitle", "multi_line", sectionSub)] : []),
        field("Cards", "group", cards, {
          itemSchema: [
            field("Title", "single_line", ""),
            field("Image", "file", ""),
            field("Link", "url", { title: "", href: "" }),
            field("Excerpt", "multi_line", ""),
          ],
        }),
      ];
    },
  },

  // ——— Feature List ———
  {
    kind: "feature_list",
    name: "Feature List",
    signals: [
      // Repeating items with icon + heading
      {
        weight: 0.7,
        test: ($, $n) => {
          const items = findFeatureItems($, $n);
          return items.length >= 3 ? 1 : items.length >= 2 ? 0.7 : 0;
        },
      },
      // Many short headings + short paragraphs (text-driven list)
      {
        weight: 0.3,
        test: (_, $n) => {
          const headings = $n.find("h3, h4").length;
          const paras = $n.find("p").length;
          return headings >= 3 && paras >= 3 && $n.find("article").length === 0
            ? 1
            : 0;
        },
      },
    ],
    extract: ($, $n, base) => {
      let items = findFeatureItems($, $n);
      if (items.length < 2) {
        items = repeatingItems(
          $,
          $n,
          "div, li",
          (el) => el.find("h3, h4, h5, strong").length > 0 && el.find("p").length > 0,
        );
      }

      const features = items
        .map((_, el) => {
          const $el = $(el);
          const title = text($el.find("h1, h2, h3, h4, h5, strong").first());
          const body = text($el.find("p").first());
          const icon = abs($el.find("img").first().attr("src"), base);
          return { title, body, ...(icon ? { icon } : {}) };
        })
        .get()
        .filter((f) => f.title);

      return [
        field(
          "Section Title",
          "single_line",
          text($n.find("h2").first()) || "Features",
        ),
        field("Features", "group", features, {
          itemSchema: [
            field("Title", "single_line", ""),
            field("Body", "multi_line", ""),
            field("Icon", "file", ""),
          ],
        }),
      ];
    },
  },

  // ——— CTA Banner ———
  {
    kind: "cta_banner",
    name: "CTA Banner",
    signals: [
      // Short section with a heading and an action — and nothing else going on.
      {
        weight: 0.7,
        test: (_, $n) => {
          const hasAction = $n.find("a[href], button").length > 0;
          const short = text($n).length < 500;
          const noList =
            $n.find("article, blockquote, iframe, video, details").length === 0;
          const headingOk = $n.find("h2, h3, strong").length > 0;
          return hasAction && short && noList && headingOk ? 1 : 0;
        },
      },
      // Single heading + single CTA, slightly looser
      {
        weight: 0.3,
        test: (_, $n) =>
          $n.find("h2, h3").length === 1 &&
          $n.find("a[href], button").length >= 1 &&
          $n.find("article").length === 0
            ? 1
            : 0,
      },
    ],
    extract: ($, $n, base) => {
      const heading = text($n.find("h1, h2, h3, strong").first());
      const body = text(
        $n.find("p").filter((_, el) => text($(el)) !== heading).first(),
      );
      const btn = $n.find("a[href], button").first();

      return [
        ...(heading ? [field("Heading", "single_line", heading)] : []),
        ...(body ? [field("Body", "multi_line", body)] : []),
        field("CTA", "url", {
          title: text(btn),
          href: abs(btn.attr("href"), base),
        }),
      ];
    },
  },

  // ——— Rich Text (fallback) ———
  {
    kind: "rich_text",
    name: "Content",
    signals: [
      {
        weight: 0.5,
        test: (_, $n) =>
          $n.find("p").length >= 2 &&
          $n.find("article, blockquote, iframe, video, details").length === 0
            ? 1
            : 0,
      },
      {
        weight: 0.3,
        test: (_, $n) => (text($n).length > 300 ? 1 : 0),
      },
    ],
    extract: (_, $n) => {
      const title = text($n.find("h1, h2, h3").first());
      const body = $n.html() ?? "";
      return [
        ...(title ? [field("Title", "single_line", title)] : []),
        field("Body", "rich_text", body),
      ];
    },
  },
];

// —— main entrypoint ——

export function detectComponents(
  html: string,
  baseUrl: string,
): DetectedComponent[] {
  const $ = cheerio.load(html);
  // Drop global chrome trees so nothing under them becomes a candidate.
  $(CHROME_SEL).remove();
  const out: DetectedComponent[] = [];
  let counter = 0;

  // Strip chrome so its descendants don't pollute candidate lists or text scoring.
  // We operate on a working copy via cheerio's selection; we don't mutate the DOM.
  // Candidates: sections first (most common content wrappers), then main > *,
  // explicit data-component markers, and article elements that live outside sections.
  const candidates = $(
    ["section", "main > *", "[data-component]", "article"].join(", "),
  )
    .toArray()
    .filter((el) => {
      const $el = $(el);
      if (isChrome($el)) return false;
      // Skip elements that are themselves descendants of another section/article —
      // those get handled by the outer candidate.
      if ($el.parents("section, article, [data-component]").length > 0) return false;
      return true;
    });

  type DomNode = (typeof candidates)[number];
  const seen = new Set<DomNode>();

  for (const el of candidates) {
    if (seen.has(el)) continue;
    const $n = $(el);

    // Parent already claimed? skip.
    if ($n.parents().toArray().some((p) => seen.has(p))) continue;

    // Skip near-empty nodes.
    const contentLength = text($n).length;
    const hasMedia = $n.find("img, picture, video, iframe, svg").length > 0;
    if (contentLength < 20 && !hasMedia) continue;

    // Score every rule; highest wins.
    const scored = RULES.map((rule) => {
      const total = rule.signals.reduce((s, sig) => s + sig.weight, 0) || 1;
      const score =
        rule.signals.reduce(
          (acc, sig) => acc + sig.weight * sig.test($, $n),
          0,
        ) / total;
      return { rule, score };
    }).sort((a, b) => b.score - a.score);

    const best = scored[0];
    if (!best || best.score < 0.25) continue;

    const fields = best.rule.extract($, $n, baseUrl);
    if (!fields.length) continue;

    // Prefer a detected text field as the preview label.
    const preview =
      (
        fields.find(
          (f) =>
            (f.type === "single_line" || f.type === "multi_line") &&
            typeof f.value === "string" &&
            (f.value as string).length > 0,
        )?.value as string | undefined
      ) ??
      text($n).slice(0, 120) ??
      best.rule.name;

    // UID derivation: prefer explicit id, then heading slug, then rule kind.
    const sectionId = $n.attr("id") ?? "";
    const h2Text = text($n.find("h2, h1").first());
    const suggestedUid =
      snakeCase(sectionId) ||
      snakeCase(h2Text) ||
      best.rule.kind;

    // Display name: heading text if short enough, otherwise the rule name.
    const name = h2Text && h2Text.length <= 50 ? h2Text : best.rule.name;

    counter += 1;
    seen.add(el);
    out.push({
      id: `c_${counter}_${best.rule.kind}`,
      kind: best.rule.kind,
      name,
      suggestedUid,
      confidence: Math.min(0.99, Math.max(0.35, best.score)),
      preview: String(preview).slice(0, 160),
      selector: buildSelector($n),
      fields,
      previewHtml: $.html($n),
    });
  }

  return out;
}

function buildSelector($n: $Node): string {
  const el = $n[0];
  if (!el || el.type !== "tag") return "unknown";
  const tag = el.tagName.toLowerCase();
  const id = $n.attr("id");
  if (id) return `${tag}#${id}`;
  const dataComp = $n.attr("data-component");
  if (dataComp) return `${tag}[data-component="${dataComp}"]`;
  const cls = ($n.attr("class") ?? "").split(/\s+/).filter(Boolean)[0];
  return cls ? `${tag}.${cls}` : tag;
}
