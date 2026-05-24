const CONTENT_URL = "./site-content/site.json";

const header = document.querySelector(".site-header");
const toggle = document.querySelector(".nav-toggle");
const navLinks = document.querySelectorAll(".site-nav a");
const countdown = document.querySelector(".countdown");
const photos = document.querySelectorAll(".brand-photo, .gallery-photo");

if (toggle && header) {
  toggle.addEventListener("click", () => {
    const expanded = toggle.getAttribute("aria-expanded") === "true";
    toggle.setAttribute("aria-expanded", String(!expanded));
    header.classList.toggle("is-open", !expanded);
  });
}

navLinks.forEach((link) => {
  link.addEventListener("click", () => {
    if (!header || !toggle) return;
    header.classList.remove("is-open");
    toggle.setAttribute("aria-expanded", "false");
  });
});

function setLineBreakText(element, value) {
  if (!element || typeof value !== "string") return;
  const parts = value.split(/\n+/);
  element.replaceChildren();
  parts.forEach((part, index) => {
    if (index > 0) {
      element.appendChild(document.createElement("br"));
    }
    element.appendChild(document.createTextNode(part));
  });
}

function processInstagramEmbeds() {
  if (window.instgrm?.Embeds?.process) {
    window.instgrm.Embeds.process();
  }
}

function buildCountdownTarget(nextGame) {
  if (!nextGame?.dateLabel || !nextGame?.time) return "";

  const dateMatch = nextGame.dateLabel.match(/(\d{4})\.(\d{1,2})\.(\d{1,2})/);
  const timeMatch = nextGame.time.match(/(\d{1,2}):(\d{2})/);

  if (!dateMatch || !timeMatch) return "";

  const [, year, month, day] = dateMatch;
  const [, hour, minute] = timeMatch;

  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}T${hour.padStart(2, "0")}:${minute}:00+09:00`;
}

function updateCountdown() {
  if (!countdown) return;

  const target = new Date(countdown.dataset.date);
  if (Number.isNaN(target.getTime())) return;

  const diff = target.getTime() - Date.now();
  const safeDiff = Math.max(diff, 0);
  const days = Math.floor(safeDiff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((safeDiff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((safeDiff / (1000 * 60)) % 60);

  countdown.querySelector('[data-unit="days"]').textContent = String(days).padStart(2, "0");
  countdown.querySelector('[data-unit="hours"]').textContent = String(hours).padStart(2, "0");
  countdown.querySelector('[data-unit="minutes"]').textContent = String(minutes).padStart(2, "0");
}

function extractScheduleDayLabel(rawDate) {
  const match = String(rawDate).match(/(\d{1,2})\/(\d{1,2})/);
  if (!match) return rawDate;

  const [, month, day] = match;
  return `${month.padStart(2, "0")}.${day.padStart(2, "0")}`;
}

function extractOpponentFromDetails(details) {
  const line = details.find((item) => item.startsWith("対戦相手:"));
  return line ? line.replace(/^対戦相手:\s*/, "") : "";
}

function renderAboutSections(sections) {
  const grid = document.querySelector("#about-grid");
  if (!grid || !Array.isArray(sections) || sections.length !== 3) return;

  grid.replaceChildren();

  sections.forEach((section, index) => {
    const article = document.createElement("article");
    article.className = "feature-card";

    const number = document.createElement("p");
    number.className = "feature-number";
    number.textContent = String(index + 1).padStart(2, "0");

    const heading = document.createElement("h3");
    heading.textContent = section.title;

    const body = document.createElement("p");
    body.textContent = section.body;

    article.append(number, heading, body);
    grid.appendChild(article);
  });
}

function renderScheduleItems(items) {
  const spotlightTitle = document.querySelector("#spotlight-title");
  const spotlightOpponent = document.querySelector("#spotlight-opponent");
  const spotlightDetails = document.querySelector("#spotlight-details");
  const scheduleList = document.querySelector("#schedule-list");

  if (!scheduleList || !Array.isArray(items) || items.length === 0) return;

  const [featured] = items;

  if (spotlightTitle) {
    spotlightTitle.textContent = featured.title;
  }

  if (spotlightOpponent) {
    spotlightOpponent.textContent = extractOpponentFromDetails(featured.details) || "詳細はスケジュールを確認";
  }

  if (spotlightDetails) {
    spotlightDetails.replaceChildren();
    const detailEntries = [
      { term: "日付", value: featured.date },
      ...featured.details.map((detail) => {
        const [rawTerm, ...rest] = detail.split(":");
        if (rest.length === 0) {
          return { term: "詳細", value: detail };
        }
        return { term: rawTerm.trim(), value: rest.join(":").trim() };
      }),
    ];

    detailEntries.slice(0, 4).forEach((entry) => {
      const wrapper = document.createElement("div");
      const term = document.createElement("dt");
      const value = document.createElement("dd");
      term.textContent = entry.term;
      value.textContent = entry.value;
      wrapper.append(term, value);
      spotlightDetails.appendChild(wrapper);
    });
  }

  scheduleList.replaceChildren();

  items.forEach((item) => {
    const card = document.createElement("article");
    card.className = "schedule-card schedule-card-detailed";

    const day = document.createElement("p");
    day.className = "schedule-day";
    day.textContent = extractScheduleDayLabel(item.date);

    const body = document.createElement("div");
    const heading = document.createElement("h3");
    heading.textContent = item.title;
    body.appendChild(heading);

    item.details.forEach((detail) => {
      const line = document.createElement("p");
      line.textContent = detail;
      body.appendChild(line);
    });

    card.append(day, body);
    scheduleList.appendChild(card);
  });
}

function renderGallery(urls) {
  const galleryGrid = document.querySelector("#gallery-grid");
  if (!galleryGrid || !Array.isArray(urls) || urls.length === 0) return;

  galleryGrid.replaceChildren();

  urls.forEach((url) => {
    const article = document.createElement("article");
    article.className = "gallery-card gallery-embed-card";

    const blockquote = document.createElement("blockquote");
    blockquote.className = "instagram-media";
    blockquote.dataset.instgrmPermalink = `${url}?utm_source=ig_embed&utm_campaign=loading`;
    blockquote.dataset.instgrmVersion = "14";

    article.appendChild(blockquote);
    galleryGrid.appendChild(article);
  });

  processInstagramEmbeds();
}

function applySiteContent(content) {
  if (!content || typeof content !== "object") return;

  if (content.hero) {
    setLineBreakText(document.querySelector("#hero-headline"), content.hero.headline);
    const heroDescription = document.querySelector("#hero-description");
    if (heroDescription) {
      heroDescription.textContent = content.hero.description;
    }
  }

  if (content.nextGame) {
    const nextGameDate = document.querySelector("#next-game-date");
    const nextGameOpponent = document.querySelector("#next-game-opponent");
    const nextGameLocation = document.querySelector("#next-game-location");
    const nextGameTime = document.querySelector("#next-game-time");

    if (nextGameDate) nextGameDate.textContent = content.nextGame.dateLabel;
    if (nextGameOpponent) nextGameOpponent.textContent = content.nextGame.opponent;
    if (nextGameLocation) nextGameLocation.textContent = content.nextGame.location;
    if (nextGameTime) nextGameTime.textContent = content.nextGame.time;

    if (countdown) {
      const target = buildCountdownTarget(content.nextGame);
      if (target) {
        countdown.dataset.date = target;
      }
    }
  }

  if (Array.isArray(content.aboutSections)) {
    renderAboutSections(content.aboutSections);
  }

  if (Array.isArray(content.scheduleItems)) {
    renderScheduleItems(content.scheduleItems);
  }

  if (content.gallery?.instagramPostUrls) {
    renderGallery(content.gallery.instagramPostUrls);
  }

  if (content.join) {
    setLineBreakText(document.querySelector(".join-panel h2"), content.join.headline);
    const joinBody = document.querySelector(".join-panel p:not(.section-label)");
    if (joinBody) {
      joinBody.textContent = content.join.body;
    }
  }

  if (content.contact?.instagramUrl) {
    document.querySelectorAll("[data-contact-link]").forEach((link) => {
      link.setAttribute("href", content.contact.instagramUrl);
    });
  }

  updateCountdown();
}

async function loadSiteContent() {
  try {
    const response = await fetch(CONTENT_URL, { cache: "no-store" });
    if (!response.ok) return;
    const content = await response.json();
    applySiteContent(content);
  } catch (error) {
    console.warn("Failed to load site content:", error);
  }
}

updateCountdown();
window.setInterval(updateCountdown, 60 * 1000);
window.addEventListener("load", () => {
  processInstagramEmbeds();
  loadSiteContent();
});
window.setTimeout(processInstagramEmbeds, 1200);

photos.forEach((photo) => {
  const fallback = photo.parentElement?.querySelector(".brand-photo-fallback, .gallery-photo-fallback");

  if (!fallback) return;

  function showPhoto() {
    fallback.hidden = true;
    photo.hidden = false;
  }

  function showFallback() {
    fallback.hidden = false;
    photo.hidden = true;
  }

  photo.addEventListener("load", showPhoto);
  photo.addEventListener("error", showFallback);

  if (photo.complete && photo.naturalWidth > 0) {
    showPhoto();
  } else {
    showFallback();
  }
});
