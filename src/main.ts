import "./style.css";

type Article = {
  title: string;
  page: string;
  text: string;
  steps: string[];
  keywords: string[];
  source: string;
  fileName: string;
};

const latestJsonFiles = [
  "activity-logs.json",
  "branches.json",
  "business-rules.json",
  "cashier-setup.json",
  "cashier.json",
  "charges.json",
  "common-questions.json",
  "customers.json",
  "dashboard.json",
  "end-of-day.json",
  "expenses.json",
  "inventory-count.json",
  "inventory.json",
  "loss-damage.json",
  "payment-methods.json",
  "pricelists.json",
  "pricetag.json",
  "products.json",
  "promotions.json",
  "purchase-orders.json",
  "reporting.json",
  "settings.json",
  "setup-checklist.json",
  "stock-adjustment.json",
  "stock-conversion.json",
  "stock-transfer.json",
  "suppliers.json",
  "tax-config.json",
  "troubleshooting.json",
  "users.json"
];

let articles: Article[] = [];

const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const tokens = (value: string) =>
  normalize(value)
    .split(" ")
    .filter((token) => token.length > 2);

const searchToken = (token: string) =>
  token.length > 4 && token.endsWith("s") ? token.slice(0, -1) : token;

const searchTokens = (value: string) => tokens(value).map(searchToken);

const toTitleCase = (value: string) =>
  value
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (character) => character.toUpperCase());

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;"
  })[character] ?? character);

async function loadArticles() {
  const loaded = await Promise.all(
    latestJsonFiles.map(async (fileName) => {
      const response = await fetch(`/${fileName}`);
      if (!response.ok) {
        throw new Error(`Failed to load ${fileName}`);
      }

      const data = await response.json();
      if (!Array.isArray(data)) {
        return [] as Article[];
      }

      const source = toTitleCase(fileName.replace(/\.json$/, ""));

      return data
        .filter((item) => item && typeof item === "object")
        .map((item) => {
          const record = item as Record<string, unknown>;
          const steps = Array.isArray(record.steps) ? record.steps.map((step) => String(step)) : [];
          const keywords = Array.isArray(record.keywords) ? record.keywords.map((keyword) => String(keyword)) : [];

          return {
            title: String(record.title ?? "Untitled article"),
            page: String(record.page ?? "/"),
            text: String(record.text ?? ""),
            steps,
            keywords,
            source,
            fileName
          } as Article;
        });
    })
  );

  return loaded.flat();
}

const suggestions = [
  "add a branch",
  "when does stock change",
  "what is net sales",
  "set up receipt printer",
  "make a sale",
  "check customer balance"
];

function findArticle(query: string) {
  const queryTokens = searchTokens(query);
  const queryPhrase = queryTokens.join(" ");

  if (!queryTokens.length || !queryPhrase) {
    return null;
  }

  const ranked = articles
    .map((article) => {
      const searchableText = searchTokens(
        `${article.title} ${article.text} ${article.keywords.join(" ")} ${article.steps.join(" ")}`
      );
      const titleTokens = searchTokens(article.title);
      const keywordTokens = searchTokens(article.keywords.join(" "));
      const matchedTokens = queryTokens.filter((token) => searchableText.includes(token));
      const titleMatches = queryTokens.filter((token) => titleTokens.includes(token)).length;
      const keywordMatches = queryTokens.filter((token) => keywordTokens.includes(token)).length;
      const exactTitleMatch = searchTokens(article.title).join(" ") === queryPhrase ? 18 : 0;
      const exactKeywordMatch = article.keywords.some(
        (keyword) => searchTokens(keyword).join(" ") === queryPhrase
      ) ? 24 : 0;

      return {
        article,
        score: matchedTokens.length * 2 + titleMatches * 8 + keywordMatches * 6 + exactTitleMatch + exactKeywordMatch
      };
    })
    .sort((a, b) => b.score - a.score);

  return ranked[0]?.score > 0 ? ranked[0] : null;
}

function getQuickActions(article: Article, query: string) {
  const queryWords = new Set(tokens(query));

  return articles
    .filter((candidate) => candidate.title !== article.title)
    .map((candidate) => {
      const shared = candidate.keywords
        .map((keyword) => ({
          keyword,
          overlap: tokens(keyword).filter((word) => queryWords.has(word))
        }))
        .filter(({ overlap }) => overlap.length > 0)
        .sort((a, b) => b.overlap.length - a.overlap.length || b.keyword.length - a.keyword.length);

      return {
        candidate,
        match: shared[0]
      };
    })
    .filter(({ match }) => match && match.overlap.length > 0)
    .sort((a, b) => (b.match?.overlap.length ?? 0) - (a.match?.overlap.length ?? 0))
    .slice(0, 2)
    .map(({ candidate, match }) => [`Related: ${candidate.title} · ${match!.keyword}`, match!.keyword]);
}

const app = document.querySelector<HTMLDivElement>("#app")!;

app.innerHTML = `
  <div class="shell">
    <aside class="sidebar">
      <div class="brand">
        <span class="brand-mark">✦</span>
        <span>BranchDesk</span>
      </div>

      <div class="sidebar-label">Workspace</div>
      <nav>
        <a class="nav-item" href="#"><span>⌂</span>Overview</a>
        <a class="nav-item active" href="#"><span>◇</span>Knowledge base</a>
        <a class="nav-item" href="#"><span>▦</span>Products</a>
        <a class="nav-item" href="#"><span>⚙</span>Settings</a>
      </nav>

      <div class="sidebar-panel">
        <div class="sidebar-panel-header">Latest JSON</div>
        <div class="sidebar-panel-list">
          ${latestJsonFiles.map((fileName) => `<span>${fileName}</span>`).join("")}
        </div>
      </div>

      <div class="sidebar-footer">
        <span class="avatar">AM</span>
        <div>
          <strong>Admin mode</strong>
          <small>All branches</small>
        </div>
        <span class="dots">•••</span>
      </div>
    </aside>

    <main class="main-content">
      <header class="topbar">
        <div>
          <span class="eyebrow">HELP CENTER / STORE OPERATIONS</span>
          <h1>Knowledge base</h1>
        </div>

        <div class="top-actions">
          <span class="status-badge" id="connection-status">Loading library</span>
          <button class="branch-pill" type="button">
            <span class="status-dot"></span>
            Downtown · Main branch
            <span class="chevron">⌄</span>
          </button>
        </div>
      </header>

      <section class="stats-grid">
        <article class="stat-card accent">
          <span>Indexed entries</span>
          <strong>--</strong>
          <small>across the help library</small>
        </article>
        <article class="stat-card">
          <span>Latest JSON</span>
          <strong>${latestJsonFiles.length}</strong>
          <small>updated support files</small>
        </article>
        <article class="stat-card">
          <span>Topics covered</span>
          <strong>--</strong>
          <small>areas and modules</small>
        </article>
      </section>

      <section class="content-grid">
        <div class="chat-column">
          <div class="intro">
            <span class="intro-icon">✦</span>
            <div>
              <h2>Ask about your store</h2>
              <p>Search the latest inventory, cashier, reporting, and product content.</p>
            </div>
          </div>

          <div class="chat-window" id="chat-window">
            <div class="message assistant">
              <span class="mini-mark">✦</span>
              <div>
                <p>Hi! I can help with branch setup, sales, inventory, products, reporting, customers, and daily operations. Try a question or one of the suggested prompts.</p>
                <span class="message-time">Just now</span>
              </div>
            </div>
          </div>

          <form class="composer" id="chat-form">
            <input id="question" autocomplete="off" placeholder="Try “when does stock change?”" aria-label="Ask a store question" />
            <button type="submit" aria-label="Send question">↑</button>
          </form>

          <div class="suggestions">
            <span>Try asking</span>
            ${suggestions.map((suggestion) => `<button type="button" class="suggestion">${suggestion}</button>`).join("")}
          </div>
        </div>

        <aside class="inspector">
          <div class="inspector-heading">
            <span>Content match</span>
            <span class="count">0 articles</span>
          </div>

          <div id="match-card" class="match-card empty">
            <span class="match-icon">⌕</span>
            <h3>No matching article yet</h3>
            <p>Search the knowledge base for sales, stock, products, payments, cashier setup, or customer rules.</p>
          </div>
        </aside>
      </section>
    </main>
  </div>
`;

const chatWindow = document.querySelector<HTMLDivElement>("#chat-window")!;
const questionInput = document.querySelector<HTMLInputElement>("#question")!;
const matchCard = document.querySelector<HTMLDivElement>("#match-card")!;

function updateSummary() {
  const sourceBreakdown = Object.entries(
    articles.reduce<Record<string, number>>((totals, article) => {
      totals[article.source] = (totals[article.source] ?? 0) + 1;
      return totals;
    }, {})
  ).sort((a, b) => b[1] - a[1]);

  const statCount = document.querySelector(".stat-card strong");
  const topicCount = document.querySelectorAll(".stat-card strong")[2];
  const matchCount = document.querySelector(".inspector-heading .count");

  if (statCount) statCount.textContent = String(articles.length);
  if (topicCount) topicCount.textContent = String(sourceBreakdown.length);
  if (matchCount) matchCount.textContent = `${articles.length} articles`;
}

function ask(query: string) {
  const cleanQuery = query.trim();
  if (!cleanQuery) return;

  const result = findArticle(cleanQuery);

  if (!result) {
    matchCard.className = "match-card empty";
    matchCard.innerHTML = `
      <span class="match-icon">⌕</span>
      <h3>No matching article</h3>
      <p>Try a phrase about inventory, products, customer balances, sales totals, or cashier setup.</p>
    `;

    chatWindow.insertAdjacentHTML(
      "beforeend",
      `<div class="message user"><div><p>${escapeHtml(cleanQuery)}</p><span class="message-time">Just now</span></div></div><div class="message assistant"><span class="mini-mark">✦</span><div><p>I could not find a strong match for that request. Try narrowing it to a keyword like product, stock, refund, branch, payment, or sales.</p></div></div>`
    );
    chatWindow.scrollTop = chatWindow.scrollHeight;
    questionInput.value = "";
    return;
  }

  const confidence = Math.min(99, Math.max(68, Math.round((result.score / Math.max(4, cleanQuery.split(/\s+/).length)) * 100)));

  chatWindow.insertAdjacentHTML(
    "beforeend",
    `<div class="message user"><div><p>${escapeHtml(cleanQuery)}</p><span class="message-time">Just now</span></div></div>`
  );

  const quickActions = getQuickActions(result.article, cleanQuery)
    .map(([label, queryText]) => `<button class="quick-action" type="button" data-query="${escapeHtml(queryText)}">${label}<span>→</span></button>`)
    .join("");

  chatWindow.insertAdjacentHTML(
    "beforeend",
    `<div class="message assistant"><span class="mini-mark">✦</span><div><p>${escapeHtml(result.article.text)}</p><div class="chat-steps"><strong>Suggested steps</strong><ol>${result.article.steps.map((step) => `<li>${escapeHtml(step)}</li>`).join("")}</ol></div>${quickActions ? `<div class="quick-actions">${quickActions}</div>` : ""}<div class="answer-meta"><span>${escapeHtml(result.article.title)}</span><span>${escapeHtml(result.article.source)}</span><span>${confidence}% match</span></div></div></div>`
  );

  matchCard.className = "match-card";
  matchCard.innerHTML = `
    <div class="match-top">
      <span class="match-icon filled">✦</span>
      <span class="confidence">${confidence}% match</span>
    </div>
    <h3>${escapeHtml(result.article.title)}</h3>
    <p>${escapeHtml(result.article.text)}</p>
    <div class="meta-block"><span class="meta-label">Source</span><code>${escapeHtml(result.article.source)}</code></div>
    <div class="meta-block"><span class="meta-label">Page</span><code>${escapeHtml(result.article.page)}</code></div>
    <div class="meta-block"><span class="meta-label">JSON</span><code>${escapeHtml(result.article.fileName)}</code></div>
    <div class="keyword-list">${result.article.keywords.slice(0, 6).map((keyword) => `<span>${escapeHtml(keyword)}</span>`).join("")}</div>
  `;

  chatWindow.scrollTop = chatWindow.scrollHeight;
  questionInput.value = "";
}

async function initialize() {
  const status = document.querySelector<HTMLSpanElement>("#connection-status");

  try {
    articles = await loadArticles();
    updateSummary();
    if (status) status.textContent = "Live data";
  } catch (error) {
    console.error(error);
    if (status) {
      status.textContent = "Library unavailable";
      status.classList.add("error");
    }
    matchCard.className = "match-card empty error-card";
    matchCard.innerHTML = `
      <span class="match-icon">!</span>
      <h3>Content could not load</h3>
      <p>Refresh the page and confirm the app is being served from its project folder.</p>
    `;
  }

  document.querySelector<HTMLFormElement>("#chat-form")?.addEventListener("submit", (event) => {
    event.preventDefault();
    ask(questionInput.value);
  });

  document.querySelectorAll<HTMLButtonElement>(".suggestion").forEach((button) => {
    button.addEventListener("click", () => ask(button.textContent ?? ""));
  });

  document.addEventListener("click", (event) => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>(".quick-action");
    if (button?.dataset.query) {
      ask(button.dataset.query);
    }
  });
}

void initialize();
