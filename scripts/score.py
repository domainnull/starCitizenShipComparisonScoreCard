#!/usr/bin/env python3
"""Score every ship layout against rubric.yaml and write results/leaderboard.js.

Usage:
    python3 scripts/score.py            # validate, score, write results/leaderboard.js and
                                        # rubricVersions/index.js (snapshot list for the viewer)
    python3 scripts/score.py --check    # validate and report stale results; writes nothing
    python3 scripts/score.py --dry-run  # validate and score; print the table; writes nothing

Needs Python 3.9+ and PyYAML (see requirements.txt).

scripts/editor.py imports this file: load_raw, validate_all, score_both and the editor helpers
below let it check and score ships and layouts held in memory before it writes them.

Script versioning (semver): major = old scores are not comparable, minor = new rule or
output field, patch = fix. Bump SCRIPT_VERSION with every change to this file.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import math
import re
import sys
from pathlib import Path

import yaml

SCRIPT_VERSION = "2.0.0"

ROOT = Path(__file__).resolve().parent.parent
RUBRIC_PATH = ROOT / "rubric.yaml"
SHIPS_DIR = ROOT / "ships"
RESULTS_PATH = ROOT / "results" / "leaderboard.js"
RESULTS_PREFIX = "window.scorecardResults = "
SNAPSHOTS_DIR = ROOT / "rubricVersions"
SNAPSHOT_INDEX_PATH = SNAPSHOTS_DIR / "index.js"
SNAPSHOT_INDEX_PREFIX = "window.scorecardSnapshotIndex = "

SCENARIOS = ("low", "high")
MANUFACTURERS = {"AEGS", "ANVL", "ARGO", "BANU", "CNOU", "CRUS", "DRAK", "ESPR", "GAMA",
                 "GRIN", "KRIG", "MISC", "ORIG", "RSI", "TMBL", "XNAA"}
ROLE_KEYS = ["mining", "refining", "medical", "salvageRepair", "manufacturing", "defense",
             "livingQuarters", "cargo", "commuter", "exploration"]
# Where a carried ship can go. A location holds any number of ships; the layout says which fit together.
LOCATIONS = ["hangar", "pad", "cargoHold", "vehicleBay"]
# Order the score lines are shown in.
# Lines scored: every role, plus cargo capacity, which no layout fills.
LINE_ORDER = [k for k in ROLE_KEYS]
LINE_ORDER.insert(LINE_ORDER.index("cargo") + 1, "cargoCapacity")
# A required role's source when the base has no room left for a ship that would fill it.
NO_ROOM = "noRoom"
# A role filled by a capability no ship has yet, with a score the maintainer sets.
EXPERIMENTAL = "experimental"
# Roles only the base itself can fill: no carried ship and no experimental score.
BUILT_IN_ONLY = ["livingQuarters"]
GUN_RE = re.compile(r"^S[1-9]$")
SHIP_ID_RE = re.compile(r"^(aegs|anvl|argo|banu|cnou|crus|drak|espr|gama|grin|krig|misc|orig|rsi|tmbl|xnaa)"
                        r"([SLC])([A-Z][A-Za-z0-9]*)$")


# --------------------------------------------------------------------------- reporting

class Report:
    def __init__(self):
        self.errors: list[str] = []
        self.warnings: list[str] = []

    def error(self, file, field, kind, detail=""):
        self.errors.append(self._fmt(file, field, kind, detail))

    def warn(self, file, field, kind, detail=""):
        self.warnings.append(self._fmt(file, field, kind, detail))

    @staticmethod
    def _fmt(file, field, kind, detail):
        rel = Path(file).relative_to(ROOT) if Path(file).is_absolute() else file
        msg = f"{rel}: {field}: {kind}"
        return f"{msg} ({detail})" if detail else msg


# --------------------------------------------------------------------------- helpers

def is_range(v):
    return isinstance(v, dict) and set(v.keys()) == {"low", "high"}


def resolve(v, scenario):
    """Pick the low or high case of every {low, high} value inside v."""
    if is_range(v):
        return resolve(v[scenario], scenario)
    if isinstance(v, dict):
        return {k: resolve(x, scenario) for k, x in v.items()}
    if isinstance(v, list):
        return [resolve(x, scenario) for x in v]
    return v


def has_range(v):
    if is_range(v):
        return True
    if isinstance(v, dict):
        return any(has_range(x) for x in v.values())
    if isinstance(v, list):
        return any(has_range(x) for x in v)
    return False


def floor_half(x):
    return math.floor(x * 2 + 1e-9) / 2


def clamp(x, lo, hi):
    if hi is None:
        return max(lo, x)
    return max(lo, min(hi, x))


def load_yaml(path, report):
    try:
        with open(path, encoding="utf-8") as f:
            data = yaml.safe_load(f)
    except yaml.YAMLError as e:
        report.error(path, "(file)", "bad value", f"not valid YAML: {e}")
        return None
    if not isinstance(data, dict):
        report.error(path, "(file)", "bad value", "top level must be a mapping")
        return None
    return data


def check_fields(path, data, required, optional, report, where=""):
    ok = True
    prefix = f"{where}." if where else ""
    for k in required:
        if k not in data:
            report.error(path, prefix + k, "missing field")
            ok = False
    for k in data:
        if k not in required and k not in optional:
            report.warn(path, prefix + k, "extra field", "ignored, not graded")
    return ok


# --------------------------------------------------------------------------- validation

def validate_value(path, field, value, check, report):
    """Run check(value) on both scenarios of a value that may be a {low, high} range."""
    ok = True
    for scen in SCENARIOS if has_range(value) else ("low",):
        problem = check(resolve(value, scen))
        if problem:
            report.error(path, field, "bad value", problem + (f" in the {scen} case" if has_range(value) else ""))
            ok = False
    return ok


def level_check(levels):
    def check(v):
        if v not in levels:
            return f"{v!r} is not one of {', '.join(levels)}"
    return check


def validate_roles(path, roles, rubric, report, full):
    cats = rubric["categories"]
    known = set(ROLE_KEYS) | {"hauler", "fighter"}
    ok = True
    if not isinstance(roles, dict):
        report.error(path, "roles", "bad value", "must be a mapping")
        return False
    if full:
        for k in ROLE_KEYS:
            if k not in roles:
                report.error(path, f"roles.{k}", "missing field", "a ship with layouts needs every role")
                ok = False
    for k in roles:
        if k not in known:
            report.warn(path, f"roles.{k}", "extra field", "ignored, not graded")
    v = roles
    f = "roles."
    for key in ("mining", "refining", "manufacturing", "exploration"):
        if key in v:
            ok &= validate_value(path, f + key, v[key], level_check(cats[key]["levels"]), report)
    if "medical" in v:
        def med(x):
            if not isinstance(x, dict) or "level" not in x or "beds" not in x:
                return "needs level and beds"
            if x["level"] not in cats["medical"]["levels"]:
                return f"level {x['level']!r} is not one of {', '.join(cats['medical']['levels'])}"
            if not isinstance(x["beds"], int) or x["beds"] < 0:
                return "beds must be a whole number, 0 or more"
        ok &= validate_value(path, f + "medical", v["medical"], med, report)
    if "salvageRepair" in v:
        def sal(x):
            if not isinstance(x, dict) or "level" not in x or "repair" not in x:
                return "needs level and repair"
            if x["level"] not in cats["salvageRepair"]["levels"]:
                return f"level {x['level']!r} is not one of {', '.join(cats['salvageRepair']['levels'])}"
            if x["repair"] not in cats["salvageRepair"]["repairBonus"]:
                return f"repair {x['repair']!r} is not one of {', '.join(cats['salvageRepair']['repairBonus'])}"
        ok &= validate_value(path, f + "salvageRepair", v["salvageRepair"], sal, report)
    if "defense" in v:
        def dfn(x):
            if not isinstance(x, dict) or not isinstance(x.get("seats"), list):
                return "needs a seats list"
            for i, seat in enumerate(x["seats"]):
                if not isinstance(seat, dict) or "guns" not in seat or "name" not in seat:
                    return f"seat {i} needs name and guns"
                extra = set(seat) - {"name", "guns", "energyCapable"}
                if extra:
                    return f"seat {i} has unknown keys {sorted(extra)}"
                if not isinstance(seat["guns"], list) or not all(isinstance(g, str) and GUN_RE.match(g) for g in seat["guns"]):
                    return f"seat {i} guns must be a list like [S5, S5]"
                for g in seat["guns"]:
                    if g not in cats["defense"]["gunScore"]:
                        return f"seat {i} gun size {g} has no score in the rubric"
        ok &= validate_value(path, f + "defense", v["defense"], dfn, report)
    if "livingQuarters" in v:
        def liv(x):
            if not isinstance(x, dict) or not isinstance(x.get("beds"), int) or not isinstance(x.get("recSpace"), bool):
                return "needs beds (whole number) and recSpace (true/false)"
        ok &= validate_value(path, f + "livingQuarters", v["livingQuarters"], liv, report)
    if "cargo" in v:
        mmax = cats["cargo"]["maneuverabilityMax"]
        def car(x):
            if not isinstance(x, dict) or not isinstance(x.get("scu"), (int, float)) or not isinstance(x.get("maneuverability"), (int, float)):
                return "needs scu and maneuverability numbers"
            if x["scu"] < 0 or not 0 <= x["maneuverability"] <= mmax:
                return f"scu must be 0 or more and maneuverability 0-{mmax}"
        ok &= validate_value(path, f + "cargo", v["cargo"], car, report)
    for key in ("commuter", "hauler", "fighter"):
        if key in v:
            ok &= validate_value(path, f + key, v[key], lambda x: None if isinstance(x, bool) else "must be true or false", report)
    return ok


def validate_ship(path, data, rubric, report, has_layouts):
    required = ["id", "name", "manufacturer", "size", "cigSize", "status", "roles", "sources", "changes"]
    optional = ["sizeOverride", "patch", "dimensions", "carrierSize", "locations", "cargoBay", "notes"]
    if has_layouts:
        required = required + ["locations"]
        optional = [o for o in optional if o != "locations"]
    ok = check_fields(path, data, required, optional, report)
    folder = Path(path).parent.name
    sid = data.get("id")
    m = SHIP_ID_RE.match(sid or "")
    if sid != folder:
        report.error(path, "id", "bad value", f"{sid!r} does not match its folder {folder!r}")
        ok = False
    if not m:
        report.error(path, "id", "bad value", "ship id must be manufacturer code + S/L/C + Name, e.g. anvlLLiberator")
        ok = False
    man = data.get("manufacturer")
    if man is not None and man not in MANUFACTURERS:
        report.error(path, "manufacturer", "bad value", f"{man!r} is not a known code")
        ok = False
    if m and man and m.group(1).upper() != man:
        report.error(path, "id", "bad value", f"id prefix {m.group(1)!r} does not match manufacturer {man!r}")
        ok = False
    size = data.get("size")
    if size not in ("S", "L", "C"):
        report.error(path, "size", "bad value", "must be S, L or C")
        ok = False
    elif m and m.group(2) != size:
        report.error(path, "id", "bad value", f"id size letter {m.group(2)!r} does not match size {size!r}")
        ok = False
    cig = data.get("cigSize")
    if cig is not None:
        expected = "S" if cig <= 2 else "L" if cig <= 5 else "C"
        if size in ("S", "L", "C") and expected != size and not data.get("sizeOverride"):
            report.error(path, "size", "bad value", f"CIG size {cig} means {expected}; add sizeOverride to keep {size}")
            ok = False
    elif "cigSize" in data and not data.get("sizeOverride"):
        report.error(path, "sizeOverride", "missing field", "needed when cigSize is null")
        ok = False
    if data.get("status") not in (None, "flightReady", "concept"):
        report.error(path, "status", "bad value", "must be flightReady or concept")
        ok = False
    if data.get("carrierSize") not in (None, "none", "small", "medium", "vehicle"):
        report.error(path, "carrierSize", "bad value", "must be none, small, medium or vehicle")
        ok = False
    if "sources" in data and (not isinstance(data["sources"], list) or not data["sources"]):
        report.error(path, "sources", "bad value", "list at least one source link")
        ok = False
    if "changes" in data:
        if not isinstance(data["changes"], list):
            report.error(path, "changes", "bad value", "must be a list")
            ok = False
        else:
            for i, c in enumerate(data["changes"]):
                if not isinstance(c, dict) or "patch" not in c or "change" not in c:
                    report.error(path, f"changes[{i}]", "missing field", "each entry needs patch and change")
                    ok = False
    if "locations" in data:
        locs = data["locations"]
        if not isinstance(locs, list) or not locs:
            report.error(path, "locations", "bad value", f"list one or more of {', '.join(LOCATIONS)}")
            ok = False
        else:
            for i, loc in enumerate(locs):
                if loc not in LOCATIONS:
                    report.error(path, f"locations[{i}]", "bad value", f"{loc!r} must be one of {', '.join(LOCATIONS)}")
                    ok = False
            if len(set(map(str, locs))) != len(locs):
                report.error(path, "locations", "bad value", "list each location once")
                ok = False
    if "cargoBay" in data:
        if isinstance(data["cargoBay"], dict):
            ok &= check_fields(path, data["cargoBay"], ["floorLength", "floorWidth", "gridScu"], [], report, "cargoBay")
        else:
            report.error(path, "cargoBay", "bad value", "must be a mapping")
            ok = False
    if "roles" in data:
        ok &= validate_roles(path, data["roles"], rubric, report, full=has_layouts)
    return ok


def carried_role_check(role, sid, sroles):
    """Can ship `sid` (roles `sroles`) fill `role` in a layout?

    Returns (None, None) when it can, ("warning", text) when it can but adds nothing,
    or ("error", text) when the layout would fail validation.
    """
    if role == "cargo":
        if not sroles.get("hauler"):
            return "error", f"{sid} is not marked as a hauler"
    elif role == "defense":
        if "defense" not in sroles:
            return "error", f"{sid} has no defense data"
    elif role in BUILT_IN_ONLY:
        return "error", "living quarters are built in only; no ship can fill them"
    elif role not in sroles or sroles.get(role) in (False, "none"):
        return "error", f"{sid} has no {role} data"
    return None, None


def native_lines(rubric, carrier_id, carrier):
    """Each role's score with nothing carried, by case."""
    scorer = Scorer(rubric)
    return {s: scorer.score_layout(carrier_id, carrier, native_layout(), {}, s)["lines"] for s in SCENARIOS}


def required_roles(rubric):
    """Roles every layout must fill: the needed tier."""
    return [k for k in ROLE_KEYS if k in rubric["tiers"]["needed"]["categories"]]


def validate_layout(path, data, carrier, ships, report, rubric):
    ok = check_fields(path, data, ["layout", "carrier", "description", "estimated", "patch", "roles", "extraShips"],
                      ["cargoScuMethod"], report)
    if data.get("layout") != Path(path).stem:
        report.error(path, "layout", "bad value", f"{data.get('layout')!r} does not match the file name {Path(path).stem!r}")
        ok = False
    if data.get("carrier") != carrier:
        report.error(path, "carrier", "bad value", f"{data.get('carrier')!r} does not match its ship folder {carrier!r}")
        ok = False
    locations = ships.get(carrier, {}).get("locations") or []

    def entry(where, e, ship_key):
        nonlocal ok
        if not isinstance(e, dict):
            report.error(path, where, "bad value", "must be a mapping")
            ok = False
            return
        if e.get(ship_key) in ("native", NO_ROOM) and ship_key == "source":
            check_fields(path, e, ["source"], [], report, where)
            return
        if e.get(ship_key) == EXPERIMENTAL and ship_key == "source":
            if not check_fields(path, e, ["source", "score"], ["note"], report, where):
                ok = False
            return
        if not check_fields(path, e, [ship_key, "location", "cargoScu"], ["fit", "patch", "fitsInLowCase"], report, where):
            ok = False
        sid = e.get(ship_key)
        if sid is not None and sid not in ships:
            report.error(path, f"{where}.{ship_key}", "unknown ship id", f"{sid!r} has no ships/{sid}/ship_data.yaml")
            ok = False
        if sid == carrier:
            report.error(path, f"{where}.{ship_key}", "bad value", "a ship can't carry itself")
            ok = False
        loc = e.get("location")
        if loc is not None and loc not in locations:
            report.error(path, f"{where}.location", "bad value",
                         f"{loc!r} is not a location this carrier has ({', '.join(map(str, locations)) or 'none'})")
            ok = False
        c = e.get("cargoScu")
        if c is not None and (not isinstance(c, (int, float)) or c < 0):
            report.error(path, f"{where}.cargoScu", "bad value", "must be a number, 0 or more")
            ok = False
        if "fitsInLowCase" in e and not isinstance(e["fitsInLowCase"], bool):
            report.error(path, f"{where}.fitsInLowCase", "bad value", "must be true or false")
            ok = False

    required = required_roles(rubric)
    native = native_lines(rubric, carrier, ships[carrier]) if carrier in ships else {}
    roles = data.get("roles")
    if isinstance(roles, dict):
        for k in ROLE_KEYS:
            if k not in roles:
                report.error(path, f"roles.{k}", "missing field",
                             f"say native, a carried ship id, {EXPERIMENTAL}{' or ' + NO_ROOM if k in required else ''}")
                ok = False
        for k, e in roles.items():
            if k not in ROLE_KEYS:
                report.warn(path, f"roles.{k}", "extra field", "ignored, not graded")
                continue
            if isinstance(e, dict) and "source" not in e:
                report.error(path, f"roles.{k}.source", "missing field")
                ok = False
                continue
            entry(f"roles.{k}", e, "source")
            sid = e.get("source") if isinstance(e, dict) else None
            if sid == NO_ROOM and k not in required:
                report.error(path, f"roles.{k}.source", "bad value", f"{NO_ROOM} is only for required roles; use native")
                ok = False
            if sid == EXPERIMENTAL:
                if k in BUILT_IN_ONLY:
                    report.error(path, f"roles.{k}.source", "bad value", f"{k} is built in only; no experimental score")
                    ok = False
                else:
                    top = rubric["categories"][k]["max"]
                    sc = e.get("score")
                    if "score" in e and (isinstance(sc, bool) or not isinstance(sc, (int, float)) or not 0 <= sc <= top):
                        report.error(path, f"roles.{k}.score", "bad value", f"must be a number from 0 to {top}")
                        ok = False
            if sid == "native" and k in required and carrier in ships and \
                    all(native[s][k] == 0 for s in SCENARIOS):
                report.error(path, f"roles.{k}.source", "missing field",
                             f"required role: the base has none built in, so pick a carried ship, {EXPERIMENTAL} or {NO_ROOM}")
                ok = False
            if sid and sid not in ("native", NO_ROOM, EXPERIMENTAL) and sid in ships:
                kind, problem = carried_role_check(k, sid, ships[sid].get("roles", {}) or {})
                if kind == "error":
                    report.error(path, f"roles.{k}.source", "bad value", problem)
                    ok = False
                elif kind == "warning":
                    report.warn(path, f"roles.{k}.source", "bad value", problem)
    elif roles is not None:
        report.error(path, "roles", "bad value", "must be a mapping")
        ok = False
    # Extra ships fill no role and score nothing, so they are never validated: a wrong entry
    # only gets a warning and can't stop the layout being scored.
    extra = data.get("extraShips")
    if extra is not None and not isinstance(extra, list):
        report.warn(path, "extraShips", "bad value", "should be a list; ignored")
    elif extra:
        for i, e in enumerate(extra):
            where = f"extraShips[{i}]"
            if not isinstance(e, dict):
                report.warn(path, where, "bad value", "should be a mapping; ignored")
                continue
            sid = e.get("ship")
            if sid not in ships:
                report.warn(path, f"{where}.ship", "unknown ship id", f"{sid!r} has no ships/{sid}/ship_data.yaml")
            loc = e.get("location")
            if loc is not None and loc not in locations:
                report.warn(path, f"{where}.location", "bad value", f"{loc!r} is not a location this carrier has")
    return ok


# --------------------------------------------------------------------------- scoring

class Scorer:
    def __init__(self, rubric):
        self.r = rubric
        self.cats = rubric["categories"]

    def seat_score(self, seat):
        if seat.get("energyCapable") is False:
            return 0
        return sum(self.cats["defense"]["gunScore"][g] for g in seat["guns"])

    def best_seat(self, roles):
        seats = (roles.get("defense") or {}).get("seats", [])
        return max([self.seat_score(s) for s in seats] or [0])

    # Each line function returns the score given the carried ship roles (or None).
    def mining(self, n, c):
        lv = self.cats["mining"]["levels"]
        s = lv[n.get("mining", "none")]
        if c:
            s = max(s, lv[c.get("mining", "none")])
        return s

    def refining(self, n, c):
        cfg = self.cats["refining"]
        s = cfg["levels"][n.get("refining", "none")]
        if c and c.get("refining", "none") != "none":
            s = max(s, cfg["carriedRefineryScore"])
        return s

    def medical(self, n, c):
        cfg = self.cats["medical"]
        nm = n.get("medical") or {"level": "none", "beds": 0}
        s = cfg["levels"][nm["level"]]
        beds = nm["beds"]
        if c and c.get("medical"):
            s = max(s, cfg["levels"][c["medical"]["level"]])
            beds += c["medical"]["beds"]
        if s > 0 and beds >= 2:
            s += cfg["multipleBedsBonus"]
        return min(s, cfg["max"])

    def salvageRepair(self, n, c):
        cfg = self.cats["salvageRepair"]
        ns = n.get("salvageRepair") or {"level": "none", "repair": "none"}
        s = cfg["levels"][ns["level"]]
        if c and c.get("salvageRepair"):
            s = max(s, cfg["levels"][c["salvageRepair"]["level"]])
        s += cfg["repairBonus"][ns["repair"]]
        return min(s, cfg["max"])

    def manufacturing(self, n, c):
        lv = self.cats["manufacturing"]["levels"]
        s = lv[n.get("manufacturing", "none")]
        if c:
            s = max(s, lv[c.get("manufacturing", "none")])
        return s

    def defense(self, n, c, carrier_id):
        cfg = self.cats["defense"]
        s = min(self.best_seat(n), cfg["max"])
        if carrier_id in cfg["largeBases"]:
            return floor_half(min(s + cfg["largeBaseToughnessBonus"], cfg["max"]))
        if c and c.get("defense"):
            f = self.best_seat(c) * cfg["fighter"]["multiplier"] + cfg["fighter"]["offset"]
            s = max(s, min(f, cfg["max"]))
        return floor_half(s)

    def living(self, n):
        cfg = self.cats["livingQuarters"]
        lq = n.get("livingQuarters") or {"beds": 0, "recSpace": False}
        return min(lq["beds"] * cfg["perBed"], cfg["maxBedPoints"]) + (cfg["recSpace"] if lq["recSpace"] else 0)

    def hauler(self, n, c):
        m = (n.get("cargo") or {}).get("maneuverability", 0)
        if c and c.get("hauler"):
            m = max(m, c["cargo"]["maneuverability"])
        return min(m, self.cats["cargo"]["max"])

    def capacity(self, scu):
        cfg = self.cats["cargoCapacity"]
        if scu <= cfg["baseScu"]:
            return 0
        return floor_half(clamp(math.log2(scu / cfg["baseScu"]), 0, cfg["max"]))

    def commuter(self, n, c):
        cfg = self.cats["commuter"]
        s = cfg["native"] if n.get("commuter") else 0
        if c and c.get("commuter"):
            s = max(s, cfg["carried"])
        return s

    def exploration(self, n, c):
        lv = self.cats["exploration"]["levels"]
        s = lv[n.get("exploration", "none")]
        if c:
            s = max(s, lv[c.get("exploration", "none")])
        return s

    def line(self, cat, n, c, carrier_id):
        if cat == "defense":
            return self.defense(n, c, carrier_id)
        if cat == "livingQuarters":
            return self.living(n)
        if cat == "cargo":
            return self.hauler(n, c)
        return getattr(self, cat)(n, c)

    def score_layout(self, carrier_id, carrier, layout, ships, scenario):
        n = resolve(carrier["roles"], scenario)
        lines, sources = {}, {}
        aboard_cargo = 0
        physically = {k: 0 for k in LOCATIONS}

        def aboard(e):
            return not (scenario == "low" and e.get("fitsInLowCase") is False)

        for cat in ROLE_KEYS:
            e = layout["roles"][cat]
            sid = e.get("source", "native")
            if sid == NO_ROOM:
                lines[cat] = self.r["noRoom"]["score"]
                sources[cat] = NO_ROOM
                continue
            if sid == EXPERIMENTAL:
                # Counts only in the high case: the low case keeps what the base has today.
                without = self.line(cat, n, None, carrier_id)
                if scenario in self.r["experimental"]["countsIn"] and e["score"] > without:
                    lines[cat], sources[cat] = e["score"], EXPERIMENTAL
                else:
                    lines[cat], sources[cat] = without, "native"
                continue
            if sid == "native" or not aboard(e):
                lines[cat] = self.line(cat, n, None, carrier_id)
                sources[cat] = "native"
                continue
            # A ship in a required role is aboard and takes its cargo space; the role scores the
            # higher of the base's own and the ship's.
            c = resolve(ships[sid]["roles"], scenario)
            physically[e["location"]] += 1
            aboard_cargo += e["cargoScu"]
            with_ship = self.line(cat, n, c, carrier_id)
            without = self.line(cat, n, None, carrier_id)
            lines[cat] = max(with_ship, without)
            sources[cat] = sid if with_ship > without else "native"

        scu = max((n.get("cargo") or {}).get("scu", 0) - aboard_cargo, 0)
        lines["cargoCapacity"] = self.capacity(scu)
        sources["cargoCapacity"] = "native"

        tiers = self.r["tiers"]
        needed = sum(lines[c] for c in tiers["needed"]["categories"])
        desired = sum(lines[c] for c in tiers["desired"]["categories"])
        total = needed * tiers["needed"]["weight"] + desired * tiers["desired"]["weight"]
        return {"lines": lines, "sources": sources,
                "needed": needed, "desired": desired, "total": total,
                "cargoLeftScu": scu, "aboard": physically}


# --------------------------------------------------------------------------- editor helpers
#
# Used by scripts/editor.py. They read ship data held in memory and never write anything,
# so the leaderboard can't be affected by them.

def is_carrier(ship):
    """A ship can take layouts when it lists at least one location for carried ships."""
    locs = ship.get("locations")
    return isinstance(locs, list) and any(k in LOCATIONS for k in locs)


def native_layout():
    """A layout with every role built in and nothing carried."""
    return {"roles": {k: {"source": "native"} for k in ROLE_KEYS}, "extraShips": []}


def ship_stats(rubric, ship):
    """The facts about a ship that move its score, for the low and high case."""
    scorer = Scorer(rubric)
    out = {}
    for scen in SCENARIOS:
        n = resolve(ship.get("roles") or {}, scen)
        seats = (n.get("defense") or {}).get("seats", [])
        best = None
        for seat in seats:
            sc = scorer.seat_score(seat)
            if best is None or sc > best["score"]:
                best = {"name": seat.get("name"), "guns": list(seat.get("guns") or []), "score": sc,
                        "energyCapable": seat.get("energyCapable", True)}
        cargo = n.get("cargo") or {}
        lq = n.get("livingQuarters") or {}
        med = n.get("medical") or {}
        out[scen] = {
            "cargoScu": cargo.get("scu"),
            "maneuverability": cargo.get("maneuverability"),
            "beds": lq.get("beds"),
            "recSpace": lq.get("recSpace"),
            "medicalLevel": med.get("level"),
            "medicalBeds": med.get("beds"),
            "bestSeat": best,
            "locations": [k for k in LOCATIONS if k in (ship.get("locations") or [])],
            "hauler": bool(n.get("hauler")),
            "fighter": bool(n.get("fighter")),
        }
    return out


def carried_value(rubric, sid, ship):
    """What a ship adds to each role when a base with nothing built in carries it.

    Roles the ship can't fill are left out. Defense is the fighter score on a base outside
    the rubric's largeBases list; those large bases give carried fighters nothing.
    """
    scorer = Scorer(rubric)
    sroles = ship.get("roles") or {}
    out = {}
    for cat in ROLE_KEYS:
        kind, _ = carried_role_check(cat, sid, sroles)
        if kind is not None:
            continue
        vals = {}
        for scen in SCENARIOS:
            c = resolve(sroles, scen)
            if cat == "cargo":
                vals[scen] = (c.get("cargo") or {}).get("maneuverability", 0) or 0
            else:
                vals[scen] = scorer.line(cat, {}, c, "")
        out[cat] = vals
    return out


def ship_breakdown(rubric, sid, ship):
    """Score a ship on its own (built-in roles only) and list what it adds when carried."""
    scorer = Scorer(rubric)
    res = {s: scorer.score_layout(sid, ship, native_layout(), {sid: ship}, s) for s in SCENARIOS}
    return {"alone": layout_result(res), "carried": carried_value(rubric, sid, ship)}


def layout_result(res):
    """Low and high case results of score_layout, side by side, for the editor."""
    lo, hi = res["low"], res["high"]
    return {
        "total": {"low": lo["total"], "high": hi["total"]},
        "needed": {"low": lo["needed"], "high": hi["needed"]},
        "desired": {"low": lo["desired"], "high": hi["desired"]},
        "lines": {cat: {"low": lo["lines"][cat], "high": hi["lines"][cat],
                        "sources": {"low": lo["sources"][cat], "high": hi["sources"][cat]}}
                  for cat in LINE_ORDER},
        "cargoLeftScu": {"low": lo["cargoLeftScu"], "high": hi["cargoLeftScu"]},
        "aboard": {k: {"low": lo["aboard"][k], "high": hi["aboard"][k]} for k in LOCATIONS},
    }


# --------------------------------------------------------------------------- fingerprint

def fingerprint(paths):
    h = hashlib.sha256()
    for p in sorted(set(paths)):
        h.update(str(Path(p).relative_to(ROOT)).encode())
        h.update(b"\0")
        h.update(Path(p).read_bytes())
        h.update(b"\0")
    return h.hexdigest()[:16]


# --------------------------------------------------------------------------- main

def load_raw(report):
    """Read rubric.yaml, every ship_data.yaml and every layout from disk, without validating.

    Returns (rubric, raw_ships, raw_layouts, missing_folders):
      raw_ships   {ship id (folder name): (path, data)}
      raw_layouts [(path, carrier id, data)]
    A file that isn't valid YAML is reported and left out.
    """
    rubric = load_yaml(RUBRIC_PATH, report)
    if rubric is None:
        return None, {}, [], []
    raw_ships, raw_layouts, missing = {}, [], []
    for sd in sorted(SHIPS_DIR.glob("*/ship_data.yaml")):
        data = load_yaml(sd, report)
        if data is not None:
            raw_ships[sd.parent.name] = (sd, data)
    for folder in sorted(SHIPS_DIR.iterdir()):
        if folder.is_dir() and not (folder / "ship_data.yaml").exists():
            missing.append(folder)
    for lp in sorted(SHIPS_DIR.glob("*/layouts/*.yaml")):
        data = load_yaml(lp, report)
        if data is not None:
            raw_layouts.append((lp, lp.parent.parent.name, data))
    return rubric, raw_ships, raw_layouts, missing


def validate_all(rubric, raw_ships, raw_layouts, report, missing=()):
    """Validate ships and layouts held in memory (from load_raw, or edited by the editor).

    Returns (ships, ship_paths, layouts) holding only what passed validation.
    """
    ships, ship_paths, layouts = {}, {}, {}
    carriers_with_layouts = {carrier for _, carrier, _ in raw_layouts}
    for sid in sorted(raw_ships):
        sd, data = raw_ships[sid]
        if validate_ship(sd, data, rubric, report, sid in carriers_with_layouts):
            ships[sid] = data
            ship_paths[sid] = sd
        else:
            report.error(sd, "(file)", "not graded", "fix the errors above")
    for folder in missing:
        report.error(folder, "ship_data.yaml", "missing field", "every ship folder needs ship_data.yaml")
    for lp, carrier, data in sorted(raw_layouts, key=lambda t: str(t[0])):
        if carrier not in ships:
            report.error(lp, "carrier", "not graded", f"{carrier} ship_data.yaml is missing or has errors")
            continue
        if validate_layout(lp, data, carrier, ships, report, rubric):
            layouts.setdefault(carrier, []).append((lp, data))
        else:
            report.error(lp, "(file)", "not graded", "fix the errors above")
    return ships, ship_paths, layouts


def collect(report):
    rubric, raw_ships, raw_layouts, missing = load_raw(report)
    if rubric is None:
        return None, {}, {}, {}
    ships, ship_paths, layouts = validate_all(rubric, raw_ships, raw_layouts, report, missing)
    return rubric, ships, ship_paths, layouts


def score_both(scorer, carrier_id, carrier, layout, ships):
    """Score one layout in the low and high case."""
    return {s: scorer.score_layout(carrier_id, carrier, layout, ships, s) for s in SCENARIOS}


def build(rubric, ships, ship_paths, layouts, report):
    scorer = Scorer(rubric)
    script_path = Path(__file__).resolve()
    out_ships = []
    for carrier_id, items in layouts.items():
        carrier = ships[carrier_id]
        entries = []
        for lp, layout in items:
            res = score_both(scorer, carrier_id, carrier, layout, ships)
            referenced = [e.get("source") for e in layout["roles"].values()] + \
                         [e.get("ship") for e in layout.get("extraShips") or [] if isinstance(e, dict)]
            files = [RUBRIC_PATH, script_path, ship_paths[carrier_id], lp] + \
                    [ship_paths[s] for s in referenced if s in ship_paths]
            lines = {}
            for cat in LINE_ORDER:
                lo, hi = res["low"]["lines"][cat], res["high"]["lines"][cat]
                src_lo, src_hi = res["low"]["sources"][cat], res["high"]["sources"][cat]
                src = src_lo if src_lo == src_hi else f"{src_lo} / {src_hi}"
                lines[cat] = {"low": lo, "high": hi, "source": src,
                              "sources": {"low": src_lo, "high": src_hi}}
            entries.append({
                "layout": layout["layout"],
                "file": str(lp.relative_to(ROOT)),
                "description": layout["description"],
                "estimated": bool(layout["estimated"]) or has_range(carrier["roles"]) or
                             any(isinstance(e, dict) and e.get("source") == EXPERIMENTAL for e in layout["roles"].values()),
                "patch": layout["patch"],
                "total": {"low": res["low"]["total"], "high": res["high"]["total"]},
                "needed": {"low": res["low"]["needed"], "high": res["high"]["needed"]},
                "desired": {"low": res["low"]["desired"], "high": res["high"]["desired"]},
                "lines": lines,
                "cargoLeftScu": {"low": res["low"]["cargoLeftScu"], "high": res["high"]["cargoLeftScu"]},
                "roles": {k: layout_entry(layout["roles"][k], "source") for k in ROLE_KEYS},
                "extraShips": [extra_entry(e) for e in layout.get("extraShips") or [] if isinstance(e, dict)],
                "rubricVersion": rubric["rubricVersion"],
                "scriptVersion": SCRIPT_VERSION,
                "fingerprint": fingerprint(files),
            })
        if not entries:
            continue
        mid = lambda e: ((e["total"]["low"] + e["total"]["high"]) / 2, e["total"]["high"])
        entries.sort(key=mid, reverse=True)
        best = entries[0]
        out_ships.append({
            "id": carrier_id,
            "name": carrier["name"],
            "manufacturer": carrier["manufacturer"],
            "size": carrier["size"],
            "status": carrier["status"],
            "bestLayout": best["layout"],
            "total": best["total"],
            "layouts": entries,
        })
    out_ships.sort(key=lambda s: ((s["total"]["low"] + s["total"]["high"]) / 2, s["total"]["high"]), reverse=True)
    for i, s in enumerate(out_ships, 1):
        s["rank"] = i
    return {
        "rubricVersion": rubric["rubricVersion"],
        "scriptVersion": SCRIPT_VERSION,
        "categories": {k: v["displayName"] for k, v in rubric["categories"].items()},
        "categoryMax": {k: v.get("max") for k, v in rubric["categories"].items()},
        "tiers": {k: {"weight": v["weight"], "categories": list(v["categories"])}
                  for k, v in rubric["tiers"].items()},
        "rules": [{"id": r["id"], "categories": list(r["categories"]), "text": r["text"]}
                  for r in rubric.get("rules") or []],
        "shipInfo": {sid: ship_info(sid, d, ship_paths[sid]) for sid, d in sorted(ships.items())},
        "ships": out_ships,
        "validation": {"errors": report.errors, "warnings": report.warnings},
    }


def layout_entry(e, ship_key):
    """One role of a layout, as the viewer shows it."""
    if not isinstance(e, dict) or e.get(ship_key) == "native":
        return {"source": "native"}
    if e.get(ship_key) == NO_ROOM:
        return {"source": NO_ROOM}
    if e.get(ship_key) == EXPERIMENTAL:
        out = {"source": EXPERIMENTAL, "score": e["score"]}
        if e.get("note"):
            out["note"] = e["note"]
        return out
    out = {"source": e[ship_key], "location": e["location"], "cargoScu": e["cargoScu"],
           "fit": e.get("fit"), "patch": e.get("patch")}
    if "fitsInLowCase" in e:
        out["fitsInLowCase"] = e["fitsInLowCase"]
    return out


def extra_entry(e):
    """An extra ship as the viewer shows it. Extra ships aren't validated, so every field is optional."""
    out = {"source": e.get("ship")}
    out.update({k: e[k] for k in ("location", "cargoScu", "fit", "patch", "note") if k in e})
    return out


def ship_info(sid, d, path):
    """Facts the viewer needs about any ship, carried or carrier."""
    return {
        "name": d["name"],
        "manufacturer": d["manufacturer"],
        "size": d["size"],
        "status": d["status"],
        "patch": d.get("patch"),
        "file": str(Path(path).relative_to(ROOT)),
        "sources": list(d.get("sources") or []),
        "changes": [{"patch": c["patch"], "change": c["change"]} for c in d.get("changes") or []],
    }


def write_snapshot_index():
    """List rubricVersions/<version>/leaderboard.js files so the viewer can load them."""
    found = [p.parent.name for p in SNAPSHOTS_DIR.glob("*/leaderboard.js")]
    key = lambda v: tuple(int(x) if x.isdigit() else 0 for x in v.split("."))
    versions = sorted(found, key=key, reverse=True)
    SNAPSHOT_INDEX_PATH.write_text(
        "// Generated by scripts/score.py. Lists the results snapshots in this folder, newest first.\n"
        + SNAPSHOT_INDEX_PREFIX + json.dumps(versions) + ";\n", encoding="utf-8")
    return versions


def tidy(v):
    """Write whole-number floats as ints so the data file reads cleanly."""
    if isinstance(v, float) and v.is_integer():
        return int(v)
    if isinstance(v, dict):
        return {k: tidy(x) for k, x in v.items()}
    if isinstance(v, list):
        return [tidy(x) for x in v]
    return v


def fmt_range(r):
    lo, hi = r["low"], r["high"]
    f = lambda x: f"{x:g}"
    return f(lo) if lo == hi else f"{f(lo)}-{f(hi)}"


def print_table(results):
    print(f"Rubric {results['rubricVersion']}, script {results['scriptVersion']}")
    for s in results["ships"]:
        print(f"{s['rank']:>2}. {s['name']:<28} {fmt_range(s['total']):>11}  ({s['bestLayout']})")


def read_results():
    if not RESULTS_PATH.exists():
        return None
    text = RESULTS_PATH.read_text(encoding="utf-8")
    start = text.index(RESULTS_PREFIX) + len(RESULTS_PREFIX)
    return json.loads(text[start:].strip().rstrip(";"))


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--check", action="store_true", help="report stale or missing results; write nothing")
    ap.add_argument("--dry-run", action="store_true", help="score and print; write nothing")
    args = ap.parse_args(argv)

    report = Report()
    rubric, ships, ship_paths, layouts = collect(report)
    if rubric is None:
        print("\n".join("ERROR " + e for e in report.errors))
        return 1
    results = tidy(build(rubric, ships, ship_paths, layouts, report))

    for w in report.warnings:
        print("WARNING " + w)
    for e in report.errors:
        print("ERROR " + e)

    if args.check:
        old = read_results()
        if old is None:
            print("STALE results/leaderboard.js is missing")
            return 1
        old_fp = {(s["id"], l["layout"]): l["fingerprint"] for s in old["ships"] for l in s["layouts"]}
        new_fp = {(s["id"], l["layout"]): l["fingerprint"] for s in results["ships"] for l in s["layouts"]}
        stale = sorted(k for k in set(old_fp) | set(new_fp) if old_fp.get(k) != new_fp.get(k))
        for sid, lay in stale:
            print(f"STALE {sid}/{lay}")
        if not stale:
            print("Results are up to date.")
        return 1 if stale or report.errors else 0

    print_table(results)
    if not args.dry_run:
        RESULTS_PATH.parent.mkdir(parents=True, exist_ok=True)
        body = json.dumps(results, indent=2, ensure_ascii=False)
        RESULTS_PATH.write_text(
            "// Generated by scripts/score.py. Do not edit by hand; run the script instead.\n"
            + RESULTS_PREFIX + body + ";\n", encoding="utf-8")
        print(f"Wrote {RESULTS_PATH.relative_to(ROOT)}")
        versions = write_snapshot_index()
        print(f"Wrote {SNAPSHOT_INDEX_PATH.relative_to(ROOT)} ({len(versions)} snapshots)")
    return 1 if report.errors else 0


if __name__ == "__main__":
    sys.exit(main())
