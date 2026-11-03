// Instagram: side panel that shows who doesn't follow you back.
// Usage: while logged in at instagram.com, paste into F12 > Console and press Enter.
// Read-only: only requests the lists, never unfollows anyone.
(() => {
  const HOST_ID = "nfb-host";
  document.getElementById(HOST_ID)?.remove();

  const PAGE_SIZE = 100;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const jitter = () => 1500 + Math.random() * 2000;
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const nf = new Intl.NumberFormat("en-US");

  // ---------- DOM helper (avoids innerHTML so Trusted Types doesn't block it) ----------
  const h = (tag, props = {}, ...kids) => {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(props)) {
      if (v == null || v === false) continue;
      if (k === "class") el.className = v;
      else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? "" : v);
    }
    for (const c of kids.flat()) if (c != null && c !== false) el.append(c);
    return el;
  };

  // ---------- Styles ----------
  const css = `
  :host { all: initial; }
  * { box-sizing: border-box; }
  .panel {
    --bg:#EEF1F4; --surface:#FFFFFF; --ink:#18212B; --muted:#5F6B78; --line:#D5DCE3;
    --accent:#2D3FD8; --accent-ink:#FFFFFF; --soft:#E1E6F8; --danger:#B3261E;
    position: fixed; top: 0; right: 0; height: 100vh; width: min(420px, 100vw);
    z-index: 2147483647; display: flex; flex-direction: column;
    background: var(--bg); color: var(--ink);
    font: 14px/1.45 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    box-shadow: 0 0 0 1px var(--line), -24px 0 48px rgba(10,20,40,.14);
  }
  @media (prefers-color-scheme: dark) {
    .panel { --bg:#12161B; --surface:#1B2128; --ink:#E7EBEF; --muted:#9AA6B2; --line:#2B343D;
      --accent:#8C9AFF; --accent-ink:#0E1330; --soft:#242B4D; --danger:#FF8A80; }
  }
  .head { display:flex; align-items:center; justify-content:space-between; padding:16px 20px; border-bottom:1px solid var(--line); }
  .head h1 { margin:0; font-size:15px; font-weight:650; letter-spacing:.01em; }
  .body { flex:1; min-height:0; display:flex; flex-direction:column; }
  .pad { padding:24px 20px; }
  p { margin:0 0 12px; }
  .muted { color: var(--muted); }
  button { font: inherit; color: inherit; cursor: pointer; }
  :focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
  .icon-btn { border:0; background:none; width:32px; height:32px; border-radius:8px; font-size:20px; line-height:1; color:var(--muted); }
  .icon-btn:hover { background: var(--soft); color: var(--ink); }
  .primary { border:0; border-radius:8px; background:var(--accent); color:var(--accent-ink); padding:11px 16px; font-weight:650; }
  .primary:hover { filter: brightness(1.08); }
  .ghost { border:1px solid var(--line); border-radius:8px; background:var(--surface); padding:7px 12px; }
  .ghost:hover { border-color: var(--accent); }
  .lead { font-family: "Iowan Old Style","Palatino Linotype",Palatino,Georgia,serif; font-size:22px; line-height:1.25; margin:0 0 14px; }

  .tally { display:grid; grid-template-columns:1fr 1fr; gap:0; border-block:1px solid var(--line); margin:20px 0; }
  .tally div { padding:14px 0; }
  .tally div + div { padding-left:16px; border-left:1px solid var(--line); }
  .tally b { display:block; font: 600 34px/1.1 "Iowan Old Style","Palatino Linotype",Palatino,Georgia,serif; font-variant-numeric: tabular-nums; }
  .tally span { color:var(--muted); font-size:13px; }
  .bar { height:4px; background:var(--line); border-radius:2px; overflow:hidden; }
  .bar i { display:block; height:100%; width:0; background:var(--accent); transition: width .3s ease; }
  .bar.indet i { width:35%; animation: slide 1.4s ease-in-out infinite alternate; }
  @keyframes slide { from { margin-left:0 } to { margin-left:65% } }
  @media (prefers-reduced-motion: reduce) { .bar.indet i { animation:none; margin-left:30%; } .bar i { transition:none; } }

  .result-top { padding:20px 20px 8px; }
  .big { font: 600 64px/1 "Iowan Old Style","Palatino Linotype",Palatino,Georgia,serif; font-variant-numeric: tabular-nums; margin:0; }
  .big-cap { margin:6px 0 0; color:var(--muted); }
  .tabs { display:flex; gap:20px; padding:0 20px; border-bottom:1px solid var(--line); margin-top:12px; }
  .tab { border:0; background:none; padding:10px 0; color:var(--muted); border-bottom:2px solid transparent; margin-bottom:-1px; }
  .tab[aria-selected="true"] { color:var(--ink); border-bottom-color:var(--accent); font-weight:650; }
  .tab small { font-size:12px; margin-left:4px; font-variant-numeric: tabular-nums; }
  .tools { display:flex; flex-wrap:wrap; gap:8px; align-items:center; padding:12px 20px; }
  .tools input[type=search] { flex:1 1 150px; min-width:0; border:1px solid var(--line); background:var(--surface); color:var(--ink); border-radius:8px; padding:8px 10px; font:inherit; }
  .check { display:flex; align-items:center; gap:6px; color:var(--muted); font-size:13px; width:100%; }
  .actions { display:flex; gap:8px; padding:0 20px 12px; }
  .list { flex:1; overflow:auto; border-top:1px solid var(--line); background:var(--surface); }
  .row { display:grid; grid-template-columns:36px 1fr auto; gap:12px; align-items:center; padding:10px 20px; color:inherit; text-decoration:none; border-bottom:1px solid var(--line); }
  .row:hover { background: var(--soft); }
  .av { width:36px; height:36px; border-radius:50%; background:var(--line); object-fit:cover; }
  .nm { font-weight:600; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .fn { color:var(--muted); font-size:13px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .tag { font-size:12px; color:var(--accent); }
  .more { display:block; width:calc(100% - 40px); margin:14px 20px; }
  .empty { padding:28px 20px; color:var(--muted); }
  .err { color: var(--danger); font-weight:600; }
  `;

  // ---------- State ----------
  const userId = (document.cookie.match(/ds_user_id=(\d+)/) || [])[1];
  let cancelled = false;
  const S = {
    view: "idle", // idle | running | done | error
    counts: { following: 0, followers: 0 },
    totals: { following: 0, followers: 0 },
    err: "",
    data: null, // { notBack, fans, followingSize, followersSize }
    tab: "notBack",
    q: "",
    hideVerified: false,
    shown: PAGE_SIZE,
  };

  // ---------- Shell ----------
  const host = h("div", { id: HOST_ID });
  const root = host.attachShadow({ mode: "open" });
  const panel = h("section", { class: "panel", role: "dialog", "aria-label": "Accounts that don't follow you back" });
  root.append(h("style", {}, css), panel);
  document.documentElement.append(host);

  const close = () => { cancelled = true; document.removeEventListener("keydown", onKey, true); host.remove(); };
  const onKey = (e) => { if (e.key === "Escape") close(); };
  document.addEventListener("keydown", onKey, true);

  let refs = {};

  function shell(body) {
    panel.replaceChildren(
      h("header", { class: "head" },
        h("h1", {}, "Not following back"),
        h("button", { class: "icon-btn", "aria-label": "Kapat", onclick: close }, "×")),
      h("div", { class: "body" }, body)
    );
  }

  // ---------- Views ----------
  function renderIdle() {
    shell(h("div", { class: "pad" },
      h("p", { class: "lead" }, "Compare who you follow with who follows you."),
      h("p", { class: "muted" }, "This panel only reads your lists. It never unfollows anyone and sends no data anywhere."),
      h("p", { class: "muted" }, "Large accounts can take a few minutes. Keep this tab open until it finishes."),
      userId ? h("button", { class: "primary", onclick: run }, "Start comparison")
             : h("p", { class: "err" }, "No session found. Log in at instagram.com and run the script again.")
    ));
  }

  function renderRunning() {
    refs.f1 = h("b", {}, "0");
    refs.f2 = h("b", {}, "0");
    refs.bar = h("div", { class: "bar indet" }, h("i"));
    refs.phase = h("p", { class: "muted" }, "Reading who you follow...");
    shell(h("div", { class: "pad" },
      h("p", { class: "lead" }, "Reading your lists"),
      h("div", { class: "tally" },
        h("div", {}, refs.f1, h("span", {}, "following")),
        h("div", {}, refs.f2, h("span", {}, "followers"))),
      refs.bar, h("div", { style: "height:12px" }), refs.phase,
      h("button", { class: "ghost", onclick: () => { cancelled = true; } }, "Cancel")
    ));
    updateRunning();
  }

  function updateRunning() {
    if (!refs.f1) return;
    refs.f1.textContent = nf.format(S.counts.following);
    refs.f2.textContent = nf.format(S.counts.followers);
    const total = S.totals.following + S.totals.followers;
    if (total > 0) {
      refs.bar.classList.remove("indet");
      const pct = Math.min(100, ((S.counts.following + S.counts.followers) / total) * 100);
      refs.bar.firstChild.style.width = pct + "%";
    }
    refs.phase.textContent = S.counts.followers === 0 && !S.phaseFollowers
      ? "Reading who you follow..." : "Reading your followers...";
  }

  function renderError() {
    shell(h("div", { class: "pad" },
      h("p", { class: "lead" }, "The comparison didn't finish"),
      h("p", { class: "err" }, S.err),
      h("p", { class: "muted" }, "No result is shown from incomplete data, because it would flag the wrong people."),
      h("button", { class: "primary", onclick: run }, "Try again")
    ));
  }

  const filtered = () => {
    const q = S.q.trim().toLowerCase();
    return S.data[S.tab].filter((u) =>
      (!S.hideVerified || !u.verified) &&
      (!q || u.username.toLowerCase().includes(q) || (u.name || "").toLowerCase().includes(q)));
  };

  function renderDone() {
    const d = S.data;
    refs.big = h("p", { class: "big", "aria-live": "polite" }, "0");
    refs.list = h("div", { class: "list" });
    const tabBtn = (key, label, n) =>
      h("button", { class: "tab", role: "tab", "aria-selected": String(S.tab === key), onclick: () => { S.tab = key; S.shown = PAGE_SIZE; renderDone(true); } },
        label, h("small", {}, nf.format(n)));
    const search = h("input", { type: "search", placeholder: "Search users", "aria-label": "Search users", value: S.q,
      oninput: (e) => { S.q = e.target.value; S.shown = PAGE_SIZE; renderList(); } });
    const hv = h("input", { type: "checkbox", id: "hv", onchange: (e) => { S.hideVerified = e.target.checked; S.shown = PAGE_SIZE; renderList(); } });
    hv.checked = S.hideVerified;
    refs.copyBtn = h("button", { class: "ghost", onclick: copyList }, "Copy list");

    shell([
      h("div", { class: "result-top" },
        refs.big,
        h("p", { class: "big-cap" }, `people don't follow you back. That's ${nf.format(d.notBack.length)} of the ${nf.format(d.followingSize)} accounts you follow.`)),
      h("div", { class: "tabs", role: "tablist" },
        tabBtn("notBack", "Not following you back", d.notBack.length),
        tabBtn("fans", "You don't follow back", d.fans.length)),
      h("div", { class: "tools" }, search, h("label", { class: "check", for: "hv" }, hv, "Hide verified accounts")),
      h("div", { class: "actions" }, refs.copyBtn, h("button", { class: "ghost", onclick: downloadCsv }, "Download CSV")),
      refs.list,
    ]);
    renderList();
    animateBig(d.notBack.length);
  }

  function renderList() {
    const rows = filtered();
    const frag = [];
    if (!rows.length) {
      frag.push(h("div", { class: "empty" }, S.q || S.hideVerified ? "No accounts match this filter." : "This list is empty."));
    }
    for (const u of rows.slice(0, S.shown)) {
      const img = h("img", { class: "av", alt: "", loading: "lazy", referrerpolicy: "no-referrer" });
      if (u.pic) img.src = u.pic;
      frag.push(h("a", { class: "row", href: `https://www.instagram.com/${u.username}/`, target: "_blank", rel: "noopener noreferrer" },
        img,
        h("div", { style: "min-width:0" }, h("div", { class: "nm" }, u.username), u.name ? h("div", { class: "fn" }, u.name) : null),
        u.verified ? h("span", { class: "tag" }, "Verified") : null));
    }
    if (rows.length > S.shown) {
      frag.push(h("button", { class: "ghost more", onclick: () => { S.shown += PAGE_SIZE; renderList(); } },
        `Show ${nf.format(rows.length - S.shown)} more`));
    }
    refs.list.replaceChildren(...frag);
  }

  function animateBig(target) {
    if (reduceMotion || target < 2) { refs.big.textContent = nf.format(target); return; }
    const dur = 800;
    const el = refs.big;
    let t0;
    const tick = (t) => {
      if (t0 === undefined) t0 = t;
      const p = Math.max(0, Math.min(1, (t - t0) / dur));
      el.textContent = nf.format(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    // rAF doesn't run in background tabs, so always land on the real number.
    setTimeout(() => { el.textContent = nf.format(target); }, dur + 150);
  }

  // ---------- Export ----------
  function copyList() {
    const text = filtered().map((u) => u.username).join("\n");
    const done = () => { refs.copyBtn.textContent = "Copied"; setTimeout(() => (refs.copyBtn.textContent = "Copy list"), 1500); };
    (navigator.clipboard?.writeText(text) || Promise.reject()).then(done, () => {
      const ta = h("textarea", { style: "position:fixed;opacity:0" }); ta.value = text;
      root.append(ta); ta.select(); try { document.execCommand("copy"); done(); } catch (_) {} ta.remove();
    });
  }

  function downloadCsv() {
    const esc = (s) => `"${String(s ?? "").replace(/"/g, '""')}"`;
    const lines = ["username,name,verified,profile", ...filtered().map((u) =>
      [esc(u.username), esc(u.name), u.verified ? "yes" : "no", esc(`https://www.instagram.com/${u.username}/`)].join(","))];
    const blob = new Blob(["﻿" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const a = h("a", { href: URL.createObjectURL(blob), download: S.tab === "notBack" ? "not-following-back.csv" : "you-dont-follow-back.csv" });
    root.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  // ---------- Fetching ----------
  const API = { credentials: "include", headers: { "x-ig-app-id": "936619743392459" } };

  async function fetchTotals() {
    try {
      const r = await fetch(`https://www.instagram.com/api/v1/users/${userId}/info/`, API);
      if (!r.ok) return;
      const u = (await r.json()).user || {};
      S.totals.following = u.following_count || 0;
      S.totals.followers = u.follower_count || 0;
    } catch (_) {}
  }

  async function fetchAll(kind) {
    const users = new Map();
    let maxId = "";
    while (true) {
      if (cancelled) throw Object.assign(new Error("cancelled"), { cancelled: true });
      const url = `https://www.instagram.com/api/v1/friendships/${userId}/${kind}/?count=100` +
        (maxId ? `&max_id=${encodeURIComponent(maxId)}` : "");
      const res = await fetch(url, API);
      if (!res.ok) {
        throw new Error(res.status === 429
          ? "Instagram rate-limited the requests (HTTP 429). Wait a few hours and try again."
          : `Couldn't read ${kind === "following" ? "your following list" : "your followers"} (HTTP ${res.status}). Make sure you're logged in.`);
      }
      const data = await res.json();
      for (const u of data.users || []) {
        users.set(u.username.toLowerCase(), { username: u.username, name: u.full_name || "", verified: !!u.is_verified, pic: u.profile_pic_url || "" });
      }
      S.counts[kind] = users.size;
      updateRunning();
      if (!data.next_max_id) break;
      maxId = data.next_max_id;
      await sleep(jitter());
    }
    return users;
  }

  async function run() {
    cancelled = false;
    S.view = "running"; S.counts = { following: 0, followers: 0 }; S.totals = { following: 0, followers: 0 }; S.phaseFollowers = false;
    renderRunning();
    try {
      await fetchTotals();
      updateRunning();
      const following = await fetchAll("following");
      S.phaseFollowers = true; updateRunning();
      await sleep(jitter());
      const followers = await fetchAll("followers");
      const byName = (a, b) => a.username.localeCompare(b.username);
      S.data = {
        followingSize: following.size,
        followersSize: followers.size,
        notBack: [...following].filter(([k]) => !followers.has(k)).map(([, v]) => v).sort(byName),
        fans: [...followers].filter(([k]) => !following.has(k)).map(([, v]) => v).sort(byName),
      };
      window.__notFollowingBack = S.data.notBack;
      S.view = "done"; S.tab = "notBack"; S.q = ""; S.hideVerified = false; S.shown = PAGE_SIZE;
      renderDone();
    } catch (e) {
      if (e.cancelled) { S.view = "idle"; renderIdle(); return; }
      S.view = "error"; S.err = e.message; renderError();
    }
  }

  renderIdle();
})();
