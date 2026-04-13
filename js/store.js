(function () {
  const C = window.DominioCore;
  const LOGO =
    "https://cdn.discordapp.com/attachments/1446480954289033239/1491786313249329212/5b6db380172d3f13038f6f204f322936.png?ex=69dd9305&is=69dc4185&hm=302f11bd8a8b465364c3fb472e7037131d9f0763a110512756702bba6e349b18&";

  const els = {
    settingsLine: document.getElementById("js-settings-line"),
    mcInput: document.getElementById("js-mc-name"),
    discordManual: document.getElementById("js-discord-manual"),
    discordManualWrap: document.getElementById("js-discord-manual-wrap"),
    btnDiscordOAuth: document.getElementById("js-discord-oauth"),
    btnDiscordClear: document.getElementById("js-discord-clear"),
    btnSaveIdentity: document.getElementById("js-save-identity"),
    chipMc: document.getElementById("js-chip-mc"),
    chipDc: document.getElementById("js-chip-dc"),
    grid: document.getElementById("js-product-grid"),
    toast: document.getElementById("js-toast"),
    modalBackdrop: document.getElementById("js-modal-backdrop"),
    modalTitle: document.getElementById("js-modal-title"),
    modalBody: document.getElementById("js-modal-body"),
    btnModalCancel: document.getElementById("js-modal-cancel"),
    btnModalConfirm: document.getElementById("js-modal-confirm"),
  };

  let settings = C.loadSettings();
  let pendingProduct = null;

  function toast(msg, isErr) {
    if (!els.toast) return;
    els.toast.textContent = msg;
    els.toast.classList.toggle("toast--err", Boolean(isErr));
    els.toast.classList.remove("hidden");
    window.clearTimeout(toast._t);
    toast._t = window.setTimeout(() => els.toast.classList.add("hidden"), 5200);
  }

  function renderSettingsLine() {
    if (!els.settingsLine) return;
    const bits = [];
    bits.push(settings.requireDiscord ? "Discord: 必須" : "Discord: 任意");
    if (settings.requireDiscordStrict) bits.push("DiscordはOAuthのみ");
    els.settingsLine.textContent = bits.join(" · ");
  }

  function renderIdentityChips() {
    const mc = C.getMcName();
    if (els.chipMc) {
      els.chipMc.textContent = C.isValidMcName(mc) ? `Minecraft: ${mc}` : "Minecraft: 未登録";
      els.chipMc.classList.toggle("chip--ok", C.isValidMcName(mc));
      els.chipMc.classList.toggle("chip--warn", !C.isValidMcName(mc));
    }
    const d = C.getDiscordProfile();
    const manual = C.getDiscordManual();
    if (els.chipDc) {
      if (d) {
        els.chipDc.textContent = `Discord: ${d.global_name || d.username} (@${d.username})`;
        els.chipDc.classList.add("chip--ok");
        els.chipDc.classList.remove("chip--warn");
      } else if (manual) {
        els.chipDc.textContent = `Discord(手入力): ${manual}`;
        els.chipDc.classList.add("chip--warn");
        els.chipDc.classList.remove("chip--ok");
      } else {
        els.chipDc.textContent = settings.requireDiscord ? "Discord: 未連携" : "Discord: 未使用";
        els.chipDc.classList.toggle("chip--warn", settings.requireDiscord);
        els.chipDc.classList.toggle("chip--ok", !settings.requireDiscord);
      }
    }
  }

  function syncInputsFromSession() {
    if (els.mcInput) els.mcInput.value = C.getMcName();
    if (els.discordManual) els.discordManual.value = C.getDiscordManual();
    if (els.discordManualWrap) {
      const show = !settings.requireDiscordStrict;
      els.discordManualWrap.classList.toggle("hidden", !show);
    }
    if (els.btnDiscordOAuth) {
      els.btnDiscordOAuth.disabled = !String(settings.discordClientId || "").trim();
    }
  }

  function renderProducts() {
    if (!els.grid) return;
    const list = C.sortProductsForStore(C.loadProducts());
    els.grid.innerHTML = "";
    if (!list.length) {
      const p = document.createElement("p");
      p.className = "muted";
      p.textContent = "現在、公開中の拠点リストはありません。管理者が商品を登録するとここに表示されます。";
      els.grid.appendChild(p);
      return;
    }

    for (const pr of list) {
      const card = document.createElement("article");
      card.className = "card";

      const top = document.createElement("div");
      top.className = "card__top";
      const h = document.createElement("h3");
      h.className = "card__title";
      h.textContent = pr.title || "無題の拠点";
      const price = document.createElement("div");
      price.className = "price";
      price.textContent = C.formatListedPrice(pr.priceAmount, pr.priceUnit);
      top.appendChild(h);
      top.appendChild(price);

      const meta = document.createElement("div");
      meta.className = "card__meta";
      const bits = [];
      if (pr.region) bits.push(`区域: ${pr.region}`);
      if (pr.coords) bits.push(`座標: ${pr.coords}`);
      meta.textContent = bits.join(" · ");

      const desc = document.createElement("p");
      desc.className = "card__desc";
      desc.textContent = pr.description || "";

      const row = document.createElement("div");
      row.className = "btn-row";
      const bInfo = document.createElement("button");
      bInfo.type = "button";
      bInfo.className = "btn btn--ghost";
      bInfo.textContent = "拠点仕様を確認";
      bInfo.addEventListener("click", () => openInfoModal(pr));

      const bBuy = document.createElement("button");
      bBuy.type = "button";
      bBuy.className = "btn";
      bBuy.textContent = "購入依頼を送る";
      bBuy.addEventListener("click", () => openConfirmModal(pr));

      row.appendChild(bInfo);
      row.appendChild(bBuy);

      card.appendChild(top);
      card.appendChild(meta);
      if (bits.length === 0) meta.classList.add("hidden");
      card.appendChild(desc);
      card.appendChild(row);
      els.grid.appendChild(card);
    }
  }

  function openInfoModal(pr) {
    if (!els.modalBackdrop) return;
    els.modalTitle.textContent = pr.title || "拠点情報";
    els.modalBody.innerHTML = "";
    const dl = document.createElement("dl");
    dl.className = "muted";
    function addRow(k, v) {
      if (!v) return;
      const dt = document.createElement("dt");
      dt.textContent = k;
      const dd = document.createElement("dd");
      dd.textContent = v;
      dd.style.margin = "0 0 0.65rem";
      dl.appendChild(dt);
      dl.appendChild(dd);
    }
    addRow("価格（目安・ゲーム内）", C.formatListedPrice(pr.priceAmount, pr.priceUnit));
    addRow("区域 / ディメンション", pr.region || "");
    addRow("座標", pr.coords || "");
    addRow("備考", pr.notes || "");
    const pre = document.createElement("pre");
    pre.className = "muted";
    pre.style.whiteSpace = "pre-wrap";
    pre.style.fontFamily = "inherit";
    pre.textContent = pr.description || "";
    els.modalBody.appendChild(dl);
    els.modalBody.appendChild(pre);
    els.btnModalConfirm.classList.add("hidden");
    els.btnModalCancel.textContent = "閉じる";
    els.modalBackdrop.classList.remove("hidden");
    pendingProduct = null;
  }

  function openConfirmModal(pr) {
    if (!els.modalBackdrop) return;
    pendingProduct = pr;
    els.modalTitle.textContent = "購入依頼の確認";
    els.modalBody.innerHTML = "";

    const p1 = document.createElement("p");
    p1.className = "muted";
    p1.textContent =
      "このボタンは「購入確定」ではなく、運営チャンネルへ取引希望通知を送ります。実際の受け渡し・支払いはゲーム内ルールに従ってください。";

    const ul = document.createElement("ul");
    ul.className = "muted";
    ul.style.paddingLeft = "1.1rem";
    const li1 = document.createElement("li");
    li1.textContent = `拠点: ${pr.title}`;
    const li2 = document.createElement("li");
    li2.textContent = `提示価格帯: ${C.formatListedPrice(pr.priceAmount, pr.priceUnit)}（K/M/B/T）`;
    const li3 = document.createElement("li");
    li3.textContent = `Minecraft: ${C.getMcName() || "未入力"}`;
    ul.appendChild(li1);
    ul.appendChild(li2);
    ul.appendChild(li3);

    if (!C.isValidMcName(C.getMcName())) {
      const w = document.createElement("p");
      w.className = "muted";
      w.style.color = "#ffc4c4";
      w.textContent = "Minecraft ユーザー名が未登録、または形式が不正です。";
      els.modalBody.appendChild(w);
    }
    if (settings.requireDiscord && !C.canPurchase(settings)) {
      const w = document.createElement("p");
      w.className = "muted";
      w.style.color = "#ffc4c4";
      w.textContent = settings.requireDiscordStrict
        ? "Discord OAuth 連携が必須です。"
        : "Discord 連携（OAuth）または手入力のいずれかが必須です。";
      els.modalBody.appendChild(w);
    }
    if (!String(settings.webhookUrl || "").trim()) {
      const w = document.createElement("p");
      w.className = "muted";
      w.style.color = "#ffc4c4";
      w.textContent = "管理者が Webhook を未設定のため、通知を送れません。";
      els.modalBody.appendChild(w);
    }

    els.modalBody.appendChild(p1);
    els.modalBody.appendChild(ul);

    els.btnModalConfirm.classList.remove("hidden");
    els.btnModalCancel.textContent = "キャンセル";
    els.modalBackdrop.classList.remove("hidden");

    const ok =
      C.isValidMcName(C.getMcName()) &&
      C.canPurchase(settings) &&
      Boolean(String(settings.webhookUrl || "").trim());
    els.btnModalConfirm.disabled = !ok;
  }

  function closeModal() {
    if (els.modalBackdrop) els.modalBackdrop.classList.add("hidden");
    pendingProduct = null;
  }

  async function confirmPurchase() {
    if (!pendingProduct) return;
    const mc = C.getMcName();
    const text = C.buildPurchaseNotice(pendingProduct.title || "拠点", mc, settings);
    try {
      els.btnModalConfirm.disabled = true;
      await C.postDiscordWebhookForm(settings.webhookUrl, text);
      toast("運営チャンネルへ購入依頼通知を送信しました。", false);
      closeModal();
    } catch (e) {
      toast(e && e.message ? e.message : "通知送信に失敗しました。", true);
      els.btnModalConfirm.disabled = false;
    }
  }

  function startDiscordImplicit() {
    const id = String(settings.discordClientId || "").trim();
    if (!id) {
      toast("Discord Client ID が未設定です（管理者が admin で設定）。", true);
      return;
    }
    const redirect = C.absUrl("callback.html");
    const state = String(Math.random()).slice(2) + String(Date.now());
    sessionStorage.setItem(C.STORAGE.oauthState, state);
    sessionStorage.setItem(C.STORAGE.oauthReturn, C.absUrl("index.html"));
    const url = new URL("https://discord.com/oauth2/authorize");
    url.searchParams.set("client_id", id);
    url.searchParams.set("response_type", "token");
    url.searchParams.set("scope", "identify");
    url.searchParams.set("redirect_uri", redirect);
    url.searchParams.set("state", state);
    url.searchParams.set("prompt", "consent");
    globalThis.location.href = url.toString();
  }

  function wire() {
    if (els.btnSaveIdentity) {
      els.btnSaveIdentity.addEventListener("click", () => {
        const name = els.mcInput ? els.mcInput.value : "";
        C.setMcName(name);
        C.setDiscordManual(els.discordManual ? els.discordManual.value : "");
        if (!C.isValidMcName(C.getMcName())) {
          toast("Minecraft ユーザー名は 3〜16 文字の英数字と _ のみです。", true);
        } else {
          toast("身元情報を保存しました（このブラウザのセッション）。", false);
        }
        renderIdentityChips();
      });
    }
    if (els.btnDiscordOAuth) {
      els.btnDiscordOAuth.addEventListener("click", startDiscordImplicit);
    }
    if (els.btnDiscordClear) {
      els.btnDiscordClear.addEventListener("click", () => {
        C.setDiscordProfile(null);
        C.setDiscordManual("");
        if (els.discordManual) els.discordManual.value = "";
        renderIdentityChips();
        toast("Discord 連携情報を消去しました。", false);
      });
    }
    if (els.btnModalCancel) els.btnModalCancel.addEventListener("click", closeModal);
    if (els.btnModalConfirm) els.btnModalConfirm.addEventListener("click", confirmPurchase);
    if (els.modalBackdrop) {
      els.modalBackdrop.addEventListener("click", (ev) => {
        if (ev.target === els.modalBackdrop) closeModal();
      });
    }
  }

  function boot() {
    settings = C.loadSettings();
    renderSettingsLine();
    syncInputsFromSession();
    renderIdentityChips();
    renderProducts();
    wire();

    const img = document.getElementById("js-brand-logo");
    if (img && !img.getAttribute("src")) img.setAttribute("src", LOGO);

    const params = new URLSearchParams(globalThis.location.search);
    if (params.get("discord") === "fail") {
      toast("Discord 連携に失敗しました。Developer Portal の Redirect / Implicit 設定を確認してください。", true);
    }

    window.addEventListener("storage", (ev) => {
      if (!ev.key || ev.key === C.STORAGE.settings || ev.key === C.STORAGE.products) {
        settings = C.loadSettings();
        renderSettingsLine();
        syncInputsFromSession();
        renderIdentityChips();
        renderProducts();
      }
    });
  }

  boot();
})();
