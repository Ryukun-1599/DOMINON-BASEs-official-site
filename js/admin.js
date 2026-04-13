(function () {
  const C = window.DominioCore;
  const SESSION_KEY = "dominio_admin_unlocked_v1";

  const els = {
    gate: document.getElementById("js-gate"),
    gateTitle: document.getElementById("js-gate-title"),
    gateHelp: document.getElementById("js-gate-help"),
    pin: document.getElementById("js-pin"),
    unlock: document.getElementById("js-unlock"),
    setup: document.getElementById("js-setup"),
    initPin: document.getElementById("js-init-pin"),
    initWebhook: document.getElementById("js-init-webhook"),
    initClient: document.getElementById("js-init-client"),
    initSave: document.getElementById("js-init-save"),
    console: document.getElementById("js-console"),
    logout: document.getElementById("js-logout"),
    webhook: document.getElementById("js-webhook"),
    client: document.getElementById("js-client"),
    tagline: document.getElementById("js-tagline"),
    toggleReq: document.getElementById("js-toggle-req"),
    toggleStrict: document.getElementById("js-toggle-strict"),
    pillReq: document.getElementById("js-pill-req"),
    pillStrict: document.getElementById("js-pill-strict"),
    saveSettings: document.getElementById("js-save-settings"),
    testWebhook: document.getElementById("js-test-webhook"),
    oldPin: document.getElementById("js-old-pin"),
    newPin: document.getElementById("js-new-pin"),
    changePin: document.getElementById("js-change-pin"),
    pTitle: document.getElementById("js-p-title"),
    pRegion: document.getElementById("js-p-region"),
    pCoords: document.getElementById("js-p-coords"),
    pDesc: document.getElementById("js-p-desc"),
    pNotes: document.getElementById("js-p-notes"),
    pAmount: document.getElementById("js-p-amount"),
    pUnit: document.getElementById("js-p-unit"),
    addProduct: document.getElementById("js-add-product"),
    clearProductForm: document.getElementById("js-clear-product-form"),
    tableBody: document.querySelector("#js-table tbody"),
    exportBtn: document.getElementById("js-export"),
    importInput: document.getElementById("js-import"),
    toast: document.getElementById("js-toast"),
  };

  let settings = C.loadSettings();

  function toast(msg, isErr) {
    if (!els.toast) return;
    els.toast.textContent = msg;
    els.toast.classList.toggle("toast--err", Boolean(isErr));
    els.toast.classList.remove("hidden");
    window.clearTimeout(toast._t);
    toast._t = window.setTimeout(() => els.toast.classList.add("hidden"), 5200);
  }

  function isUnlocked() {
    return sessionStorage.getItem(SESSION_KEY) === "1";
  }

  function setUnlocked(v) {
    if (v) sessionStorage.setItem(SESSION_KEY, "1");
    else sessionStorage.removeItem(SESSION_KEY);
  }

  function renderPills() {
    if (els.pillReq) {
      els.pillReq.textContent = settings.requireDiscord ? "Discord必須: ON" : "Discord必須: OFF";
      els.pillReq.classList.toggle("pill--on", settings.requireDiscord);
      els.pillReq.classList.toggle("pill--off", !settings.requireDiscord);
    }
    if (els.pillStrict) {
      els.pillStrict.textContent = settings.requireDiscordStrict ? "OAuthのみ: ON" : "OAuthのみ: OFF";
      els.pillStrict.classList.toggle("pill--on", settings.requireDiscordStrict);
      els.pillStrict.classList.toggle("pill--off", !settings.requireDiscordStrict);
    }
  }

  function syncSettingsForm() {
    if (els.webhook) els.webhook.value = settings.webhookUrl || "";
    if (els.client) els.client.value = settings.discordClientId || "";
    if (els.tagline) els.tagline.value = settings.serverTagline || "";
    renderPills();
  }

  function refreshGateUI() {
    const needsInit = !String(settings.adminPin || "").trim();
    if (els.gateHelp) {
      els.gateHelp.textContent = needsInit
        ? "まだ PIN が未設定です。初期セットアップへ進んでください。"
        : "PIN を入力してロックを解除してください。";
    }
    if (els.gateTitle) els.gateTitle.textContent = needsInit ? "初期セットアップへ" : "ロック解除";

    const unlocked = isUnlocked();
    if (els.gate) els.gate.classList.toggle("hidden", needsInit || unlocked);
    if (els.setup) els.setup.classList.toggle("hidden", !needsInit || unlocked);
    if (els.console) els.console.classList.toggle("hidden", needsInit || !unlocked);

    if (els.unlock) els.unlock.classList.toggle("hidden", needsInit);
    if (els.pin) els.pin.disabled = needsInit;
  }

  function readProductForm() {
    return {
      title: String(els.pTitle && els.pTitle.value).trim(),
      region: String(els.pRegion && els.pRegion.value).trim(),
      coords: String(els.pCoords && els.pCoords.value).trim(),
      description: String(els.pDesc && els.pDesc.value).trim(),
      notes: String(els.pNotes && els.pNotes.value).trim(),
      priceAmount: Number(els.pAmount && els.pAmount.value),
      priceUnit: String(els.pUnit && els.pUnit.value || "K").toUpperCase(),
    };
  }

  function clearProductForm() {
    if (els.pTitle) els.pTitle.value = "";
    if (els.pRegion) els.pRegion.value = "";
    if (els.pCoords) els.pCoords.value = "";
    if (els.pDesc) els.pDesc.value = "";
    if (els.pNotes) els.pNotes.value = "";
    if (els.pAmount) els.pAmount.value = "";
    if (els.pUnit) els.pUnit.value = "M";
  }

  function renderTable() {
    if (!els.tableBody) return;
    const rows = C.loadProducts();
    els.tableBody.innerHTML = "";
    if (!rows.length) {
      const tr = document.createElement("tr");
      const td = document.createElement("td");
      td.colSpan = 4;
      td.className = "muted";
      td.textContent = "まだ拠点がありません。";
      tr.appendChild(td);
      els.tableBody.appendChild(tr);
      return;
    }
    for (const p of rows) {
      const tr = document.createElement("tr");
      const td1 = document.createElement("td");
      td1.innerHTML = "";
      const strong = document.createElement("strong");
      strong.textContent = p.title || "無題";
      td1.appendChild(strong);
      if (p.region || p.coords) {
        const br = document.createElement("div");
        br.className = "muted";
        br.style.marginTop = "0.25rem";
        br.textContent = [p.region, p.coords].filter(Boolean).join(" · ");
        td1.appendChild(br);
      }

      const td2 = document.createElement("td");
      td2.textContent = C.formatListedPrice(p.priceAmount, p.priceUnit);

      const td3 = document.createElement("td");
      const pill = document.createElement("span");
      pill.className = "pill " + (p.published ? "pill--on" : "pill--off");
      pill.textContent = p.published ? "公開" : "非公開";
      td3.appendChild(pill);

      const td4 = document.createElement("td");
      const rowBtns = document.createElement("div");
      rowBtns.className = "btn-row";

      const bToggle = document.createElement("button");
      bToggle.type = "button";
      bToggle.className = "btn btn--ghost";
      bToggle.textContent = p.published ? "掲載を止める" : "掲載を開始する";
      bToggle.addEventListener("click", () => {
        const list = C.loadProducts().map((x) =>
          x.id === p.id ? { ...x, published: !x.published } : x
        );
        C.saveProducts(list);
        renderTable();
        toast(p.published ? "非公開にしました。" : "公開しました。", false);
      });

      const bDel = document.createElement("button");
      bDel.type = "button";
      bDel.className = "btn btn--danger";
      bDel.textContent = "削除";
      bDel.addEventListener("click", () => {
        if (!confirm("この拠点データを削除します。よろしいですか？")) return;
        C.saveProducts(C.loadProducts().filter((x) => x.id !== p.id));
        renderTable();
        toast("削除しました。", false);
      });

      rowBtns.appendChild(bToggle);
      rowBtns.appendChild(bDel);
      td4.appendChild(rowBtns);

      tr.appendChild(td1);
      tr.appendChild(td2);
      tr.appendChild(td3);
      tr.appendChild(td4);
      els.tableBody.appendChild(tr);
    }
  }

  function saveSettingsFromForm() {
    settings.webhookUrl = String(els.webhook && els.webhook.value).trim();
    settings.discordClientId = String(els.client && els.client.value).trim();
    settings.serverTagline = String(els.tagline && els.tagline.value).trim();
    C.saveSettings(settings);
  }

  function wire() {
    if (els.unlock) {
      els.unlock.addEventListener("click", () => {
        const pin = String(els.pin && els.pin.value);
        if (pin !== String(settings.adminPin || "")) {
          toast("PIN が一致しません。", true);
          return;
        }
        setUnlocked(true);
        syncSettingsForm();
        refreshGateUI();
        toast("ロックを解除しました。", false);
      });
    }

    if (els.initSave) {
      els.initSave.addEventListener("click", () => {
        const pin = String(els.initPin && els.initPin.value);
        if (pin.length < 4) {
          toast("PIN は 4 文字以上を推奨します。", true);
          return;
        }
        settings.adminPin = pin;
        settings.webhookUrl = String(els.initWebhook && els.initWebhook.value).trim();
        settings.discordClientId = String(els.initClient && els.initClient.value).trim();
        C.saveSettings(settings);
        setUnlocked(true);
        syncSettingsForm();
        refreshGateUI();
        toast("初期設定を保存しました。", false);
      });
    }

    if (els.logout) {
      els.logout.addEventListener("click", () => {
        setUnlocked(false);
        if (els.pin) els.pin.value = "";
        refreshGateUI();
        toast("ロックしました。", false);
      });
    }

    if (els.toggleReq) {
      els.toggleReq.addEventListener("click", () => {
        settings.requireDiscord = !settings.requireDiscord;
        if (!settings.requireDiscord) settings.requireDiscordStrict = false;
        C.saveSettings(settings);
        renderPills();
        toast("Discord 必須設定を更新しました（保存ボタン前の即時反映）。", false);
      });
    }
    if (els.toggleStrict) {
      els.toggleStrict.addEventListener("click", () => {
        settings.requireDiscordStrict = !settings.requireDiscordStrict;
        if (settings.requireDiscordStrict) settings.requireDiscord = true;
        C.saveSettings(settings);
        renderPills();
        toast("OAuth 方針を更新しました（即時反映）。", false);
      });
    }

    if (els.saveSettings) {
      els.saveSettings.addEventListener("click", () => {
        saveSettingsFromForm();
        toast("方針を保存しました。", false);
      });
    }

    if (els.testWebhook) {
      els.testWebhook.addEventListener("click", async () => {
        saveSettingsFromForm();
        const url = settings.webhookUrl;
        if (!url) {
          toast("Webhook URL が空です。", true);
          return;
        }
        const text = `[Webhookテスト]\n[admin]\n${new Intl.DateTimeFormat("ja-JP", {
          dateStyle: "medium",
          timeStyle: "medium",
        }).format(new Date())}`;
        try {
          await C.postDiscordWebhookForm(url, text);
          toast("テスト送信を実行しました（別タブ/フレームで結果が表示される場合があります）。", false);
        } catch (e) {
          toast(e && e.message ? e.message : "送信に失敗しました。", true);
        }
      });
    }

    if (els.changePin) {
      els.changePin.addEventListener("click", () => {
        const oldP = String(els.oldPin && els.oldPin.value);
        const newP = String(els.newPin && els.newPin.value);
        if (oldP !== String(settings.adminPin || "")) {
          toast("現在の PIN が一致しません。", true);
          return;
        }
        if (newP.length < 4) {
          toast("新しい PIN は 4 文字以上を推奨します。", true);
          return;
        }
        settings.adminPin = newP;
        C.saveSettings(settings);
        if (els.oldPin) els.oldPin.value = "";
        if (els.newPin) els.newPin.value = "";
        toast("PIN を更新しました。", false);
      });
    }

    if (els.addProduct) {
      els.addProduct.addEventListener("click", () => {
        const v = readProductForm();
        if (!v.title) {
          toast("拠点名は必須です。", true);
          return;
        }
        if (!Number.isFinite(v.priceAmount) || v.priceAmount < 0) {
          toast("価格（数値）が不正です。", true);
          return;
        }
        const list = C.loadProducts();
        list.push({
          id: C.uid(),
          title: v.title,
          region: v.region,
          coords: v.coords,
          description: v.description,
          notes: v.notes,
          priceAmount: v.priceAmount,
          priceUnit: v.priceUnit,
          published: true,
        });
        C.saveProducts(list);
        clearProductForm();
        renderTable();
        toast("拠点を追加しました。", false);
      });
    }

    if (els.clearProductForm) {
      els.clearProductForm.addEventListener("click", () => {
        clearProductForm();
        toast("入力欄を空にしました。", false);
      });
    }

    if (els.exportBtn) {
      els.exportBtn.addEventListener("click", () => {
        const payload = {
          version: 1,
          exportedAt: new Date().toISOString(),
          settings: C.loadSettings(),
          products: C.loadProducts(),
        };
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "dominio-bases-backup.json";
        a.click();
        URL.revokeObjectURL(a.href);
        toast("JSON をダウンロードしました。", false);
      });
    }

    if (els.importInput) {
      els.importInput.addEventListener("change", async (ev) => {
        const file = ev.target.files && ev.target.files[0];
        ev.target.value = "";
        if (!file) return;
        try {
          const text = await file.text();
          const data = JSON.parse(text);
          if (!data || typeof data !== "object") throw new Error("bad json");
          if (data.settings && typeof data.settings === "object") {
            settings = { ...C.defaultSettings(), ...data.settings };
            C.saveSettings(settings);
          }
          if (Array.isArray(data.products)) {
            C.saveProducts(data.products);
          }
          syncSettingsForm();
          renderTable();
          refreshGateUI();
          toast("インポートが完了しました。", false);
        } catch {
          toast("JSON の読み込みに失敗しました。", true);
        }
      });
    }
  }

  function boot() {
    settings = C.loadSettings();
    wire();
    syncSettingsForm();
    renderTable();
    refreshGateUI();
  }

  boot();
})();
