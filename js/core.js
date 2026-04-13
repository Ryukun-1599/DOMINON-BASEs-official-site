/**
 * DOMINIO BASEs — shared static helpers (no build step)
 */
(function (global) {
  const STORAGE = {
    products: "dominio_bases_products_v1",
    settings: "dominio_bases_settings_v1",
    discordProfile: "dominio_discord_profile_v1",
    mcName: "dominio_mc_name_v1",
    oauthReturn: "dominio_oauth_return_v1",
    oauthState: "dominio_oauth_state_v1",
  };

  const UNITS = ["K", "M", "B", "T"];
  const UNIT_MUL = { K: 1e3, M: 1e6, B: 1e9, T: 1e12 };

  function defaultSettings() {
    return {
      adminPin: "",
      webhookUrl: "",
      discordClientId: "",
      /** If true, buyer must complete Discord OAuth OR manual Discord id (see requireDiscordStrict) */
      requireDiscord: false,
      /**
       * If true with requireDiscord, manual text is not accepted; OAuth profile required.
       * Static sites: keep false unless implicit OAuth works for your app configuration.
       */
      requireDiscordStrict: false,
      serverTagline: "DonutSMP 向け · 拠点取引カウンター",
    };
  }

  function loadSettings() {
    try {
      const raw = localStorage.getItem(STORAGE.settings);
      if (!raw) return defaultSettings();
      return { ...defaultSettings(), ...JSON.parse(raw) };
    } catch {
      return defaultSettings();
    }
  }

  function saveSettings(s) {
    localStorage.setItem(STORAGE.settings, JSON.stringify(s));
  }

  function loadProducts() {
    try {
      const raw = localStorage.getItem(STORAGE.products);
      if (!raw) return [];
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr : [];
    } catch {
      return [];
    }
  }

  function saveProducts(list) {
    localStorage.setItem(STORAGE.products, JSON.stringify(list));
  }

  function uid() {
    if (global.crypto && crypto.randomUUID) return crypto.randomUUID();
    return "id_" + String(Date.now()) + "_" + String(Math.random()).slice(2, 8);
  }

  function normalizeMcName(name) {
    return String(name || "")
      .trim()
      .replace(/\s+/g, "");
  }

  function isValidMcName(name) {
    const n = normalizeMcName(name);
    return /^[A-Za-z0-9_]{3,16}$/.test(n);
  }

  function parsePrice(amount, unit) {
    const u = String(unit || "K").toUpperCase();
    const a = Number(amount);
    if (!Number.isFinite(a) || a < 0) return NaN;
    const mul = UNIT_MUL[u];
    if (!mul) return NaN;
    return a * mul;
  }

  function formatCompactDons(value) {
    const v = Number(value);
    if (!Number.isFinite(v) || v < 0) return "—";
    let n = v;
    let i = -1;
    while (n >= 1000 && i < UNITS.length - 1) {
      n /= 1000;
      i++;
    }
    if (i < 0) return trimNum(n);
    return trimNum(n) + UNITS[i];
  }

  function trimNum(n) {
    const s = n >= 100 ? n.toFixed(0) : n >= 10 ? n.toFixed(1) : n.toFixed(2);
    return s.replace(/\.?0+$/, "");
  }

  /** amount is numeric in chosen unit (e.g. 12.5 M) */
  function formatListedPrice(amount, unit) {
    const u = String(unit || "K").toUpperCase();
    const a = Number(amount);
    if (!Number.isFinite(a)) return "—";
    return `${trimNum(a)}${u}`;
  }

  function sortProductsForStore(list) {
    const published = list.filter((p) => p && p.published);
    published.sort((a, b) => {
      const va = parsePrice(a.priceAmount, a.priceUnit);
      const vb = parsePrice(b.priceAmount, b.priceUnit);
      if (Number.isFinite(va) && Number.isFinite(vb) && va !== vb) return va - vb;
      return String(a.title || "").localeCompare(String(b.title || ""));
    });
    return published;
  }

  function absUrl(relativeFile) {
    return new URL(relativeFile, global.location.href).href;
  }

  function getDiscordProfile() {
    try {
      const raw = sessionStorage.getItem(STORAGE.discordProfile);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  function setDiscordProfile(profile) {
    if (!profile) {
      sessionStorage.removeItem(STORAGE.discordProfile);
      return;
    }
    sessionStorage.setItem(STORAGE.discordProfile, JSON.stringify(profile));
  }

  function getMcName() {
    return sessionStorage.getItem(STORAGE.mcName) || "";
  }

  function setMcName(name) {
    const n = normalizeMcName(name);
    sessionStorage.setItem(STORAGE.mcName, n);
  }

  function discordManualKey() {
    return "dominio_discord_manual_v1";
  }

  function getDiscordManual() {
    return sessionStorage.getItem(discordManualKey()) || "";
  }

  function setDiscordManual(v) {
    const t = String(v || "").trim();
    if (!t) sessionStorage.removeItem(discordManualKey());
    else sessionStorage.setItem(discordManualKey(), t);
  }

  function buyerDiscordLabel(settings) {
    const p = getDiscordProfile();
    if (p) {
      const dn = p.global_name || p.username || p.id;
      return p.username ? `${dn} (@${p.username})` : String(dn);
    }
    if (!settings.requireDiscordStrict && getDiscordManual()) {
      return getDiscordManual();
    }
    return "";
  }

  function canPurchase(settings) {
    if (!isValidMcName(getMcName())) return false;
    if (!settings.requireDiscord) return true;
    if (settings.requireDiscordStrict) return Boolean(getDiscordProfile());
    return Boolean(getDiscordProfile() || getDiscordManual());
  }

  /**
   * Sends Discord webhook via classic HTML form POST (multipart) to avoid fetch CORS limits.
   * Discord accepts multipart form field "content" for simple messages.
   */
  function postDiscordWebhookForm(webhookUrl, text) {
    return new Promise((resolve, reject) => {
      if (!/^https:\/\/(discord\.com|discordapp\.com)\/api\/webhooks\//.test(String(webhookUrl))) {
        reject(new Error("Webhook URL が Discord の形式ではありません。"));
        return;
      }
      const iframe = document.createElement("iframe");
      iframe.name = "dominio_wh_" + String(Date.now());
      iframe.title = "discord-webhook";
      iframe.className = "hidden";
      iframe.setAttribute("aria-hidden", "true");
      iframe.setAttribute("tabindex", "-1");
      document.body.appendChild(iframe);

      const form = document.createElement("form");
      form.method = "POST";
      form.action = String(webhookUrl);
      form.target = iframe.name;
      form.enctype = "multipart/form-data";

      const inp = document.createElement("input");
      inp.type = "hidden";
      inp.name = "content";
      inp.value = String(text);
      form.appendChild(inp);

      document.body.appendChild(form);

      let settled = false;
      const done = () => {
        try {
          document.body.removeChild(form);
        } catch {}
        setTimeout(() => {
          try {
            document.body.removeChild(iframe);
          } catch {}
        }, 1500);
      };

      const finish = (fn) => {
        if (settled) return;
        settled = true;
        done();
        fn();
      };

      iframe.addEventListener("load", () => {
        finish(() => resolve());
      });

      iframe.addEventListener("error", () => {
        finish(() => reject(new Error("Webhook 送信 iframe エラー")));
      });

      window.setTimeout(() => {
        finish(() => resolve());
      }, 8000);

      try {
        form.submit();
      } catch (e) {
        done();
        reject(e);
      }
    });
  }

  function buildPurchaseNotice(productTitle, mcName, settings) {
    const when = new Date();
    const dt = new Intl.DateTimeFormat("ja-JP", {
      dateStyle: "medium",
      timeStyle: "medium",
    }).format(when);
    const disc = buyerDiscordLabel(settings);
    const lines = [`[${String(productTitle)}]`, `[${String(mcName)}]`];
    if (disc) lines.push(`Discord: ${disc}`);
    lines.push(dt);
    return lines.join("\n");
  }

  global.DominioCore = {
    STORAGE,
    UNITS,
    defaultSettings,
    loadSettings,
    saveSettings,
    loadProducts,
    saveProducts,
    uid,
    normalizeMcName,
    isValidMcName,
    parsePrice,
    formatCompactDons,
    formatListedPrice,
    sortProductsForStore,
    absUrl,
    getDiscordProfile,
    setDiscordProfile,
    getMcName,
    setMcName,
    getDiscordManual,
    setDiscordManual,
    canPurchase,
    postDiscordWebhookForm,
    buildPurchaseNotice,
  };
})(window);
