/*
 * Leaderboard viewer for the mobile base ship scorecard.
 *
 * Reads window.scorecardResults (results/leaderboard.js) and window.scorecardSnapshotIndex
 * (rubricVersions/index.js), both written by scripts/score.py, and loads each listed
 * snapshot with a plain script tag. No server, no libraries: it works from file:// and
 * from GitHub Pages. Nothing here needs to change when ship data changes.
 *
 * Versioning (semver): major = needs a new results format, minor = new view or feature,
 * patch = fix. Bump VIEWER_VERSION with every change to this folder or index.html.
 */
(function () {
  "use strict";

  var VIEWER_VERSION = "1.0.0";
  var SCRIPT_MAJOR_SUPPORTED = 1;   // results written by score script 1.x
  var MAX_SNAPSHOTS = 5;

  var results = window.scorecardResults || null;
  var snapshotIndex = Array.isArray(window.scorecardSnapshotIndex) ? window.scorecardSnapshotIndex : [];
  var snapshots = {};          // version -> results object
  var snapshotErrors = [];
  var compareWith = readPref("compareWith") || "";
  var app = document.getElementById("app");

  // ------------------------------------------------------------------ small helpers

  function h(tag, attrs, kids) {
    var el = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        var v = attrs[k];
        if (v === null || v === undefined || v === false) return;
        if (k === "class") el.className = v;
        else if (k === "text") el.textContent = v;
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

  function readPref(k) { try { return window.sessionStorage.getItem("scorecard." + k); } catch (e) { return null; } }
  function writePref(k, v) { try { window.sessionStorage.setItem("scorecard." + k, v); } catch (e) { /* private mode */ } }

  function num(x) { return Math.round(x * 100) / 100; }
  function isRange(r) { return r && typeof r === "object" && "low" in r && "high" in r; }
  function lo(r) { return isRange(r) ? r.low : r; }
  function hi(r) { return isRange(r) ? r.high : r; }
  function mid(r) { return (lo(r) + hi(r)) / 2; }
  function fmt(r) {
    if (r === null || r === undefined) return "n/a";
    return lo(r) === hi(r) ? String(num(lo(r))) : num(lo(r)) + "-" + num(hi(r));
  }
  function major(v) { return v ? parseInt(String(v).split(".")[0], 10) : NaN; }

  function shipName(id) {
    if (!id || id === "native") return "Built in";
    var info = results && results.shipInfo && results.shipInfo[id];
    return info ? info.name : id;
  }

  function shipLink(id) {
    return h("a", { href: "#/ship/" + encodeURIComponent(id), text: shipName(id) });
  }

  var SLOT_NAMES = { smallSlot: "small slot", openPad: "open pad", mediumSlot: "medium slot", vehicleBay: "vehicle bay" };
  var STATUS_NAMES = { flightReady: "Flight ready", concept: "Concept" };

  function catName(k) { return (results.categories && results.categories[k]) || k; }

  function categoryOrder() {
    var t = results.tiers;
    if (t && t.needed && t.desired) return t.needed.categories.concat(t.desired.categories);
    return Object.keys(results.categories || {});
  }

  function tierOf(cat) {
    var t = results.tiers || {};
    for (var k in t) if (t[k].categories.indexOf(cat) >= 0) return k;
    return null;
  }

  function staleReasons(layout) {
    var out = [];
    if (layout.rubricVersion && layout.rubricVersion !== results.rubricVersion)
      out.push("scored with rubric " + layout.rubricVersion + ", current is " + results.rubricVersion);
    if (layout.scriptVersion && layout.scriptVersion !== results.scriptVersion)
      out.push("scored with script " + layout.scriptVersion + ", current is " + results.scriptVersion);
    return out;
  }

  function shipStale(ship) {
    return ship.layouts.some(function (l) { return staleReasons(l).length > 0; });
  }

  function bestLayout(ship) {
    var name = ship.bestLayout;
    for (var i = 0; i < ship.layouts.length; i++) if (ship.layouts[i].layout === name) return ship.layouts[i];
    return ship.layouts[0];
  }

  function snapshotShip(version, id) {
    var s = snapshots[version];
    if (!s || !s.ships) return null;
    for (var i = 0; i < s.ships.length; i++) if (s.ships[i].id === id) return s.ships[i];
    return null;
  }

  function rangeBar(r, scale, wasR) {
    var bar = h("div", { class: "bar", role: "img", "aria-label": "Score " + fmt(r) + " out of a scale of " + scale });
    if (!scale) return bar;
    var l = Math.max(0, Math.min(1, lo(r) / scale)), u = Math.max(0, Math.min(1, hi(r) / scale));
    bar.appendChild(h("span", { class: "lo", style: "width:" + (l * 100) + "%" }));
    if (u > l) bar.appendChild(h("span", { class: "hi", style: "left:" + (l * 100) + "%;width:" + ((u - l) * 100) + "%" }));
    if (wasR !== null && wasR !== undefined) {
      var w = Math.max(0, Math.min(1, mid(wasR) / scale));
      bar.appendChild(h("span", { class: "was", style: "left:calc(" + (w * 100) + "% - 1px)", title: "Was " + fmt(wasR) }));
    }
    return bar;
  }

  function deltaEl(now, was) {
    if (was === null || was === undefined) return null;
    var d = num(mid(now) - mid(was));
    var cls = d > 0 ? "up" : d < 0 ? "down" : "same";
    var txt = d > 0 ? "+" + d : d < 0 ? String(d) : "no change";
    return h("span", { class: "delta " + cls, title: "Change in the middle of the range" }, [txt]);
  }

  // ------------------------------------------------------------------ banners

  function banners() {
    var out = [];
    var sv = major(results.scriptVersion);
    if (!isNaN(sv) && sv !== SCRIPT_MAJOR_SUPPORTED) {
      out.push(h("div", { class: "banner error" }, [
        "These results come from score script " + results.scriptVersion + ", but viewer " + VIEWER_VERSION +
        " reads script " + SCRIPT_MAJOR_SUPPORTED + ".x results. Some parts may be missing or wrong until the viewer is updated."
      ]));
    } else if (!results.shipInfo || !results.tiers) {
      out.push(h("div", { class: "banner warn" }, [
        "These results are from an older score script and lack layout details. Run ",
        h("code", { text: "scripts/run.sh" }), " to refresh them."
      ]));
    }
    var stale = results.ships.filter(shipStale);
    if (stale.length) {
      out.push(h("div", { class: "banner error" }, [
        "Stale scores: " + stale.map(function (s) { return s.name; }).join(", ") +
        ". Their layouts were scored with an older rubric or script. Run ", h("code", { text: "scripts/run.sh" }), "."
      ]));
    }
    var v = results.validation || {};
    if (v.errors && v.errors.length) {
      out.push(h("div", { class: "banner error" }, [
        v.errors.length + " data error" + (v.errors.length > 1 ? "s" : "") + " when these results were made. Files with errors are left off the board.",
        h("ul", null, v.errors.map(function (e) { return h("li", { text: e }); }))
      ]));
    }
    if (v.warnings && v.warnings.length) {
      out.push(h("details", { class: "banner warn" }, [
        h("summary", { text: v.warnings.length + " data warning" + (v.warnings.length > 1 ? "s" : "") + " (extra fields were skipped)" }),
        h("ul", null, v.warnings.map(function (e) { return h("li", { text: e }); }))
      ]));
    }
    return out;
  }

  function compareBanner() {
    if (!compareWith) return null;
    var s = snapshots[compareWith];
    if (!s) return null;
    var parts = [];
    if (major(s.rubricVersion) !== major(results.rubricVersion)) {
      parts.push("Rubric " + s.rubricVersion + " to " + results.rubricVersion +
        " is a major change, so the old scores aren't directly comparable. See ");
      parts.push(h("a", { href: "rubricVersions/DECISIONS.md", text: "DECISIONS.md" }));
      parts.push(" for what changed.");
    }
    if (s.handScored) parts.push((parts.length ? " " : "") + "The " + s.rubricVersion + " scores were hand-scored, totals only.");
    return parts.length ? h("div", { class: "banner warn" }, parts) : null;
  }

  function compareSelect() {
    var versions = Object.keys(snapshots).sort(function (a, b) {
      return snapshotIndex.indexOf(a) - snapshotIndex.indexOf(b);
    });
    if (!versions.length) return h("span", { class: "meta", text: snapshotIndex.length ? "Loading older results…" : "No older results saved yet." });
    if (compareWith && versions.indexOf(compareWith) < 0) compareWith = "";
    var sel = h("select", {
      onchange: function (e) { compareWith = e.target.value; writePref("compareWith", compareWith); render(); }
    }, [h("option", { value: "", text: "Nothing" })].concat(versions.map(function (v) {
      var o = h("option", { value: v, text: "Rubric " + v });
      if (v === compareWith) o.selected = true;
      return o;
    })));
    return h("label", null, ["Compare with", sel]);
  }

  // ------------------------------------------------------------------ leaderboard view

  function renderBoard() {
    var ships = results.ships;
    var scale = 0;
    ships.forEach(function (s) { scale = Math.max(scale, hi(s.total)); });
    if (compareWith && snapshots[compareWith]) snapshots[compareWith].ships.forEach(function (s) { scale = Math.max(scale, hi(s.total)); });
    scale = Math.ceil(scale / 5) * 5 || 5;

    var list = h("ol", { class: "board" }, ships.map(function (s) {
      var best = bestLayout(s);
      var was = compareWith ? snapshotShip(compareWith, s.id) : null;
      var sub = [
        h("span", { text: s.manufacturer + " · " + s.size + " · " + (STATUS_NAMES[s.status] || s.status) }),
        h("span", { text: "Best layout: " + best.layout }),
        best.estimated ? h("span", { class: "badge est", title: "Rests on marketing or estimated fits", text: "Estimated" }) : null,
        shipStale(s) ? h("span", { class: "badge stale", text: "Stale" }) : null
      ];
      if (compareWith) {
        sub.push(was
          ? h("span", null, ["Was " + fmt(was.total) + " (rank " + was.rank + ") ", deltaEl(s.total, was.total)])
          : h("span", { text: "Not scored in " + compareWith }));
      }
      var rowBtn = h("button", {
        class: "row", type: "button",
        "aria-label": "Rank " + s.rank + ", " + s.name + ", score " + fmt(s.total) + ". Open its best layout.",
        onclick: function () { go("#/ship/" + encodeURIComponent(s.id)); }
      }, [
        h("span", { class: "rank", text: String(s.rank) }),
        h("span", null, [h("span", { class: "name", text: s.name }), h("span", { class: "sub" }, sub)]),
        h("span", { class: "score" }, [fmt(s.total), lo(s.total) !== hi(s.total) ? h("small", { text: "low-high" }) : null]),
        rangeBar(s.total, scale, was ? was.total : null)
      ]);
      return h("li", null, [rowBtn]);
    }));

    var legend = h("div", { class: "legend" }, [
      h("span", null, [h("span", { class: "swatch", style: "background:var(--accent)" }), "Low case"]),
      h("span", null, [h("span", { class: "swatch", style: "background:var(--accent-soft)" }), "Up to the high case"]),
      compareWith ? h("span", null, [h("span", { class: "swatch", style: "background:var(--fg);width:3px;opacity:.65" }), "Old score (middle)"]) : null,
      h("span", { text: "Scale 0-" + scale + ". Ranked by the middle of each range." })
    ]);

    return [
      h("h1", { text: "Mobile base ship scorecard" }),
      h("p", { class: "meta", text: "Each ship as a solo mobile base, scored by its best layout. Tap a ship to see the layout." }),
      h("div", { class: "toolbar" }, [compareSelect()]),
      compareBanner(),
      list,
      legend
    ];
  }

  // ------------------------------------------------------------------ ship view

  function rulesFor(cat) {
    return (results.rules || []).filter(function (r) {
      return r.categories.indexOf(cat) >= 0;
    });
  }

  function sourceLine(cat, line, role) {
    var src = line.sources || { low: line.source, high: line.source };
    var parts = [];
    if (src.low === src.high) {
      parts.push(src.low === "native" ? "Built in" : "Carried: " + shipName(src.low));
    } else {
      parts.push("Low case: " + (src.low === "native" ? "built in" : shipName(src.low)) +
                 " · High case: " + (src.high === "native" ? "built in" : shipName(src.high)));
    }
    var planned = role && role.source !== "native" ? role.source : null;
    var used = src.low === planned || src.high === planned;
    var kids = [h("div", { class: "src" }, src.low === src.high && src.low !== "native"
      ? ["Carried: ", shipLink(src.low)] : [parts.join("")])];
    if (planned) {
      var fitBits = [];
      if (role.slot) fitBits.push(SLOT_NAMES[role.slot] || role.slot);
      if (role.cargoScu) fitBits.push(role.cargoScu + " SCU of cargo space");
      if (role.fit) fitBits.push("Fit: " + role.fit);
      if (role.patch) fitBits.push("patch " + role.patch);
      if (role.fitsInLowCase === false) fitBits.push("may not fit, so left out of the low case");
      if (!used) kids.push(h("div", { class: "fit", text: shipName(planned) + " is aboard for this role but adds nothing over the built-in score, so its slot counts as spare room." }));
      if (fitBits.length) kids.push(h("div", { class: "fit", text: (used ? "" : shipName(planned) + ": ") + fitBits.join(" · ") }));
    }
    return kids;
  }

  function renderCategories(layout, wasLayout) {
    var maxes = results.categoryMax || {};
    var order = categoryOrder();
    var groups = {};
    order.forEach(function (c) { var t = tierOf(c) || "other"; (groups[t] = groups[t] || []).push(c); });
    var out = [];
    Object.keys(groups).forEach(function (tier) {
      var w = results.tiers && results.tiers[tier] ? results.tiers[tier].weight : null;
      var title = (tier === "needed" ? "Needed" : tier === "desired" ? "Desired" : "Other") + (w !== null ? " (counts x" + w + ")" : "");
      out.push(h("h3", { text: title }));
      out.push(h("div", { class: "cats" }, groups[tier].map(function (cat) {
        var line = layout.lines[cat];
        if (!line) return null;
        var max = maxes[cat];
        var wasLine = wasLayout && wasLayout.lines ? wasLayout.lines[cat] : null;
        var role = layout.roles ? layout.roles[cat] : null;
        var rules = rulesFor(cat);
        return h("div", { class: "cat" }, [
          h("div", { class: "cat-head" }, [
            h("span", { class: "cat-name", text: catName(cat) }),
            h("span", { class: "cat-score" }, [fmt(line), max !== null && max !== undefined ? h("span", { class: "max", text: " / " + max }) : null]),
            wasLine ? h("span", { class: "fit" }, ["Was " + fmt(wasLine) + " ", deltaEl(line, wasLine)]) : null
          ]),
          max ? rangeBar(line, max, wasLine) : null
        ].concat(sourceLine(cat, line, role)).concat(rules.length ? [
          h("details", null, [h("summary", { text: "How it's scored" })].concat(rules.map(function (r) { return h("p", { text: r.text }); })))
        ] : []));
      })));
    });
    return out;
  }

  function changeList(ids) {
    var items = [];
    ids.forEach(function (id) {
      var info = results.shipInfo && results.shipInfo[id];
      if (!info) return;
      (info.changes || []).forEach(function (c) {
        items.push(h("li", null, [h("strong", { text: info.name }), " (patch " + c.patch + "): " + c.change]));
      });
    });
    return items;
  }

  function renderShip(id, layoutName) {
    var ship = null;
    results.ships.forEach(function (s) { if (s.id === id) ship = s; });
    var back = h("a", { class: "back", href: "#/", text: "‹ All ships" });
    if (!ship) return renderCarried(id, back);
    var layout = null;
    ship.layouts.forEach(function (l) { if (l.layout === layoutName) layout = l; });
    if (!layout) layout = bestLayout(ship);
    var isBest = layout.layout === ship.bestLayout;
    var info = (results.shipInfo && results.shipInfo[ship.id]) || {};

    var snapShip = compareWith ? snapshotShip(compareWith, ship.id) : null;
    var wasLayout = null;
    if (snapShip && snapShip.layouts) snapShip.layouts.forEach(function (l) { if (l.layout === layout.layout) wasLayout = l; });

    var out = [back];
    out.push(h("div", { class: "headline" }, [
      h("div", null, [
        h("h1", { text: ship.name }),
        h("div", { class: "meta" }, [
          "Rank " + ship.rank + " · " + ship.manufacturer + " · size " + ship.size + " · " + (STATUS_NAMES[ship.status] || ship.status) +
          (info.patch ? " · patch " + info.patch : "")
        ])
      ]),
      h("div", { class: "bigscore" }, [fmt(layout.total),
        h("small", { text: "Needed " + fmt(layout.needed) + " · desired " + fmt(layout.desired) +
          (results.tiers && results.tiers.desired ? " (x" + results.tiers.desired.weight + ")" : "") })])
    ]));

    if (ship.layouts.length > 1) {
      out.push(h("div", { class: "tabs", role: "group", "aria-label": "Layouts" }, ship.layouts.map(function (l) {
        return h("button", {
          class: "tab", type: "button", "aria-pressed": l.layout === layout.layout ? "true" : "false",
          onclick: function () { go("#/ship/" + encodeURIComponent(ship.id) + "/" + encodeURIComponent(l.layout)); }
        }, [l.layout + " (" + fmt(l.total) + ")" + (l.layout === ship.bestLayout ? " · best" : "")]);
      })));
    }

    var stale = staleReasons(layout);
    out.push(h("div", { class: "card" }, [
      h("div", null, [
        h("strong", { text: "Layout: " + layout.layout + " " }),
        isBest ? h("span", { class: "badge best", text: "Best" }) : null, " ",
        layout.estimated ? h("span", { class: "badge est", text: "Estimated" }) : null, " ",
        stale.length ? h("span", { class: "badge stale", text: "Stale" }) : null
      ]),
      h("p", { text: layout.description }),
      layout.estimated ? h("p", { class: "meta", text: "Estimated: some values rest on marketing or on fits nobody has tested. Ranges show the low and high case." }) : null,
      (results.rules || []).filter(function (r) { return r.categories.indexOf("all") >= 0; }).length
        ? h("details", null, [h("summary", { text: "Rules for every role" })].concat((results.rules || []).filter(function (r) {
            return r.categories.indexOf("all") >= 0; }).map(function (r) { return h("p", { text: r.text }); }))) : null,
      stale.length ? h("p", { class: "meta", text: "Stale: " + stale.join("; ") + ". Run scripts/run.sh." }) : null,
      h("p", { class: "meta" }, [
        "Data: ", h("a", { href: layout.file, text: layout.file }),
        info.file ? " · " : null, info.file ? h("a", { href: info.file, text: info.file }) : null,
        layout.patch ? " · patch " + layout.patch : null
      ])
    ]));

    if (compareWith) {
      if (!snapShip) out.push(h("div", { class: "banner warn", text: ship.name + " wasn't scored in rubric " + compareWith + "." }));
      else if (!wasLayout) out.push(h("div", { class: "banner warn", text: "Rubric " + compareWith + " has " +
        (snapShip.layouts && snapShip.layouts.length ? "no layout called " + layout.layout : "totals only") +
        ", so only the total can be compared: it was " + fmt(snapShip.total) + " (rank " + snapShip.rank + ")." }));
      var cb = compareBanner();
      if (cb) out.push(cb);
    }

    out.push(h("h2", { text: "Scores by role" }));
    out = out.concat(renderCategories(layout, wasLayout));

    var extras = (layout.extraShips || []).map(function (e) {
      var bits = [SLOT_NAMES[e.slot] || e.slot];
      if (e.cargoScu) bits.push(e.cargoScu + " SCU of cargo space");
      if (e.fit) bits.push("Fit: " + e.fit);
      if (e.fitsInLowCase === false) bits.push("left out of the low case");
      return h("li", null, [shipLink(e.source), " · " + bits.join(" · ")]);
    });
    var spare = layout.spareShips || [];
    out.push(h("h2", { text: "Aboard but not filling a role" }));
    out.push(h("div", { class: "card" }, [
      extras.length ? h("ul", { class: "plain" }, extras) : h("p", { class: "meta", text: "No extra ships in this layout." }),
      spare.length ? h("p", { class: "meta", style: "margin-top:8px", text: "Counted as spare room: " + spare.map(shipName).join(", ") + "." }) : null,
      layout.cargoLeftScu ? h("p", { class: "meta", style: "margin-top:4px", text: "Cargo left after carried ships: " + fmt(layout.cargoLeftScu) + " SCU." }) : null
    ]));

    // Score history across saved rubric versions.
    var rows = [h("tr", null, [
      h("td", null, ["Rubric " + results.rubricVersion + " ", h("span", { class: "badge", text: "current" })]),
      h("td", { class: "num", text: fmt(ship.total) }),
      h("td", { class: "num", text: String(ship.rank) }),
      h("td", { text: ship.bestLayout })
    ])];
    snapshotIndex.forEach(function (v) {
      if (!snapshots[v]) return;
      var s = snapshotShip(v, ship.id);
      rows.push(h("tr", null, [
        h("td", null, ["Rubric " + v + " ", snapshots[v].handScored ? h("span", { class: "badge", text: "hand-scored" }) : null]),
        h("td", { class: "num" }, s ? [fmt(s.total), " ", deltaEl(ship.total, s.total)] : ["not scored"]),
        h("td", { class: "num", text: s ? String(s.rank) : "" }),
        h("td", { text: s && s.bestLayout ? s.bestLayout : "" })
      ]));
    });
    out.push(h("h2", { text: "Score history" }));
    out.push(h("div", { class: "card table-wrap" }, [
      h("table", null, [
        h("thead", null, [h("tr", null, [h("th", { text: "Version" }), h("th", { class: "num", text: "Total" }), h("th", { class: "num", text: "Rank" }), h("th", { text: "Best layout" })])]),
        h("tbody", null, rows)
      ]),
      h("p", { class: "meta", style: "margin-top:8px" }, ["The change shown is current minus old, using the middle of each range. Reasons for each rubric change are in ",
        h("a", { href: "rubricVersions/DECISIONS.md", text: "DECISIONS.md" }), "."])
    ]));

    var shipIds = [ship.id];
    Object.keys(layout.roles || {}).forEach(function (k) { var s = layout.roles[k].source; if (s && s !== "native" && shipIds.indexOf(s) < 0) shipIds.push(s); });
    (layout.extraShips || []).forEach(function (e) { if (shipIds.indexOf(e.source) < 0) shipIds.push(e.source); });
    var changes = changeList(shipIds);
    out.push(h("h2", { text: "Patch changes for these ships" }));
    out.push(h("div", { class: "card" }, [changes.length ? h("ul", { class: "plain" }, changes) : h("p", { class: "meta", text: "None recorded." })]));

    out.push(h("p", { class: "meta", style: "margin-top:16px" }, [
      "Scored with rubric " + layout.rubricVersion + " and script " + layout.scriptVersion + ". Input fingerprint ",
      h("code", { text: layout.fingerprint || "n/a" }), "."
    ]));
    return out;
  }

  // A ship with no layouts: it only rides on other ships.
  function renderCarried(id, back) {
    var info = results.shipInfo && results.shipInfo[id];
    if (!info) return [back, h("h1", { text: id }), h("p", { text: "No ship with that id in these results." })];
    var usedIn = [];
    results.ships.forEach(function (s) {
      s.layouts.forEach(function (l) {
        var roles = [];
        Object.keys(l.roles || {}).forEach(function (k) { if (l.roles[k].source === id) roles.push(catName(k)); });
        var extra = (l.extraShips || []).some(function (e) { return e.source === id; });
        if (roles.length || extra) {
          usedIn.push(h("li", null, [
            h("a", { href: "#/ship/" + encodeURIComponent(s.id) + "/" + encodeURIComponent(l.layout), text: s.name + ", " + l.layout }),
            " · " + (roles.length ? roles.join(", ") : "aboard, no role")
          ]));
        }
      });
    });
    var changes = changeList([id]);
    return [back,
      h("h1", { text: info.name }),
      h("p", { class: "meta", text: info.manufacturer + " · size " + info.size + " · " + (STATUS_NAMES[info.status] || info.status) +
        (info.patch ? " · patch " + info.patch : "") }),
      h("p", { text: "This ship has no layouts of its own, so it isn't ranked. It rides on other ships." }),
      h("h2", { text: "Carried in" }),
      h("div", { class: "card" }, [usedIn.length ? h("ul", { class: "plain" }, usedIn) : h("p", { class: "meta", text: "No layout uses it yet." })]),
      h("h2", { text: "Patch changes" }),
      h("div", { class: "card" }, [changes.length ? h("ul", { class: "plain" }, changes) : h("p", { class: "meta", text: "None recorded." })]),
      h("p", { class: "meta", style: "margin-top:16px" }, ["Data: ", h("a", { href: info.file, text: info.file })])
    ];
  }

  // ------------------------------------------------------------------ routing and render

  function go(hash) {
    if (location.hash === hash) render(); else location.hash = hash;
  }

  function route() {
    var m = /^#\/ship\/([^/]+)(?:\/([^/]+))?/.exec(location.hash || "");
    return m ? { view: "ship", id: decodeURIComponent(m[1]), layout: m[2] ? decodeURIComponent(m[2]) : null } : { view: "board" };
  }

  function footer() {
    var parts = ["Rubric " + results.rubricVersion + " · score script " + results.scriptVersion + " · viewer " + VIEWER_VERSION];
    if (snapshotErrors.length) parts.push(". Couldn't load results for rubric " + snapshotErrors.join(", ") + ".");
    return h("footer", null, parts);
  }

  var lastView = null;
  function render() {
    if (!results || !Array.isArray(results.ships)) {
      app.replaceChildren(
        h("h1", { text: "Mobile base ship scorecard" }),
        h("div", { class: "banner error" }, ["No results found. Run ", h("code", { text: "scripts/run.sh" }),
          " to write ", h("code", { text: "results/leaderboard.js" }), ", then reload this page."])
      );
      return;
    }
    var r = route();
    var kids = banners().concat(r.view === "ship" ? renderShip(r.id, r.layout) : renderBoard());
    kids.push(footer());
    app.replaceChildren.apply(app, kids.filter(Boolean));
    var key = r.view + ":" + (r.id || "") + ":" + (r.layout || "");
    if (key !== lastView) { window.scrollTo(0, 0); lastView = key; }
    document.title = r.view === "ship" ? (shipName(r.id) + " · Ship Scorecard") : "Ship Scorecard";
  }

  // Loads each snapshot in turn. A snapshot is a copy of results/leaderboard.js, so it sets
  // window.scorecardResults too; keep ours and put it back after each one.
  function loadSnapshots(list, i) {
    if (i >= list.length) return;
    var v = list[i];
    var mine = window.scorecardResults;
    window.scorecardResults = undefined;
    var tag = document.createElement("script");
    tag.src = "rubricVersions/" + encodeURIComponent(v) + "/leaderboard.js";
    tag.onload = function () {
      var snap = window.scorecardResults;
      if (snap && Array.isArray(snap.ships)) snapshots[v] = snap; else snapshotErrors.push(v);
      window.scorecardResults = mine;
      render();
      loadSnapshots(list, i + 1);
    };
    tag.onerror = function () {
      window.scorecardResults = mine;
      snapshotErrors.push(v);
      render();
      loadSnapshots(list, i + 1);
    };
    document.body.appendChild(tag);
  }

  window.addEventListener("hashchange", render);
  render();
  if (results) {
    var list = snapshotIndex.filter(function (v) { return /^[0-9A-Za-z.\-]+$/.test(v) && v !== results.rubricVersion; }).slice(0, MAX_SNAPSHOTS);
    loadSnapshots(list, 0);
  }
})();
