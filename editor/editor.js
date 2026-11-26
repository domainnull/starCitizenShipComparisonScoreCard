/*
 * Ship data and layout editor. Served by scripts/editor.py, which validates, scores and saves.
 * The page never scores anything itself: every number comes back from scripts/score.py through
 * the editor script, so it can't disagree with the leaderboard.
 *
 * Screens (location hash):
 *   #/                         ship list with filters and Add ship
 *   #/ship/<id>                one ship: score stats and layouts, or all stats and breakdown
 *   #/ship/<id>/edit           edit a ship's data       #/new        add a ship
 *   #/ship/<id>/layout/<name>  one layout's modified stats and role scores
 *   #/ship/<id>/layout/<name>/edit, #/ship/<id>/newLayout   edit or add a layout
 */
(function () {
  "use strict";

  var app = document.getElementById("app");
  var S = null;               // state from /api/state
  var R = null;               // rubric info
  var byId = {};
  var checkTimer = null;
  var checkSeq = 0;

  // ------------------------------------------------------------------ helpers

  function h(tag, attrs, kids) {
    var el = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        var v = attrs[k];
        if (v === null || v === undefined || v === false) return;
        if (k === "class") el.className = v;
        else if (k === "text") el.textContent = v;
        else if (k === "value") el.value = v;
        else if (k === "checked") el.checked = !!v;
        else if (k.slice(0, 2) === "on") el.addEventListener(k.slice(2), v);
        else el.setAttribute(k, v === true ? "" : v);
      });
    }
    (kids || []).forEach(function (c) {
      if (c === null || c === undefined || c === false) return;
      el.appendChild(typeof c === "string" || typeof c === "number" ? document.createTextNode(String(c)) : c);
    });
    return el;
  }

  function clone(x) { return x === undefined ? undefined : JSON.parse(JSON.stringify(x)); }
  function isRange(v) {
    return v !== null && typeof v === "object" && !Array.isArray(v) &&
      Object.keys(v).length === 2 && "low" in v && "high" in v;
  }
  function num(x) { return Math.round(x * 100) / 100; }
  function fmtR(r) {
    if (r === null || r === undefined) return "n/a";
    if (isRange(r)) {
      var a = fmtV(r.low), b = fmtV(r.high);
      return a === b ? a : a + " to " + b;
    }
    return fmtV(r);
  }
  function fmtV(v) {
    if (v === null || v === undefined) return "n/a";
    if (isRange(v)) return fmtR(v);
    if (typeof v === "number") return String(num(v));
    if (typeof v === "boolean") return v ? "yes" : "no";
    if (Array.isArray(v)) return v.length ? v.map(fmtV).join(", ") : "none";
    if (typeof v === "string") return words(v);
    return JSON.stringify(v);
  }
  function words(s) {
    // camelCase level names read as words: roomForLater -> room for later
    if (!/^[a-z][A-Za-z0-9]*$/.test(s)) return s;
    return s.replace(/([a-z0-9])([A-Z])/g, "$1 $2").toLowerCase();
  }
  function catName(c) { return (R.categories[c] && R.categories[c].displayName) || words(c); }
  function locName(s) {
    return { hangar: "hangar", pad: "landing pad", cargoHold: "cargo hold", vehicleBay: "vehicle bay" }[s] || s;
  }
  function locTitle(s) { var n = locName(s); return n.charAt(0).toUpperCase() + n.slice(1); }
  function shipName(id) { return id === "noRoom" ? "No room" : id === "theoretical" ? "Theoretical" : byId[id] ? (byId[id].data.name || id) : id; }
  function isShip(src) { return !!src && src !== "native" && src !== "noRoom" && src !== "theoretical"; }
  function isRequired(k) { return R.tiers.needed.categories.indexOf(k) >= 0; }
  function go(hash) { location.hash = hash; }
  function readPref(k, d) { try { var v = sessionStorage.getItem("editor." + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } }
  function writePref(k, v) { try { sessionStorage.setItem("editor." + k, JSON.stringify(v)); } catch (e) { /* private mode */ } }

  function api(method, path, body) {
    var opts = { method: method, headers: {} };
    if (body !== undefined) {
      opts.headers["Content-Type"] = "application/json";
      opts.body = JSON.stringify(body);
    }
    return fetch(path, opts).then(function (r) {
      return r.json().then(function (j) {
        if (!r.ok) throw new Error(j.error || ("HTTP " + r.status));
        return j;
      });
    });
  }

  function loadState() {
    return api("GET", "/api/state").then(function (s) {
      S = s; R = s.rubric; byId = {};
      s.ships.forEach(function (x) { byId[x.id] = x; });
    });
  }

  function carriable(ship) {
    var c = ship.data && ship.data.carrierSize;
    return c === "small" || c === "medium" || c === "vehicle";
  }

  function messages(errors, warnings) {
    var out = h("div");
    if (errors && errors.length) {
      out.appendChild(h("div", { class: "notice err", role: "alert" }, [
        h("strong", { text: errors.length === 1 ? "1 problem" : errors.length + " problems" }),
        h("ul", null, errors.map(function (e) { return h("li", { text: e }); }))]));
    }
    if (warnings && warnings.length) {
      out.appendChild(h("div", { class: "notice warn" }, [
        h("strong", { text: "Warnings" }),
        h("ul", null, warnings.map(function (e) { return h("li", { text: e }); }))]));
    }
    return out;
  }

  function stat(label, value, sub) {
    return h("div", { class: "stat" }, [h("div", { class: "label", text: label }),
      h("div", { class: "value", text: value }), sub ? h("div", { class: "sub" }, [sub]) : null]);
  }

  // Low and high case of a stat drawn from ship_stats (which gives each case separately).
  function both(stats, f) {
    var a = f(stats.low), b = f(stats.high);
    return JSON.stringify(a) === JSON.stringify(b) ? a : { low: a, high: b };
  }

  function seatText(seat) {
    if (!seat) return "no guns that count";
    return seat.name + ": " + (seat.guns.length ? seat.guns.join(", ") : "no guns") +
      (seat.energyCapable === false ? " (not energy-capable)" : "");
  }

  // ------------------------------------------------------------------ router

  function route() {
    clearTimeout(checkTimer);
    var parts = location.hash.replace(/^#\/?/, "").split("/").filter(Boolean).map(decodeURIComponent);
    app.innerHTML = "";
    window.scrollTo(0, 0);
    if (!parts.length) return home();
    if (parts[0] === "new") return shipForm(null);
    if (parts[0] === "ship" && byId[parts[1]]) {
      var id = parts[1];
      if (parts.length === 2) return shipPage(id);
      if (parts[2] === "edit") return shipForm(id);
      if (parts[2] === "newLayout" && byId[id].isCarrier) return layoutForm(id, null);
      if (parts[2] === "layout" && findLayout(id, parts[3])) {
        if (parts[4] === "edit") return layoutForm(id, parts[3]);
        return layoutView(id, parts[3]);
      }
    }
    app.appendChild(h("p", null, ["Nothing here. ", h("a", { href: "#/", text: "Back to the ship list" })]));
  }

  function findLayout(id, name) {
    return (byId[id].layouts || []).filter(function (l) { return l.name === name; })[0] || null;
  }

  function crumbs(items) {
    var kids = [];
    items.forEach(function (it, i) {
      if (i) kids.push(" / ");
      kids.push(it[1] ? h("a", { href: it[1], text: it[0] }) : it[0]);
    });
    return h("div", { class: "crumbs" }, kids);
  }

  // ------------------------------------------------------------------ home

  function home() {
    var f = readPref("filters", { text: "", off: {} });
    app.appendChild(h("h1", { text: "Ship editor" }));
    app.appendChild(h("p", { class: "meta", text: "Rubric " + R.rubricVersion + ", score script " + R.scriptVersion +
      ", editor " + R.editorVersion + ". Saves go straight into ships/ in your repo." }));
    app.appendChild(leaderboardBanner());
    if (S.otherErrors.length) app.appendChild(messages(S.otherErrors, []));

    var groups = [
      { key: "maker", label: "Manufacturer", values: uniq(S.ships.map(function (s) { return s.data.manufacturer; })),
        name: function (v) { return R.manufacturers[v] || v; }, of: function (s) { return s.data.manufacturer; } },
      { key: "size", label: "Size", values: ["S", "L", "C"],
        name: function (v) { return { S: "S (CIG 1-2)", L: "L (CIG 3-5)", C: "C (CIG 6)" }[v]; },
        of: function (s) { return s.data.size; } },
      { key: "type", label: "Type", values: typeValues(),
        name: function (v) { return { carrier: "Carriers (take layouts)", carried: "Carried ships", other: "Neither" }[v]; },
        of: shipTypes },
    ];
    var search = h("input", { type: "search", placeholder: "Filter by name", value: f.text, "aria-label": "Filter by name",
      oninput: function () { f.text = search.value; writePref("filters", f); draw(); } });
    var fs = groups.map(function (g) {
      return h("fieldset", null, [h("legend", { text: g.label })].concat(g.values.map(function (v) {
        var id = g.key + ":" + v;
        var cb = h("input", { type: "checkbox", checked: !f.off[id], onchange: function () {
          if (cb.checked) delete f.off[id]; else f.off[id] = true;
          writePref("filters", f); draw();
        } });
        return h("label", { class: "check" }, [cb, g.name(v)]);
      })));
    });
    app.appendChild(h("div", { class: "toolbar" }, [search, h("span", { class: "spacer" }),
      h("button", { class: "btn primary", type: "button", onclick: function () { go("#/new"); }, text: "Add ship" })]));
    app.appendChild(h("div", { class: "card filters" }, fs));
    var count = h("p", { class: "meta" });
    var list = h("ul", { class: "shipList" });
    app.appendChild(count);
    app.appendChild(list);

    function draw() {
      list.innerHTML = "";
      var text = f.text.trim().toLowerCase();
      var shown = S.ships.filter(function (s) {
        if (text && (s.data.name || s.id).toLowerCase().indexOf(text) < 0 && s.id.toLowerCase().indexOf(text) < 0) return false;
        return groups.every(function (g) {
          var vals = [].concat(g.of(s));
          return vals.some(function (v) { return !f.off[g.key + ":" + v]; });
        });
      });
      shown.sort(function (a, b) { return (a.data.name || a.id).localeCompare(b.data.name || b.id); });
      count.textContent = shown.length + " of " + S.ships.length + " ships";
      shown.forEach(function (s) { list.appendChild(h("li", null, [shipRow(s)])); });
    }
    draw();
  }

  function uniq(a) { return a.filter(function (v, i) { return v && a.indexOf(v) === i; }).sort(); }
  function shipTypes(s) {
    var t = [];
    if (s.isCarrier) t.push("carrier");
    if (carriable(s)) t.push("carried");
    if (!t.length) t.push("other");
    return t;
  }
  function typeValues() {
    var v = ["carrier", "carried"];
    if (S.ships.some(function (s) { return shipTypes(s)[0] === "other"; })) v.push("other");
    return v;
  }

  function bestLayout(s) {
    var best = null;
    (s.layouts || []).forEach(function (l) {
      if (!l.score) return;
      var m = (l.score.total.low + l.score.total.high) / 2;
      if (!best || m > best.m) best = { m: m, l: l };
    });
    return best && best.l;
  }

  function shipRow(s) {
    var badges = [h("span", { class: "badge", text: s.data.manufacturer + " · " + s.data.size })];
    if (s.isCarrier) badges.push(h("span", { class: "badge", text: (s.layouts.length || "no") + " layout" + (s.layouts.length === 1 ? "" : "s") }));
    if (carriable(s)) badges.push(h("span", { class: "badge", text: "carried, " + s.data.carrierSize }));
    if (s.data.status === "concept") badges.push(h("span", { class: "badge warn", text: "concept" }));
    if (!s.valid || s.errors.length) badges.push(h("span", { class: "badge err", text: "has errors" }));
    var scoreText = "";
    var best = bestLayout(s);
    if (best) scoreText = fmtR(best.score.total) + " (" + best.name + ")";
    else if (s.breakdown) scoreText = fmtR(s.breakdown.alone.total) + " on its own";
    return h("a", { class: "shipRow", href: "#/ship/" + encodeURIComponent(s.id) }, [
      h("span", { class: "name", text: s.data.name || s.id }), h("code", { text: s.id })]
      .concat(badges).concat([h("span", { class: "score", text: scoreText })]));
  }

  function leaderboardBanner() {
    var box = h("div", { class: "notice ok", text: "Checking the leaderboard…" });
    function refresh() {
      api("GET", "/api/leaderboard").then(function (r) {
        box.innerHTML = "";
        if (r.upToDate) {
          box.className = "notice ok";
          box.appendChild(document.createTextNode("results/leaderboard.js is up to date."));
          return;
        }
        box.className = "notice warn";
        box.appendChild(h("span", { text: r.stale.length
          ? "results/leaderboard.js is out of date for " + r.stale.length + " layout" + (r.stale.length === 1 ? "" : "s") + ". "
          : "The scorer reports problems. " }));
        var btn = h("button", { class: "btn small", type: "button", text: "Update leaderboard", onclick: function () {
          btn.disabled = true; btn.textContent = "Updating…";
          api("POST", "/api/leaderboard/update", {}).then(function (u) {
            refresh();
            box.appendChild(h("pre", { class: "output", text: u.output }));
          }).catch(function (e) { btn.disabled = false; btn.textContent = "Update leaderboard"; alert(e.message); });
        } });
        box.appendChild(btn);
        if (!r.stale.length) box.appendChild(h("pre", { class: "output", text: r.output }));
      }).catch(function (e) { box.className = "notice err"; box.textContent = "Couldn't check the leaderboard: " + e.message; });
    }
    refresh();
    return box;
  }

  // ------------------------------------------------------------------ ship page

  function shipPage(id) {
    var s = byId[id];
    app.appendChild(crumbs([["Ships", "#/"], [s.data.name || id]]));
    app.appendChild(h("div", { class: "toolbar" }, [
      h("div", null, [h("h1", { text: s.data.name || id }),
        h("div", { class: "meta" }, [h("code", { text: id }), " · " + (R.manufacturers[s.data.manufacturer] || s.data.manufacturer) +
          " · size " + s.data.size + (s.data.cigSize ? " (CIG " + s.data.cigSize + ")" : "") + " · " + words(s.data.status || "") +
          (s.data.patch ? " · patch " + s.data.patch : "")])]),
      h("span", { class: "spacer" }),
      h("button", { class: "btn", type: "button", text: "Edit ship", onclick: function () { go("#/ship/" + encodeURIComponent(id) + "/edit"); } })]));
    app.appendChild(messages(s.errors, s.warnings));
    if (!s.valid) {
      app.appendChild(h("p", { text: "This ship's data has errors, so it can't be scored until they're fixed. Use Edit ship." }));
      return;
    }
    if (!s.isCarrier) {
      app.appendChild(h("p", { class: "meta", text: "This ship has nowhere to carry ships, so it can't take layouts." }));
      app.appendChild(h("h2", { text: "Score breakdown" }));
      app.appendChild(breakdownTable(s));
      app.appendChild(h("h2", { text: "All stats" }));
      app.appendChild(allStats(s));
      return;
    }
    app.appendChild(h("h2", { text: "Stats that move the score" }));
    app.appendChild(scoreStats(s));
    app.appendChild(h("div", { class: "toolbar" }, [h("h2", { text: "Layouts", style: "margin:0" }), h("span", { class: "spacer" }),
      h("button", { class: "btn primary", type: "button", text: "Add layout", onclick: function () { go("#/ship/" + encodeURIComponent(id) + "/newLayout"); } })]));
    if (!s.layouts.length) app.appendChild(h("p", { class: "meta", text: "No layouts yet. Add one to rank this ship on the leaderboard." }));
    var best = bestLayout(s);
    app.appendChild(h("ul", { class: "layoutList" }, s.layouts.map(function (l) {
      var badges = [];
      if (l.data && l.data.estimated) badges.push(h("span", { class: "badge warn", text: "estimated" }));
      if (best === l) badges.push(h("span", { class: "badge", text: "best" }));
      if (l.errors.length) badges.push(h("span", { class: "badge err", text: "has errors" }));
      return h("li", null, [h("a", { class: "shipRow", href: "#/ship/" + encodeURIComponent(id) + "/layout/" + encodeURIComponent(l.name) },
        [h("span", { class: "name", text: l.name })].concat(badges).concat([
          h("span", { class: "score", text: l.score ? fmtR(l.score.total) : "not scored" }),
          h("span", { class: "meta", style: "flex-basis:100%", text: (l.data && l.data.description) || "" })]))]);
    })));
    app.appendChild(h("h2", { text: "Score with nothing carried" }));
    app.appendChild(h("p", { class: "meta", text: "Built-in roles only, nothing aboard." }));
    app.appendChild(breakdownTable(s, true));
  }

  function scoreStats(s) {
    var st = s.stats;
    var cargo = both(st, function (x) { return x.cargoScu; });
    var man = both(st, function (x) { return x.maneuverability; });
    var beds = both(st, function (x) { return x.beds; });
    var rec = both(st, function (x) { return x.recSpace; });
    var seatLo = st.low.bestSeat, seatHi = st.high.bestSeat;
    var seatScore = both(st, function (x) { return x.bestSeat ? x.bestSeat.score : 0; });
    var seatSub = seatText(seatLo) + (JSON.stringify(seatLo) !== JSON.stringify(seatHi) ? "; high case " + seatText(seatHi) : "");
    var locs = (st.low.locations || []).map(locTitle).join(", ");
    var radar = both(st, function (x) { return x.radarSize; });
    var lvLo = st.low.explorationLevel, lvHi = st.high.explorationLevel;
    var lvText = lvLo === lvHi ? words(lvLo || "none") : words(lvLo || "none") + " to " + words(lvHi || "none");
    return h("div", { class: "stats" }, [
      stat("Cargo space", fmtR(cargo) + " SCU", "Manoeuvrability " + fmtR(man) + " of " + R.maneuverabilityMax),
      stat("Living quarters", fmtR(beds) + " bed" + (beds === 1 ? "" : "s"), "Rec space: " + fmtR(rec)),
      stat("Strongest solo gun seat", fmtR(seatScore) + " pts", seatSub),
      stat("Carries ships in", locs || "nowhere", "No ship count: a layout says which ships fit together."),
      stat("Radar", st.low.radarSize == null && st.high.radarSize == null ? "not set" : "Size " + fmtR(radar), "Marketed exploration: " + lvText),
    ]);
  }

  function breakdownTable(s, aloneOnly) {
    var b = s.breakdown;
    var showCarried = !aloneOnly && carriable(s);
    var head = [h("th", { text: "Line" }), h("th", { class: "num", text: "On its own" })];
    if (showCarried) head.push(h("th", { class: "num", text: "Adds when carried" }));
    head.push(h("th", { class: "num", text: "Max" }));
    var rows = R.lineOrder.map(function (cat) {
      var line = b.alone.lines[cat];
      var cells = [h("td", { text: catName(cat) }), h("td", { class: "num", text: fmtR({ low: line.low, high: line.high }) })];
      if (showCarried) cells.push(h("td", { class: "num", text: b.carried[cat] ? fmtR(b.carried[cat]) : "" }));
      var max = R.categories[cat] ? R.categories[cat].max : null;
      cells.push(h("td", { class: "num meta", text: max === null || max === undefined ? "" : String(max) }));
      return h("tr", null, cells);
    });
    var totalCells = [h("td", { text: "Total (needed x1, desired x0.5)" }), h("td", { class: "num", text: fmtR(b.alone.total) })];
    if (showCarried) totalCells.push(h("td"));
    totalCells.push(h("td"));
    rows.push(h("tr", { class: "total" }, totalCells));
    var wrap = h("div", { class: "tableWrap" }, [h("table", null, [h("thead", null, [h("tr", null, head)]), h("tbody", null, rows)])]);
    var out = h("div", null, [wrap]);
    if (showCarried) {
      out.appendChild(h("p", { class: "meta", text: "On its own: this ship scored as a base with nothing carried. Adds when carried: " +
        "its value in each role it can fill on a carrier with nothing built in (carried roles count at full value; " +
        "a fighter scores 2 x its best seat - 0.5, and nothing on the large bases)." }));
    }
    return out;
  }

  function allStats(s) {
    var d = s.data, rows = [];
    function row(k, v) { rows.push(h("tr", null, [h("th", { text: k }), h("td", null, [v])])); }
    row("Manufacturer", (R.manufacturers[d.manufacturer] || d.manufacturer) + " (" + d.manufacturer + ")");
    row("Size", d.size + (d.cigSize ? ", CIG size " + d.cigSize : "") + (d.sizeOverride ? ". Override: " + d.sizeOverride : ""));
    row("Status", words(d.status || ""));
    if (d.patch) row("Patch", d.patch);
    if (d.dimensions) row("Dimensions (m)", ["length", "width", "height"].filter(function (k) { return k in d.dimensions; })
      .map(function (k) { return k + " " + fmtR(d.dimensions[k]); }).join(", "));
    row("Carried size", d.carrierSize ? (d.carrierSize === "none" ? "can't be carried" : d.carrierSize) : "not recorded");
    var roles = d.roles || {};
    R.roleKeys.concat(["hauler", "fighter"]).forEach(function (k) {
      if (!(k in roles)) return;
      var v = roles[k], text;
      if (k === "defense") {
        var seats = (v && v.seats) || [];
        text = h("div", null, seats.length ? seats.map(function (seat) {
          return h("div", { text: seat.name + ": " + fmtR(seat.guns) + (seat.energyCapable === false ? " (not energy-capable)" : "") });
        }) : ["no seats"]);
      } else if (v && typeof v === "object" && !isRange(v)) {
        text = Object.keys(v).map(function (kk) { return words(kk) + " " + fmtR(v[kk]); }).join(", ");
      } else text = fmtR(v);
      row(k === "hauler" ? "Hauler" : k === "fighter" ? "Fighter" : catName(k), text);
    });
    if (d.locations) row("Carries ships in", (Array.isArray(d.locations) ? d.locations : [d.locations]).map(locTitle).join(", "));
    if (d.cargoBay && typeof d.cargoBay === "object") row("Cargo bay", d.cargoBay.floorLength + " x " + d.cargoBay.floorWidth + " m, " + d.cargoBay.gridScu + " SCU grid");
    if (d.notes && d.notes.length) row("Notes", h("ul", null, d.notes.map(function (n) { return h("li", { text: n }); })));
    if (d.sources && d.sources.length) row("Sources", h("ul", null, d.sources.map(function (u) {
      return h("li", null, [/^https?:\/\//.test(u) ? h("a", { href: u, target: "_blank", rel: "noopener noreferrer", text: u }) : u]);
    })));
    row("Changes", d.changes && d.changes.length ? h("ul", null, d.changes.map(function (c) {
      return h("li", { text: c.patch + ": " + c.change });
    })) : "none recorded");
    row("Data file", h("code", { text: s.file }));
    return h("div", { class: "tableWrap" }, [h("table", null, [h("tbody", null, rows)])]);
  }

  // ------------------------------------------------------------------ "more..." pop-up

  var dlg = document.getElementById("more");
  document.getElementById("moreClose").addEventListener("click", function () { dlg.close(); });
  dlg.addEventListener("click", function (e) { if (e.target === dlg) dlg.close(); });

  function moreLink(id) {
    return h("button", { class: "link", type: "button", text: "more…", "aria-haspopup": "dialog",
      onclick: function () { openMore(id); } });
  }

  function openMore(id) {
    var s = byId[id];
    var body = document.getElementById("moreBody");
    document.getElementById("moreTitle").textContent = s ? (s.data.name || id) : id;
    body.innerHTML = "";
    if (!s) { body.appendChild(h("p", { text: "No data file for " + id + "." })); dlg.showModal(); return; }
    body.appendChild(messages(s.errors, []));
    if (s.valid) {
      body.appendChild(h("h3", { text: "Score breakdown" }));
      body.appendChild(breakdownTable(s));
    }
    body.appendChild(h("h3", { text: "All stats" }));
    body.appendChild(allStats(s));
    body.appendChild(h("p", null, [h("a", { href: "#/ship/" + encodeURIComponent(id), text: "Open this ship", onclick: function () { dlg.close(); } })]));
    dlg.showModal();
  }

  // ------------------------------------------------------------------ layout view

  function layoutView(id, name) {
    var s = byId[id], l = findLayout(id, name);
    app.appendChild(crumbs([["Ships", "#/"], [s.data.name || id, "#/ship/" + encodeURIComponent(id)], [name]]));
    app.appendChild(h("div", { class: "toolbar" }, [
      h("div", null, [h("h1", { text: (s.data.name || id) + ": " + name }),
        h("div", { class: "meta", text: [l.data && l.data.estimated ? "Estimated layout" : "Tested layout",
          l.data && l.data.patch ? "patch " + l.data.patch : null, l.file].filter(Boolean).join(" · ") })]),
      h("span", { class: "spacer" }),
      h("button", { class: "btn", type: "button", text: "Edit layout", onclick: function () {
        go("#/ship/" + encodeURIComponent(id) + "/layout/" + encodeURIComponent(name) + "/edit"); } })]));
    if (l.data && l.data.description) app.appendChild(h("p", { text: l.data.description }));
    app.appendChild(messages(l.errors, l.warnings));
    if (!l.score) {
      app.appendChild(h("p", { text: "This layout isn't scored until its errors are fixed." }));
      return;
    }
    app.appendChild(h("h2", { text: "Stats with this layout" }));
    app.appendChild(layoutStats(s, l.data, l.score));
    app.appendChild(h("h2", { text: "Role scores" }));
    app.appendChild(roleTable(s, l.data, l.score, s.breakdown.alone));
  }

  function layoutStats(s, layout, score) {
    var st = s.stats;
    var base = both(st, function (x) { return x.cargoScu; });
    var left = score.cargoLeftScu;
    var used = [];
    R.roleKeys.forEach(function (k) {
      var e = layout.roles && layout.roles[k];
      if (e && isShip(e.source) && e.cargoScu) used.push(shipName(e.source) + " " + e.cargoScu);
    });
    (layout.extraShips || []).forEach(function (e) {
      if (e && e.ship && typeof e.cargoScu === "number" && e.cargoScu > 0) used.push(shipName(e.ship) + " " + e.cargoScu + " (extra)");
    });
    var cargoSub = used.length ? "Was " + fmtR(base) + " SCU; carried ships take " + used.join(", ") + " SCU" : "No carried ship takes cargo space";

    var medBeds = both(st, function (x) { return x.medicalBeds || 0; });
    var medE = layout.roles && layout.roles.medical;
    var medSub = "Built in " + fmtR(medBeds);
    var medTotal = medBeds;
    if (medE && isShip(medE.source) && byId[medE.source] && byId[medE.source].stats) {
      var cs = byId[medE.source].stats;
      var cb = both(cs, function (x) { return x.medicalBeds || 0; });
      medTotal = { low: lo(medBeds) + lo(cb), high: hi(medBeds) + hi(cb) };
      if (medTotal.low === medTotal.high) medTotal = medTotal.low;
      medSub += ", " + shipName(medE.source) + " " + fmtR(cb);
    }

    var seat = both(st, function (x) { return x.bestSeat ? x.bestSeat.score : 0; });
    var defE = layout.roles && layout.roles.defense;
    var gunSub = "Built in: " + seatText(st.low.bestSeat);
    var defLine = score.lines.defense;
    if (defE && isShip(defE.source) && byId[defE.source] && byId[defE.source].stats) {
      gunSub += ". Carried: " + shipName(defE.source) + ", " + seatText(byId[defE.source].stats.low.bestSeat);
      if (defLine.sources.low === "native" && defLine.sources.high === "native") gunSub += " (adds nothing on this base)";
    }

    var aboard = R.locations.filter(function (k) { return score.aboard[k].high > 0; })
      .map(function (k) { return locTitle(k) + ": " + fmtR(score.aboard[k]); }).join("; ");
    var extras = (layout.extraShips || []).length ? "Extra ships: " + layout.extraShips.map(function (e) { return shipName(e.ship); }).join(", ") : null;

    return h("div", { class: "stats" }, [
      stat("Cargo space left", fmtR(left) + " SCU", cargoSub),
      stat("Living quarters", fmtR(both(st, function (x) { return x.beds; })) + " beds",
        "Rec space: " + fmtR(both(st, function (x) { return x.recSpace; })) + ". Carried ships don't add beds, but one can fill the role instead."),
      stat("Medical beds", fmtR(medTotal), medSub),
      stat("Defense line", fmtR({ low: defLine.low, high: defLine.high }) + " pts", "Best built-in seat " + fmtR(seat) + " pts. " + gunSub),
      stat("Ships aboard", aboard || "none", extras),
    ]);
  }

  function lo(r) { return isRange(r) ? r.low : r; }
  function hi(r) { return isRange(r) ? r.high : r; }

  function roleTable(s, layout, score, alone) {
    var rows = R.lineOrder.map(function (cat) {
      var line = score.lines[cat];
      var e = layout.roles ? layout.roles[cat] : null;
      var who;
      if (cat === "extraShips") {
        var xs = (layout.extraShips || []).length;
        who = h("span", { class: "meta", text: "not a role: " + xs + " extra ship" + (xs === 1 ? "" : "s") + ", each 1-5, capped at " + R.categories.extraShips.max });
      } else if (cat === "cargoCapacity") {
        who = h("span", { class: "meta", text: "not a role: cargo left after carried ships, " + fmtR(score.cargoLeftScu) + " SCU" });
      } else if (e && e.source === "noRoom") {
        who = h("span", { class: "meta", text: "No room (scores " + num(R.noRoomScore) + ")" });
      } else if (e && e.source === "theoretical") {
        who = h("div", null, [h("span", { text: "Theoretical " + num(e.score) + " / " + R.categories[cat].max }),
          h("div", { class: "meta", text: "counts in the high case only" }), e.note ? h("div", { class: "meta", text: e.note }) : null].filter(Boolean));
      } else if (e && isShip(e.source)) {
        var bits = [h("span", { text: shipName(e.source) + " " }), moreLink(e.source)];
        var meta = [locName(e.location), e.cargoScu ? e.cargoScu + " SCU of cargo" : null, e.fitsInLowCase === false ? "may not fit (low case)" : null];
        if (line.sources.low === "native" && line.sources.high === "native") meta.push("adds nothing over built in, but still takes its space");
        else if (line.sources.low !== line.sources.high) meta.push("counts only in the " + (line.sources.low === "native" ? "high" : "low") + " case");
        bits.push(h("div", { class: "meta", text: meta.filter(Boolean).join(" · ") }));
        if (e.fit) bits.push(h("div", { class: "meta", text: "Fit: " + e.fit }));
        who = h("div", null, bits);
      } else {
        who = h("span", { class: "meta", text: "built in" });
      }
      var a = alone.lines[cat];
      var diff = (line.low + line.high) / 2 - (a.low + a.high) / 2;
      return h("tr", null, [h("td", { text: catName(cat) }), h("td", null, [who]),
        h("td", { class: "num", text: fmtR({ low: line.low, high: line.high }) }),
        h("td", { class: "num meta", text: fmtR({ low: a.low, high: a.high }) }),
        h("td", { class: "num " + (diff > 0 ? "up" : diff < 0 ? "down" : "meta"), text: diff ? (diff > 0 ? "+" : "") + num(diff) : "" })]);
    });
    var diffT = (score.total.low + score.total.high) / 2 - (alone.total.low + alone.total.high) / 2;
    rows.push(h("tr", { class: "total" }, [h("td", { text: "Total" }), h("td"),
      h("td", { class: "num", text: fmtR(score.total) }), h("td", { class: "num", text: fmtR(alone.total) }),
      h("td", { class: "num " + (diffT > 0 ? "up" : diffT < 0 ? "down" : ""), text: diffT ? (diffT > 0 ? "+" : "") + num(diffT) : "" })]));
    var extra = (layout.extraShips || []).length ? h("div", null, [h("h3", { text: "Extra ships" }),
      h("p", { class: "meta", text: "Aboard but filling no role. Each scores what you set (1-5), capped at 5 together, and cargo space they take comes off the hold. They aren't checked." }),
      h("ul", null, layout.extraShips.map(function (e) {
        return h("li", null, [h("span", { text: shipName(e.ship) + (e.location ? " (" + locName(e.location) + ") " : " ") }), moreLink(e.ship),
          e.note ? h("div", { class: "meta", text: e.note }) : null].filter(Boolean));
      }))]) : null;
    return h("div", null, [h("div", { class: "tableWrap" }, [h("table", null, [
      h("thead", null, [h("tr", null, [h("th", { text: "Line" }), h("th", { text: "Filled by" }), h("th", { class: "num", text: "Score" }),
        h("th", { class: "num", text: "Nothing carried" }), h("th", { class: "num", text: "Change" })])]),
      h("tbody", null, rows)])]), extra]);
  }

  // ------------------------------------------------------------------ form widgets

  // A value that may be a {low, high} range. makeInput(value, set) draws one input.
  function leaf(get, set, makeInput, opts) {
    opts = opts || {};
    var wrap = h("span", { class: "leaf" });
    function draw() {
      wrap.innerHTML = "";
      var v = get();
      if (isRange(v)) {
        wrap.appendChild(h("span", { class: "rangeLbl", text: "low" }));
        wrap.appendChild(makeInput(v.low, function (x) { var c = get(); c.low = x; set(c); }));
        wrap.appendChild(h("span", { class: "rangeLbl", text: "high" }));
        wrap.appendChild(makeInput(v.high, function (x) { var c = get(); c.high = x; set(c); }));
        wrap.appendChild(h("button", { class: "btn small", type: "button", text: "One value", title: "Use the low value for both cases",
          onclick: function () { set(clone(get().low)); draw(); } }));
      } else {
        wrap.appendChild(makeInput(v, function (x) { set(x); }));
        if (!opts.noRange) wrap.appendChild(h("button", { class: "btn small", type: "button", text: "Range",
          title: "Give a low and a high case, for values that rest on marketing or an estimate",
          onclick: function () { var c = get(); set({ low: clone(c), high: clone(c) }); draw(); } }));
      }
    }
    draw();
    return wrap;
  }

  function selectInput(options, labels) {
    return function (v, set) {
      var sel = h("select", { onchange: function () { set(sel.value); } }, options.map(function (o, i) {
        return h("option", { value: o, text: labels ? labels[i] : words(o) });
      }));
      if (options.indexOf(v) < 0 && v !== undefined && v !== null) sel.insertBefore(h("option", { value: v, text: String(v) + " (not in rubric)" }), sel.firstChild);
      sel.value = v === undefined || v === null ? options[0] : v;
      return sel;
    };
  }

  function numberInput(intOnly, optional) {
    return function (v, set) {
      var inp = h("input", { type: "number", step: intOnly ? "1" : "any", min: "0", value: v === undefined || v === null ? "" : String(v),
        oninput: function () {
          if (inp.value === "") { set(optional ? undefined : 0); return; }
          var n = Number(inp.value);
          set(isNaN(n) ? inp.value : n);
        } });
      return inp;
    };
  }

  function boolInput(label) {
    return function (v, set) {
      var cb = h("input", { type: "checkbox", checked: !!v, onchange: function () { set(cb.checked); } });
      return h("label", { class: "check" }, [cb, label || "yes"]);
    };
  }

  function textInput(placeholder, size) {
    return function (v, set) {
      var inp = h("input", { type: "text", value: v === undefined || v === null ? "" : String(v), placeholder: placeholder || "",
        size: size || 24, oninput: function () { set(inp.value); } });
      return inp;
    };
  }

  function gunsInput(v, set) {
    var inp = h("input", { type: "text", size: 14, placeholder: "S5, S5", value: Array.isArray(v) ? v.join(", ") : "",
      oninput: function () {
        set(inp.value.split(/[\s,]+/).map(function (g) { return g.trim().toUpperCase(); }).filter(Boolean));
      } });
    return inp;
  }

  function row(label, ctrl, hint) {
    return h("div", { class: "row" }, [h("div", { class: "lbl" }, [label, hint ? h("span", { class: "meta", text: hint }) : null]),
      h("div", { class: "ctrl" }, [].concat(ctrl))]);
  }

  // get/set by path on a draft object; undefined deletes the key.
  function getPath(obj, path) {
    for (var i = 0; i < path.length; i++) { if (obj === undefined || obj === null) return undefined; obj = obj[path[i]]; }
    return obj;
  }
  function setPath(obj, path, v) {
    for (var i = 0; i < path.length - 1; i++) {
      if (obj[path[i]] === undefined || obj[path[i]] === null || typeof obj[path[i]] !== "object") obj[path[i]] = {};
      obj = obj[path[i]];
    }
    if (v === undefined) delete obj[path[path.length - 1]];
    else obj[path[path.length - 1]] = v;
  }

  // ------------------------------------------------------------------ live check panel

  function makeChecker(kind, payload, onResult) {
    // kind: "ship" or "layout"; payload() returns the request body.
    var panel = h("div");
    var last = null;
    function run() {
      clearTimeout(checkTimer);
      checkTimer = setTimeout(function () {
        var seq = ++checkSeq;
        api("POST", "/api/" + kind + "/check", payload()).then(function (r) {
          if (seq !== checkSeq) return;
          last = r;
          panel.innerHTML = "";
          panel.appendChild(messages(r.errors, r.warnings));
          if (r.ok && !r.warnings.length) panel.appendChild(h("div", { class: "notice ok", text: "Passes validation." }));
          onResult(r);
        }).catch(function (e) {
          if (seq !== checkSeq) return;
          last = null;
          panel.innerHTML = "";
          panel.appendChild(h("div", { class: "notice err", text: "Couldn't check: " + e.message }));
          onResult(null);
        });
      }, 300);
    }
    return { panel: panel, run: run, last: function () { return last; } };
  }

  // ------------------------------------------------------------------ ship form

  var ROLE_DEFAULTS = {
    mining: "none", refining: "none", manufacturing: "none",
    medical: { level: "none", beds: 0 }, salvageRepair: { level: "none", repair: "none" },
    defense: { seats: [] }, livingQuarters: { beds: 0, recSpace: false }, cargo: { scu: 0, maneuverability: 0 },
    commuter: false, exploration: { radarSize: 1, level: "none" }, hauler: true, fighter: true,
  };

  function idSuffix(name, maker) {
    var w = String(name || "").split(/[^A-Za-z0-9]+/).filter(Boolean);
    var brand = (R.manufacturers[maker] || "").toLowerCase().split(/[^a-z0-9]+/);
    while (w.length > 1 && (brand.indexOf(w[0].toLowerCase()) >= 0 || w[0].toUpperCase() === maker)) w.shift();
    return w.map(function (x) { return x.charAt(0).toUpperCase() + x.slice(1).toLowerCase(); }).join("");
  }

  // Whether the structured form can show this ship without losing anything.
  function formCanShow(d) {
    var roles = d.roles || {};
    var objRoles = ["medical", "salvageRepair", "defense", "livingQuarters", "cargo"];
    for (var i = 0; i < objRoles.length; i++) {
      var v = roles[objRoles[i]];
      if (v !== undefined && (isRange(v) || typeof v !== "object" || Array.isArray(v))) return false;
    }
    if (roles.defense && (isRange(roles.defense.seats) || !Array.isArray(roles.defense.seats))) return false;
    if (d.locations !== undefined && (!Array.isArray(d.locations) || d.locations.some(function (x) { return R.locations.indexOf(x) < 0; }))) return false;
    if (d.cargoBay !== undefined && (!d.cargoBay || typeof d.cargoBay !== "object" || isRange(d.cargoBay) ||
      ["floorLength", "floorWidth", "gridScu"].some(function (k) { return isRange(d.cargoBay[k]); }))) return false;
    if (d.dimensions && (typeof d.dimensions !== "object" || isRange(d.dimensions))) return false;
    if (d.notes && !Array.isArray(d.notes)) return false;
    if (d.sources && !Array.isArray(d.sources)) return false;
    return true;
  }

  function shipForm(id) {
    var isNew = !id;
    var s = id ? byId[id] : null;
    var draft = isNew ? { id: "", name: "", manufacturer: "ANVL", size: "S", cigSize: 1, status: "flightReady",
      carrierSize: "small", roles: {}, sources: [], changes: [] } : clone(s.data);
    var change = { patch: "", text: "" };
    var mode = formCanShow(draft) ? "form" : "yaml";
    var yamlText = "";

    app.appendChild(crumbs(isNew ? [["Ships", "#/"], ["Add ship"]] :
      [["Ships", "#/"], [s.data.name || id, "#/ship/" + encodeURIComponent(id)], ["Edit"]]));
    app.appendChild(h("h1", { text: isNew ? "Add ship" : "Edit " + (s.data.name || id) }));
    app.appendChild(h("p", { class: "meta", text: isNew
      ? "Saved to ships/<id>/ship_data.yaml. A ship that only rides on others needs just the roles it fills; a carrier needs every role from mining to exploration before it can take a layout."
      : "Saved to " + s.file + ". Comments inside the file other than the header line are not kept." }));

    var modeBar = h("div", { class: "toolbar" });
    var body = h("div");
    var checker = makeChecker("ship", payload, onCheck);
    var previewBox = h("div");
    var saveBtn = h("button", { class: "btn primary", type: "button", text: "Save ship", disabled: true, onclick: save });
    var saveMsg = h("span", { class: "meta" });
    app.appendChild(modeBar);
    app.appendChild(h("div", { class: "formGrid" }, [body, h("div", { class: "preview" }, [
      h("h3", { text: "Check" }), checker.panel, previewBox,
      h("div", { class: "saveBar" }, [saveBtn, h("a", { href: isNew ? "#/" : "#/ship/" + encodeURIComponent(id), text: "Cancel" }), saveMsg])])]));

    function payload() {
      var b = { isNew: isNew, originalId: id };
      if (mode === "yaml") b.yaml = yamlText; else b.ship = finalShip();
      return b;
    }
    function finalShip() {
      var d = clone(draft);
      if (isNew) d.id = (d.manufacturer || "").toLowerCase() + (d.size || "") + idSuffix(d.name, d.manufacturer);
      if (change.text.trim()) d.changes = (d.changes || []).concat([{ patch: change.patch.trim() || d.patch || "", change: change.text.trim() }]);
      return d;
    }
    function onCheck(r) {
      saveBtn.disabled = !(r && r.ok);
      previewBox.innerHTML = "";
      if (r && r.ship && isNew) previewBox.appendChild(h("p", { class: "meta" }, ["Id: ", h("code", { text: r.ship.id || "" })]));
      if (r && r.breakdown) {
        previewBox.appendChild(h("p", null, [h("strong", { text: "On its own: " + fmtR(r.breakdown.alone.total) })]));
      }
    }
    function save() {
      saveBtn.disabled = true; saveMsg.textContent = "Saving…";
      api("POST", "/api/ship/save", payload()).then(function (r) {
        if (!r.ok) { saveMsg.textContent = ""; checker.panel.innerHTML = ""; checker.panel.appendChild(messages(r.errors, r.warnings)); return; }
        return loadState().then(function () { go("#/ship/" + encodeURIComponent(r.ship.id)); });
      }).catch(function (e) { saveMsg.textContent = "Couldn't save: " + e.message; saveBtn.disabled = false; });
    }
    function changed() { saveBtn.disabled = true; checker.run(); }

    function drawMode() {
      modeBar.innerHTML = "";
      modeBar.appendChild(h("button", { class: "btn small", type: "button", text: mode === "form" ? "Edit as YAML" : "Back to the form",
        onclick: function () {
          if (mode === "form") {
            api("POST", "/api/yaml", { kind: "ship", data: finalShip() }).then(function (r) {
              yamlText = r.yaml; mode = "yaml"; change = { patch: "", text: "" }; drawMode(); drawBody(); changed();
            }).catch(function (e) { alert(e.message); });
          } else {
            var r = checker.last();
            if (!r || !r.ship) { alert("Fix the YAML so it reads as a ship first."); return; }
            if (!formCanShow(r.ship)) { alert("This data has ranges the form can't show (a whole block as a range). Keep editing it as YAML."); return; }
            draft = clone(r.ship); mode = "form"; drawMode(); drawBody(); changed();
          }
        } }));
      if (mode === "yaml") modeBar.appendChild(h("span", { class: "meta", text: "Any value can be {low: X, high: Y}." }));
    }

    function drawBody() {
      body.innerHTML = "";
      if (mode === "yaml") {
        var ta = h("textarea", { class: "yaml", spellcheck: "false", "aria-label": "Ship data as YAML", oninput: function () { yamlText = ta.value; changed(); } });
        ta.value = yamlText;
        body.appendChild(ta);
        return;
      }
      body.appendChild(basics());
      body.appendChild(h("h2", { text: "Roles" }));
      body.appendChild(h("p", { class: "meta", text: "Tick a role the ship has data for. Range splits a value into a low and a high case." }));
      R.roleKeys.concat(["hauler", "fighter"]).forEach(function (k) { body.appendChild(roleBlock(k)); });
      body.appendChild(h("h2", { text: "Hangar" }));
      body.appendChild(hangarBlock());
      body.appendChild(h("h2", { text: "Notes, sources and changes" }));
      body.appendChild(textBlocks());
    }

    function bind(path, make, opts) {
      return leaf(function () { return getPath(draft, path); }, function (v) { setPath(draft, path, v); changed(); }, make, opts);
    }

    function basics() {
      var f = h("div", { class: "form" });
      f.appendChild(row("Name", bind(["name"], textInput("Anvil Liberator", 28), { noRange: true }), "Shown in the editor and the viewer"));
      f.appendChild(row("Manufacturer", bind(["manufacturer"], selectInput(Object.keys(R.manufacturers),
        Object.keys(R.manufacturers).map(function (k) { return k + " (" + R.manufacturers[k] + ")"; })), { noRange: true })));
      f.appendChild(row("Size", bind(["size"], selectInput(["S", "L", "C"], ["S (CIG 1-2)", "L (CIG 3-5)", "C (CIG 6)"]), { noRange: true })));
      f.appendChild(row("CIG size", bind(["cigSize"], numberInput(true, true), { noRange: true }), "Leave empty for concepts not in game data"));
      f.appendChild(row("Size override", bind(["sizeOverride"], function (v, set) {
        return textInput("Why the size differs from CIG size", 40)(v, function (x) { set(x ? x : undefined); });
      }, { noRange: true }), "Only when the size letter differs from CIG size"));
      f.appendChild(row("Status", bind(["status"], selectInput(["flightReady", "concept"]), { noRange: true })));
      f.appendChild(row("Patch", bind(["patch"], function (v, set) { return textInput("4.10.3", 10)(v, function (x) { set(x ? x : undefined); }); }, { noRange: true })));
      f.appendChild(row("Carried size", bind(["carrierSize"], selectInput(["none", "small", "medium", "vehicle"],
        ["can't be carried", "small ship", "medium ship (larger than a Golem OX)", "ground vehicle"]), { noRange: true }), "How big it is when another ship carries it"));
      var dims = ["length", "width", "height"].map(function (k) {
        return h("span", { class: "leaf" }, [h("span", { class: "rangeLbl", text: k }),
          numberInput(false, true)(getPath(draft, ["dimensions", k]), function (x) {
            setPath(draft, ["dimensions", k], x);
            if (draft.dimensions && !Object.keys(draft.dimensions).length) delete draft.dimensions;
            changed();
          })]);
      });
      f.appendChild(row("Dimensions (m)", dims));
      if (isNew) {
        var idOut = h("code");
        var refresh = function () { idOut.textContent = finalShip().id || "(type a name)"; };
        f.addEventListener("input", refresh); f.addEventListener("change", refresh); refresh();
        f.appendChild(row("Ship id", [idOut], "Built from manufacturer, size and name; names the folder"));
      } else {
        f.appendChild(row("Ship id", [h("code", { text: id })], "Can't change here: it names the folder and every layout that uses it"));
      }
      return f;
    }

    function roleBlock(k) {
      var roles = draft.roles || (draft.roles = {});
      var has = k in roles;
      var inner = h("div", { class: "roleBody" });
      var cb = h("input", { type: "checkbox", checked: has, onchange: function () {
        if (cb.checked) roles[k] = clone(ROLE_DEFAULTS[k]); else delete roles[k];
        drawInner(); changed();
      } });
      var title = k === "hauler" ? "Hauler" : k === "fighter" ? "Fighter" : catName(k);
      var hint = { hauler: "can fill a layout's cargo role", fighter: "a light fighter" }[k];
      var block = h("div", { class: "roleBlock" }, [h("div", { class: "roleHead" }, [
        h("label", { class: "check" }, [cb, h("strong", { text: title })]), hint ? h("span", { class: "meta", text: hint }) : null]), inner]);
      function drawInner() {
        inner.innerHTML = "";
        if (!(k in roles)) return;
        var p = ["roles", k];
        if (k === "mining" || k === "refining" || k === "manufacturing") {
          inner.appendChild(row("Level", bind(p, selectInput(R.categories[k].levels))));
        } else if (k === "exploration") {
          inner.appendChild(row("Radar size", bind(p.concat("radarSize"), function (v, set) {
            return selectInput(R.radarSizes.map(String), R.radarSizes.map(function (x) { return "Size " + x; }))(
              v === undefined || v === null ? v : String(v), function (x) { set(Number(x)); });
          }), "The ship's radar component size"));
          inner.appendChild(row("Marketed for", bind(p.concat("level"), selectInput(R.categories.exploration.levels,
            R.categories.exploration.levels.map(function (x) { return { explorer: "long-range exploration (5)", scout: "scouting or scanning (3)", none: "nothing more" }[x] || words(x); })))));
        } else if (k === "medical") {
          inner.appendChild(row("Level", bind(p.concat("level"), selectInput(R.categories.medical.levels))));
          inner.appendChild(row("Medical beds", bind(p.concat("beds"), numberInput(true))));
        } else if (k === "salvageRepair") {
          inner.appendChild(row("Level", bind(p.concat("level"), selectInput(R.categories.salvageRepair.levels))));
          inner.appendChild(row("Repairs", bind(p.concat("repair"), selectInput(R.repairLevels,
            R.repairLevels.map(function (x) { return { none: "nothing", smallShips: "small ships it carries", base: "itself or larger ships" }[x] || words(x); })))));
        } else if (k === "defense") {
          inner.appendChild(seatsEditor());
        } else if (k === "livingQuarters") {
          inner.appendChild(row("Beds", bind(p.concat("beds"), numberInput(true))));
          inner.appendChild(row("Rec space", bind(p.concat("recSpace"), boolInput("has rec space"))));
        } else if (k === "cargo") {
          inner.appendChild(row("Cargo (SCU)", bind(p.concat("scu"), numberInput(false))));
          inner.appendChild(row("Manoeuvrability", bind(p.concat("maneuverability"), numberInput(false)), "0-" + R.maneuverabilityMax + ", judgement"));
        } else {
          inner.appendChild(row(k === "commuter" ? "Native shuttle" : title,
            bind(p, boolInput(k === "commuter" ? "built in" : "yes"))));
        }
      }
      drawInner();
      return block;
    }

    function seatsEditor() {
      var wrap = h("div");
      function draw() {
        wrap.innerHTML = "";
        var seats = draft.roles.defense.seats;
        seats.forEach(function (seat, i) {
          var nm = textInput("Pilot", 18)(seat.name, function (x) { seat.name = x; changed(); });
          var guns = leaf(function () { return seat.guns; }, function (v) { seat.guns = v; changed(); }, gunsInput);
          var ec = h("input", { type: "checkbox", checked: seat.energyCapable !== false, onchange: function () {
            if (ec.checked) delete seat.energyCapable; else seat.energyCapable = false; changed(); } });
          wrap.appendChild(h("div", { class: "seat" }, [nm, h("span", { class: "rangeLbl", text: "guns" }), guns,
            h("label", { class: "check" }, [ec, "energy-capable"]),
            h("button", { class: "btn small", type: "button", text: "Remove", onclick: function () { seats.splice(i, 1); draw(); changed(); } })]));
        });
        wrap.appendChild(h("button", { class: "btn small", type: "button", text: "Add seat", onclick: function () {
          seats.push({ name: seats.length ? "Turret" : "Pilot", guns: [] }); draw(); changed(); } }));
        wrap.appendChild(h("p", { class: "meta", text: "One line per seat (pilot or a single turret). Guns as sizes, e.g. S5, S5. Missiles never count." }));
      }
      draw();
      return wrap;
    }

    function hangarBlock() {
      var wrap = h("div");
      function draw() {
        wrap.innerHTML = "";
        var has = Array.isArray(draft.locations) && draft.locations.length > 0;
        var cb = h("input", { type: "checkbox", checked: has, onchange: function () {
          if (cb.checked) draft.locations = ["hangar"]; else delete draft.locations;
          draw(); changed();
        } });
        wrap.appendChild(h("label", { class: "check" }, [cb, "Carries ships, so it can take layouts"]));
        var f = h("div", { class: "form" });
        if (has) {
          var ctrl = R.locations.map(function (k) {
            var c = h("input", { type: "checkbox", checked: draft.locations.indexOf(k) >= 0, onchange: function () {
              var next = R.locations.filter(function (x) { return x === k ? c.checked : draft.locations.indexOf(x) >= 0; });
              if (next.length) draft.locations = next; else delete draft.locations;
              draw(); changed();
            } });
            return h("label", { class: "check" }, [c, locTitle(k)]);
          });
          f.appendChild(row("Locations", ctrl, "Where carried ships go. No ship count: each layout says which ships fit together."));
        }
        var bay = draft.cargoBay;
        var bc = h("input", { type: "checkbox", checked: !!bay, onchange: function () {
          if (bc.checked) draft.cargoBay = { floorLength: 0, floorWidth: 0, gridScu: 0 }; else delete draft.cargoBay;
          draw(); changed();
        } });
        var bctrl = [h("label", { class: "check" }, [bc, "ships ride in the cargo bay"])];
        if (bay) ["floorLength", "floorWidth", "gridScu"].forEach(function (k) {
          bctrl.push(h("span", { class: "leaf" }, [h("span", { class: "rangeLbl", text: words(k) }),
            numberInput(false)(bay[k], function (x) { bay[k] = x; changed(); })]));
        });
        f.appendChild(row("Cargo bay", bctrl));
        wrap.appendChild(f);
      }
      draw();
      return wrap;
    }

    function textBlocks() {
      var f = h("div", { class: "form" });
      function lines(key, label, hint) {
        var ta = h("textarea", { "aria-label": label, oninput: function () {
          var v = ta.value.split("\n").map(function (x) { return x.trim(); }).filter(Boolean);
          if (key === "notes" && !v.length) delete draft.notes; else draft[key] = v;
          changed();
        } });
        ta.value = (draft[key] || []).join("\n");
        f.appendChild(row(label, [ta], hint));
      }
      lines("notes", "Notes", "One per line, in your own words");
      lines("sources", "Sources", "One link per line; at least one");
      var past = (draft.changes || []);
      f.appendChild(row("Changes so far", [past.length ? h("ul", null, past.map(function (c) { return h("li", { text: c.patch + ": " + c.change }); }))
        : h("span", { class: "meta", text: "none" })]));
      var cp = textInput("4.10.3", 10)(change.patch, function (x) { change.patch = x; changed(); });
      var ct = textInput("What changed in this patch", 40)(change.text, function (x) { change.text = x; changed(); });
      f.appendChild(row("Record a change", [cp, ct], "Only when something about the ship changed. Empty patch uses the ship's patch."));
      return f;
    }

    drawMode();
    if (mode === "yaml") {
      api("POST", "/api/yaml", { kind: "ship", data: draft }).then(function (r) { yamlText = r.yaml; drawBody(); changed(); });
      body.appendChild(h("p", { class: "meta", text: "This ship has a range the form can't show, so it opens as YAML." }));
    } else {
      drawBody();
      changed();
    }
  }

  // ------------------------------------------------------------------ layout form

  function eligible(role, ship) {
    // Mirrors carried_role_check in scripts/score.py; the server check is the real one.
    var r = (ship.data && ship.data.roles) || {};
    if (role === "cargo") return !!r.hauler;
    if (role === "defense") return "defense" in r;
    if (role === "livingQuarters") return !!r.livingQuarters;
    return role in r && r[role] !== false && r[role] !== "none";
  }

  function layoutForm(carrierId, name) {
    var isNew = !name;
    var s = byId[carrierId];
    var existing = name ? findLayout(carrierId, name) : null;
    var locations = R.locations.filter(function (k) { return Array.isArray(s.data.locations) && s.data.locations.indexOf(k) >= 0; });
    var draft = isNew ? { layout: "", carrier: carrierId, description: "", estimated: false, patch: s.data.patch || "",
      roles: {}, extraShips: [] } : clone(existing.data);
    R.roleKeys.forEach(function (k) { if (!draft.roles[k]) draft.roles[k] = { source: "native" }; });
    if (!draft.extraShips) draft.extraShips = [];
    var largeBase = R.largeBases.indexOf(carrierId) >= 0;
    var alone = (s.breakdown && s.breakdown.alone) || { lines: {} };

    app.appendChild(crumbs([["Ships", "#/"], [s.data.name || carrierId, "#/ship/" + encodeURIComponent(carrierId)],
      isNew ? ["Add layout"] : [name, "#/ship/" + encodeURIComponent(carrierId) + "/layout/" + encodeURIComponent(name)], isNew ? null : ["Edit"]].filter(Boolean)));
    app.appendChild(h("h1", { text: isNew ? "Add a layout to " + (s.data.name || carrierId) : "Edit layout " + name }));
    app.appendChild(h("p", { class: "meta", text: "Pick the ship that fills each role, where it goes and how much cargo space it uses. A location takes any number of ships. " +
      "Every ship in a layout must fit aboard together. Scores update as you go and come from scripts/score.py." }));

    var body = h("div");
    var checker = makeChecker("layout", payload, onCheck);
    var previewBox = h("div");
    var saveBtn = h("button", { class: "btn primary", type: "button", text: "Save layout", disabled: true, onclick: save });
    var saveMsg = h("span", { class: "meta" });
    app.appendChild(h("div", { class: "formGrid" }, [body, h("div", { class: "preview" }, [
      h("h3", { text: "Score" }), previewBox, h("h3", { text: "Check" }), checker.panel,
      h("div", { class: "saveBar" }, [saveBtn, h("a", { href: isNew ? "#/ship/" + encodeURIComponent(carrierId)
        : "#/ship/" + encodeURIComponent(carrierId) + "/layout/" + encodeURIComponent(name), text: "Cancel" }), saveMsg])])]));

    function payload() { return { carrier: carrierId, isNew: isNew, originalName: name, layout: finalLayout() }; }
    function finalLayout() {
      var d = clone(draft);
      if (!d.cargoScuMethod) delete d.cargoScuMethod;
      return d;
    }
    function onCheck(r) {
      saveBtn.disabled = !(r && r.ok);
      previewBox.innerHTML = "";
      if (!r || !r.score) { previewBox.appendChild(h("p", { class: "meta", text: "Not scored until the problems are fixed." })); return; }
      var sc = r.score, alone = r.alone;
      previewBox.appendChild(h("div", { class: "stat" }, [h("div", { class: "label", text: "Total" }),
        h("div", { class: "value", text: fmtR(sc.total) }), h("div", { class: "sub", text: "Nothing carried: " + fmtR(alone.total) })]));
      previewBox.appendChild(h("table", null, [h("tbody", null, R.lineOrder.map(function (cat) {
        var l = sc.lines[cat], a = alone.lines[cat];
        var d = (l.low + l.high) / 2 - (a.low + a.high) / 2;
        return h("tr", null, [h("td", { text: catName(cat) }), h("td", { class: "num", text: fmtR({ low: l.low, high: l.high }) }),
          h("td", { class: "num " + (d > 0 ? "up" : d < 0 ? "down" : "meta"), text: d ? (d > 0 ? "+" : "") + num(d) : "" })]);
      }))]));
      previewBox.appendChild(h("p", { class: "meta", text: "Cargo left: " + fmtR(sc.cargoLeftScu) + " SCU. " +
        R.locations.filter(function (k) { return sc.aboard[k].high > 0; }).map(function (k) {
          return locTitle(k) + " " + fmtR(sc.aboard[k]);
        }).join(", ") }));
    }
    function save() {
      saveBtn.disabled = true; saveMsg.textContent = "Saving…";
      api("POST", "/api/layout/save", payload()).then(function (r) {
        if (!r.ok) { saveMsg.textContent = ""; checker.panel.innerHTML = ""; checker.panel.appendChild(messages(r.errors, r.warnings)); return; }
        return loadState().then(function () {
          go("#/ship/" + encodeURIComponent(carrierId) + "/layout/" + encodeURIComponent(r.layout.layout));
        });
      }).catch(function (e) { saveMsg.textContent = "Couldn't save: " + e.message; saveBtn.disabled = false; });
    }
    function changed() { saveBtn.disabled = true; checker.run(); }

    // About the layout
    var f = h("div", { class: "form" });
    if (isNew) {
      f.appendChild(row("Layout name", textInput("inGameLoadout", 20)(draft.layout, function (x) { draft.layout = x.trim(); changed(); }),
        "camelCase; becomes the file name"));
    } else {
      f.appendChild(row("Layout name", [h("code", { text: name })], "Can't change here: it's the file name"));
    }
    var desc = h("textarea", { "aria-label": "Description", style: "min-height:3.5em;font-family:inherit;font-size:inherit", oninput: function () { draft.description = desc.value; changed(); } });
    desc.value = draft.description || "";
    f.appendChild(row("Description", [desc]));
    f.appendChild(row("Estimated", boolInput("rests on estimated fits")(draft.estimated, function (x) { draft.estimated = x; changed(); })));
    f.appendChild(row("Patch", textInput("4.10.3", 10)(draft.patch, function (x) { draft.patch = x; changed(); })));
    if (s.data.cargoBay || draft.cargoScuMethod) {
      f.appendChild(row("Cargo space method", textInput("How cargoScu was worked out", 40)(draft.cargoScuMethod, function (x) {
        draft.cargoScuMethod = x; changed(); }), "Optional"));
    }
    body.appendChild(f);

    body.appendChild(h("h2", { text: "Required roles" }));
    body.appendChild(h("p", { class: "meta", text: "Each must be filled: built in, a carried ship, or No room when there's no space left for one (scores " + num(R.noRoomScore) + "). " +
      "Built in isn't offered for a role the base has nothing for." }));
    if (largeBase) body.appendChild(h("p", { class: "meta", text: (s.data.name || carrierId) + " is in the rubric's large-base list: carried fighters score nothing here." }));
    R.roleKeys.filter(isRequired).forEach(function (k) { body.appendChild(roleRow(k)); });
    var optional = R.roleKeys.filter(function (k) { return !isRequired(k); });
    if (optional.length) {
      body.appendChild(h("h2", { text: "Optional roles" }));
      body.appendChild(h("p", { class: "meta", text: "Desired roles. Leave as built in if nothing fills them." }));
      optional.forEach(function (k) { body.appendChild(roleRow(k)); });
    }

    body.appendChild(h("h2", { text: "Extra ships" }));
    body.appendChild(h("p", { class: "meta", text: "Ships aboard that fill no role. Give each a score from " + R.extraShipScore.min + " to " + R.extraShipScore.max + " for what it's worth to you; the Extra ships line is their sum, capped at " + R.categories.extraShips.max + ". Cargo space they take comes off the hold before cargo capacity is scored. They aren't checked; add a note on what else fits." }));
    var extraWrap = h("div");
    body.appendChild(extraWrap);
    drawExtras();

    function shipOptions(role, current) {
      var opts = S.ships.filter(function (x) {
        if (x.id === carrierId || !x.valid) return false;
        if (role && !eligible(role, x)) return false;
        return carriable(x) || x.id === current;
      });
      opts.sort(function (a, b) { return (a.data.name || a.id).localeCompare(b.data.name || b.id); });
      return opts;
    }

    function addsText(role, x) {
      var v = x.breakdown && x.breakdown.carried[role];
      if (role === "defense" && largeBase) return "scores nothing on this base";
      return v ? "adds " + fmtR(v) : "";
    }

    function entryEditor(e, shipKey, role, redraw) {
      var wrap = h("div", { class: "roleBody" });
      var locSel = selectInput(locations, locations.map(locTitle))(e.location, function (x) { e.location = x; changed(); });
      var usesCargo = h("input", { type: "checkbox", checked: e.cargoScu > 0, onchange: function () {
        e.cargoScu = usesCargo.checked ? (e.cargoScu || 1) : 0; redraw(); changed(); } });
      var cargoCtrl = [h("label", { class: "check" }, [usesCargo, "takes cargo space"])];
      if (e.cargoScu > 0) cargoCtrl.push(h("span", { class: "leaf" }, [numberInput(false)(e.cargoScu, function (x) { e.cargoScu = x; changed(); }),
        h("span", { class: "rangeLbl", text: "SCU" })]));
      wrap.appendChild(row("Location", [locSel], locations.length ? "Holds any number of ships" : "this carrier lists no locations"));
      wrap.appendChild(row("Cargo storage", cargoCtrl, "Does it sit on the cargo grid, cutting cargo space?"));
      wrap.appendChild(row("Fit source", textInput("Repo owner's in-game test", 32)(e.fit, function (x) {
        if (x) e.fit = x; else delete e.fit; changed(); }), "Best first: your own test, then a player fit test (roof open or closed)"));
      wrap.appendChild(row("Patch", textInput("4.10.3", 10)(e.patch, function (x) { if (x) e.patch = x; else delete e.patch; changed(); })));
      var lowFit = h("input", { type: "checkbox", checked: e.fitsInLowCase === false, onchange: function () {
        if (lowFit.checked) e.fitsInLowCase = false; else delete e.fitsInLowCase; changed(); } });
      if (role) wrap.appendChild(row("Uncertain fit", [h("label", { class: "check" }, [lowFit, "may not fit: leave it out of the low case"])]));
      else wrap.appendChild(row("Note", textInput("e.g. fits beside the Golem with the roof open", 40)(e.note, function (x) {
        if (x) e.note = x; else delete e.note; changed(); })));
      return wrap;
    }

    function roleRow(k) {
      var block = h("div", { class: "roleBlock" });
      function draw() {
        block.innerHTML = "";
        var e = draft.roles[k];
        var current = e.source;
        var opts = shipOptions(k, current);
        var nat = alone.lines[k] || { low: 0, high: 0 };
        var nativeEmpty = nat.low === 0 && nat.high === 0;
        var required = isRequired(k);
        var first = [];
        if (!(required && nativeEmpty) || current === "native")
          first.push(h("option", { value: "native", text: "Built in (" + fmtR(nat.low === nat.high ? nat.low : { low: nat.low, high: nat.high }) + ")" }));
        if (required) {
          if (nativeEmpty && current === "native") first.unshift(h("option", { value: "", text: "Choose…" }));
          first.push(h("option", { value: "noRoom", text: "No room (scores " + num(R.noRoomScore) + ")" }));
        }
        first.push(h("option", { value: "theoretical", text: "Theoretical (set a score)" }));
        var sel = h("select", { "aria-label": catName(k) + " source", onchange: function () {
          if (sel.value === "native" || sel.value === "") draft.roles[k] = { source: "native" };
          else if (sel.value === "noRoom") draft.roles[k] = { source: "noRoom" };
          else if (sel.value === "theoretical") draft.roles[k] = { source: "theoretical", score: Math.min(3, R.categories[k].max) };
          else {
            var prev = draft.roles[k];
            draft.roles[k] = { source: sel.value, location: prev.location || defaultLocation(sel.value), cargoScu: prev.cargoScu || 0,
              patch: prev.patch || draft.patch || undefined };
            if (prev.fit) draft.roles[k].fit = prev.fit;
            if (!draft.roles[k].patch) delete draft.roles[k].patch;
          }
          draw(); changed();
        } }, first.concat(opts.map(function (x) {
          var a = addsText(k, x);
          return h("option", { value: x.id, text: (x.data.name || x.id) + (a ? " (" + a + ")" : "") });
        })));
        sel.value = required && nativeEmpty && current === "native" ? "" : (current || "native");
        var head = [h("strong", { text: catName(k) }), sel];
        if (isShip(current)) head.push(moreLink(current));
        if (!opts.length) head.push(h("span", { class: "meta", text: "no carried ship has this role yet" }));
        if (required && nativeEmpty && current === "native") head.push(h("span", { class: "meta", text: "needs a choice: the base has nothing built in" }));
        block.appendChild(h("div", { class: "roleHead" }, head));
        if (isShip(current)) block.appendChild(entryEditor(e, "source", k, draw));
        if (current === "theoretical") block.appendChild(theoreticalEditor(e, k));
      }
      draw();
      return block;
    }

    function theoreticalEditor(e, k) {
      var wrap = h("div", { class: "roleBody" });
      var max = R.categories[k].max;
      var out = h("span", { class: "rangeLbl", text: num(e.score) + " / " + max });
      var slider = h("input", { type: "range", min: "0", max: String(max), step: max > 1 ? "0.5" : "1", value: String(e.score),
        "aria-label": catName(k) + " theoretical score", oninput: function () {
          e.score = Number(slider.value); out.textContent = num(e.score) + " / " + max; changed(); } });
      wrap.appendChild(row("Theoretical score", [slider, out], "Your own score for a capability no ship has in game yet. Like any theoretical value, it counts in the high case only."));
      wrap.appendChild(row("Note", textInput("What this stands for", 40)(e.note, function (x) {
        if (x) e.note = x; else delete e.note; changed(); })));
      return wrap;
    }

    function defaultLocation(sid) {
      var x = byId[sid];
      var size = x && x.data.carrierSize;
      var want = size === "vehicle" ? ["vehicleBay", "cargoHold", "hangar", "pad"] : ["hangar", "pad", "cargoHold", "vehicleBay"];
      for (var i = 0; i < want.length; i++) if (locations.indexOf(want[i]) >= 0) return want[i];
      return locations[0];
    }

    function extraScoreRow(e) {
      var p = R.extraShipScore;
      if (typeof e.score !== "number") e.score = p.default;
      var out = h("span", { class: "rangeLbl", text: num(e.score) + " / " + p.max });
      var slider = h("input", { type: "range", min: String(p.min), max: String(p.max), step: "0.5", value: String(e.score),
        "aria-label": "Extra ship score", oninput: function () {
          e.score = Number(slider.value); out.textContent = num(e.score) + " / " + p.max; changed(); } });
      return h("div", { class: "roleBody" }, [row("Score", [slider, out], "What this ship is worth to you, " + p.min + " to " + p.max + ". The Extra ships line adds these up, capped at " + R.categories.extraShips.max + ".")]);
    }

    function drawExtras() {
      extraWrap.innerHTML = "";
      draft.extraShips.forEach(function (e, i) {
        var block = h("div", { class: "roleBlock" });
        var opts = shipOptions(null, e.ship);
        var sel = h("select", { "aria-label": "Extra ship", onchange: function () { e.ship = sel.value; e.location = e.location || defaultLocation(sel.value); drawExtras(); changed(); } },
          opts.map(function (x) { return h("option", { value: x.id, text: x.data.name || x.id }); }));
        sel.value = e.ship;
        block.appendChild(h("div", { class: "roleHead" }, [h("strong", { text: "Extra ship" }), sel, moreLink(e.ship),
          h("button", { class: "btn small", type: "button", text: "Remove", onclick: function () { draft.extraShips.splice(i, 1); drawExtras(); changed(); } })]));
        block.appendChild(extraScoreRow(e));
        block.appendChild(entryEditor(e, "ship", null, drawExtras));
        extraWrap.appendChild(block);
      });
      extraWrap.appendChild(h("button", { class: "btn small", type: "button", text: "Add extra ship", onclick: function () {
        var first = shipOptions(null)[0];
        if (!first) return;
        draft.extraShips.push({ ship: first.id, location: defaultLocation(first.id), cargoScu: 0, score: R.extraShipScore.default });
        drawExtras(); changed();
      } }));
    }

    changed();
  }

  // ------------------------------------------------------------------ start

  window.addEventListener("hashchange", route);
  loadState().then(route).catch(function (e) {
    app.innerHTML = "";
    app.appendChild(h("h1", { text: "Ship editor" }));
    app.appendChild(h("div", { class: "notice err", text: "Couldn't load ships: " + e.message +
      ". Start the editor with: uv run scripts/editor.py" }));
  });
})();
