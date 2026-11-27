#!/usr/bin/env python3
"""Local ship data and layout editor.

Usage:
    uv run scripts/editor.py              # serve http://127.0.0.1:8765/ and open it in a browser
    uv run scripts/editor.py --port 9000  # another port
    uv run scripts/editor.py --no-browser # don't open a browser tab

Serves editor/ on your own computer only (127.0.0.1). The page reads ship and layout YAML through
this script, which checks every change with the same validator and scorer as scripts/score.py
before writing ships/<id>/ship_data.yaml or ships/<id>/layouts/<name>.yaml. It never writes
rubric.yaml; results/leaderboard.js changes only when you press "Update leaderboard", which runs
scripts/score.py.

Standard library plus PyYAML (already pinned for the scorer); nothing else to install.

Versioning (semver): major = data format change, minor = new screen or feature, patch = fix.
Bump EDITOR_VERSION with every change to this file or the editor/ folder.
"""
from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
import threading
import webbrowser
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

import yaml

sys.path.insert(0, str(Path(__file__).resolve().parent))
import score  # noqa: E402  (scripts/score.py)

EDITOR_VERSION = "3.0.0"

ROOT = score.ROOT
SHIPS_DIR = score.SHIPS_DIR
STATIC_DIR = ROOT / "editor"
STATIC_TYPES = {".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
                ".css": "text/css; charset=utf-8"}
LAYOUT_NAME_RE = re.compile(r"^[a-z][A-Za-z0-9]*$")
WRITE_LOCK = threading.Lock()

SHIP_HEADER = "# {name}. Numbers come from the linked sources; text is our own.\n"
LAYOUT_HEADER = "# Layout: which ship covers each role. Scores are written to results/, not here.\n"

# Key order the data files use, so a saved file reads like the hand-written ones.
SHIP_ORDER = ["id", "name", "manufacturer", "size", "cigSize", "sizeOverride", "status", "patch",
              "dimensions", "carrierSize", "roles", "repair", "locations", "cargoBay", "notes", "sources", "changes"]
ROLE_ORDER = score.ROLE_KEYS + ["hauler", "fighter"]
LAYOUT_ORDER = ["layout", "carrier", "description", "estimated", "patch", "cargoScuMethod", "roles", "extraShips"]
ENTRY_ORDER = ["source", "ship", "location", "cargoScu", "fit", "patch", "fitsInLowCase", "score", "note"]
MANUFACTURER_NAMES = {
    "AEGS": "Aegis", "ANVL": "Anvil", "ARGO": "Argo", "BANU": "Banu", "CNOU": "Consolidated Outland",
    "CRUS": "Crusader", "DRAK": "Drake", "ESPR": "Esperia", "GAMA": "Gatac", "GRIN": "Greycat",
    "KRIG": "Kruger", "MISC": "MISC / Mirai", "ORIG": "Origin", "RSI": "RSI", "TMBL": "Tumbril",
    "XNAA": "Aopoa",
}


# --------------------------------------------------------------------------- YAML writing

class _Dumper(yaml.SafeDumper):
    """Writes in the repo's style: short mappings and lists inline, everything else as blocks."""


def _scalar(v):
    return not isinstance(v, (dict, list))


def _rep_dict(dumper, data):
    flow = len(data) <= 3 and all(_scalar(v) for v in data.values())
    return dumper.represent_mapping("tag:yaml.org,2002:map", data, flow_style=flow)


def _rep_list(dumper, data):
    flow = all(_scalar(v) and len(str(v)) <= 12 for v in data)
    return dumper.represent_sequence("tag:yaml.org,2002:seq", data, flow_style=flow)


_Dumper.add_representer(dict, _rep_dict)
_Dumper.add_representer(list, _rep_list)


def ordered(d, order):
    """Copy of d with the keys in `order` first, then any others as they came."""
    if not isinstance(d, dict):
        return d
    out = {k: d[k] for k in order if k in d}
    out.update({k: v for k, v in d.items() if k not in out})
    return out


def tidy_ship(ship):
    ship = ordered(ship, SHIP_ORDER)
    if isinstance(ship.get("roles"), dict):
        ship["roles"] = ordered(ship["roles"], ROLE_ORDER)
    return ship


def tidy_layout(layout):
    layout = ordered(layout, LAYOUT_ORDER)
    if isinstance(layout.get("roles"), dict):
        layout["roles"] = {k: ordered(layout["roles"][k], ENTRY_ORDER)
                           for k in score.ROLE_KEYS + [k for k in layout["roles"] if k not in score.ROLE_KEYS]
                           if k in layout["roles"]}
    if isinstance(layout.get("extraShips"), list):
        layout["extraShips"] = [ordered(e, ENTRY_ORDER) for e in layout["extraShips"]]
    return layout


def header_of(path, default):
    """Keep the comment lines at the top of an existing file; new files get the standard one."""
    if path.exists():
        lines = []
        for line in path.read_text(encoding="utf-8").splitlines(True):
            if not line.startswith("#"):
                break
            lines.append(line)
        if lines:
            return "".join(lines)
    return default


def write_if_changed(path, data, header):
    """Write the file unless it already holds exactly this data (so a no-op save leaves git clean)."""
    if path.exists():
        try:
            if yaml.safe_load(path.read_text(encoding="utf-8")) == data:
                return False
        except yaml.YAMLError:
            pass
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(dump(data, header), encoding="utf-8")
    return True


def dump(data, header):
    return header + yaml.dump(data, Dumper=_Dumper, sort_keys=False, allow_unicode=True, width=120)


# --------------------------------------------------------------------------- checking

def ship_path(sid):
    return SHIPS_DIR / sid / "ship_data.yaml"


def layout_path(carrier, name):
    return SHIPS_DIR / carrier / "layouts" / f"{name}.yaml"


def run_checks(raw_ships, raw_layouts, missing):
    """Validate and score everything held in memory. Returns (report, rubric parts, scored layouts)."""
    report = score.Report()
    rubric = load_rubric()
    ships, ship_paths, layouts = score.validate_all(rubric, raw_ships, raw_layouts, report, missing)
    scorer = score.Scorer(rubric)
    scored = {}
    for carrier_id, items in layouts.items():
        for lp, layout in items:
            res = score.score_both(scorer, carrier_id, ships[carrier_id], layout, ships)
            scored[(carrier_id, layout.get("layout"))] = {"result": score.layout_result(res)}
    return report, rubric, ships, scored


def load_rubric():
    rep = score.Report()
    rubric = score.load_yaml(score.RUBRIC_PATH, rep)
    if rubric is None:
        raise RuntimeError("; ".join(rep.errors))
    return rubric


def load_disk():
    report = score.Report()
    rubric, raw_ships, raw_layouts, missing = score.load_raw(report)
    if rubric is None:
        raise RuntimeError("; ".join(report.errors))
    return report, raw_ships, raw_layouts, missing


def rel(path):
    return str(Path(path).relative_to(ROOT))


def new_messages(before, after):
    return [m for m in after if m not in set(before)]


def check_change(raw_ships, raw_layouts, missing, edited_files, load_errors):
    """Compare a proposed change against what's on disk now.

    Blocks the save when the edited file has any error, or when the change adds an error anywhere
    else (a ship edit can break a layout that uses the ship). Errors already on disk elsewhere
    don't block it.
    """
    _, base_ships, base_layouts, base_missing = load_disk()
    base_report, _, _, _ = run_checks(base_ships, base_layouts, base_missing)
    report, rubric, ships, scored = run_checks(raw_ships, raw_layouts, missing)
    errors = list(load_errors)
    for e in report.errors:
        if any(e.startswith(f + ":") for f in edited_files) or e not in base_report.errors:
            errors.append(e)
    warnings = [w for w in report.warnings if any(w.startswith(f + ":") for f in edited_files)]
    return errors, warnings, rubric, ships, scored


# --------------------------------------------------------------------------- state for the page

def rubric_info(rubric):
    cats = rubric["categories"]
    return {
        "rubricVersion": rubric["rubricVersion"],
        "scriptVersion": score.SCRIPT_VERSION,
        "editorVersion": EDITOR_VERSION,
        "roleKeys": score.ROLE_KEYS,
        "lineOrder": score.LINE_ORDER,
        "locations": score.LOCATIONS,
        "manufacturers": {k: MANUFACTURER_NAMES.get(k, k) for k in sorted(score.MANUFACTURERS)},
        "categories": {k: {"displayName": v["displayName"], "max": v.get("max"),
                           "levels": list((v.get("levels") or {}).keys())} for k, v in cats.items()},
        "repair": {"max": cats["repair"]["max"], "default": cats["repair"]["default"]},
        "salvage": {"perHead": cats["salvageRepair"]["perHead"], "maxHeads": cats["salvageRepair"]["maxHeads"],
                    "tractorBeam": cats["salvageRepair"]["tractorBeam"],
                    "materialGrades": list(cats["salvageRepair"]["materialGrade"].keys())},
        "gunSizes": list(cats["defense"]["gunScore"].keys()),
        "weaponTypes": cats["defense"]["weaponTypes"],
        "miningModule": cats["mining"]["passiveModuleMultiplier"],
        "bespokeAmmoPenalty": cats["defense"]["bespokeAmmoPenalty"],
        "radarSizes": list(cats["exploration"]["radarScore"].keys()),
        "maneuverabilityMax": cats["cargo"]["maneuverabilityMax"],
        "largeBases": list(cats["defense"].get("largeBases") or []),
        "noRoomScore": rubric["noRoom"]["score"],
        "extraShipScore": cats["extraShips"]["perShip"],
        "tiers": {k: {"weight": v["weight"], "categories": list(v["categories"])} for k, v in rubric["tiers"].items()},
    }


def state():
    load_report, raw_ships, raw_layouts, missing = load_disk()
    report, rubric, ships, scored = run_checks(raw_ships, raw_layouts, missing)
    all_errors = load_report.errors + report.errors
    all_warnings = load_report.warnings + report.warnings
    out = []
    for sid in sorted(raw_ships):
        path, data = raw_ships[sid]
        f = rel(path)
        entry = {
            "id": sid,
            "data": data,
            "file": f,
            "valid": sid in ships,
            "errors": [e for e in all_errors if e.startswith(f + ":")],
            "warnings": [w for w in all_warnings if w.startswith(f + ":")],
            "isCarrier": score.is_carrier(data) if isinstance(data, dict) else False,
            "layouts": [],
        }
        if sid in ships:
            entry["stats"] = score.ship_stats(rubric, data)
            entry["breakdown"] = score.ship_breakdown(rubric, sid, data)
        for lp, carrier, ldata in raw_layouts:
            if carrier != sid:
                continue
            lf = rel(lp)
            s = scored.get((sid, ldata.get("layout") if isinstance(ldata, dict) else None))
            entry["layouts"].append({
                "name": lp.stem,
                "file": lf,
                "data": ldata,
                "errors": [e for e in all_errors if e.startswith(lf + ":")],
                "warnings": [w for w in all_warnings if w.startswith(lf + ":")],
                "score": s["result"] if s else None,
            })
        out.append(entry)
    other_errors = [e for e in all_errors if not any(e.startswith(s["file"] + ":") for s in out)
                    and not any(e.startswith(l["file"] + ":") for s in out for l in s["layouts"])]
    return {"rubric": rubric_info(rubric), "ships": out, "otherErrors": other_errors}


# --------------------------------------------------------------------------- requests

class BadRequest(Exception):
    pass


def parse_body_object(body, key):
    """The page sends either a JSON object or YAML text (from the "Edit as YAML" box)."""
    if "yaml" in body:
        try:
            data = yaml.safe_load(body["yaml"])
        except yaml.YAMLError as e:
            return None, [f"(YAML box): not valid YAML: {e}"]
        if not isinstance(data, dict):
            return None, ["(YAML box): top level must be a mapping"]
        return data, []
    data = body.get(key)
    if not isinstance(data, dict):
        raise BadRequest(f"send {key} as an object")
    return data, []


def ship_request(body, save):
    data, load_errors = parse_body_object(body, "ship")
    is_new = bool(body.get("isNew"))
    _, raw_ships, raw_layouts, missing = load_disk()
    if data is None:
        return {"ok": False, "errors": load_errors, "warnings": []}
    data = tidy_ship(data)
    sid = data.get("id")
    if not isinstance(sid, str) or not score.SHIP_ID_RE.match(sid):
        return {"ok": False, "errors": ["id: bad value (ship id must be manufacturer code + S/L/C + Name, "
                                        "e.g. anvlLLiberator)"], "warnings": [], "ship": data}
    original = body.get("originalId")
    if is_new and (sid in raw_ships or (SHIPS_DIR / sid).exists()):
        return {"ok": False, "errors": [f"id: bad value ({sid} already exists)"], "warnings": [], "ship": data}
    if not is_new and original != sid:
        return {"ok": False, "errors": ["id: bad value (a ship's id can't change in the editor; it names its folder "
                                        "and every layout that uses it)"], "warnings": [], "ship": data}
    path = ship_path(sid)
    raw_ships = dict(raw_ships)
    raw_ships[sid] = (path, data)
    missing = [m for m in missing if m.name != sid]
    errors, warnings, rubric, ships, _ = check_change(raw_ships, raw_layouts, missing, [rel(path)], load_errors)
    result = {"ok": not errors, "errors": errors, "warnings": warnings, "ship": data,
              "isCarrier": score.is_carrier(data)}
    if sid in ships:
        result["stats"] = score.ship_stats(rubric, data)
        result["breakdown"] = score.ship_breakdown(rubric, sid, data)
    if save and not errors:
        with WRITE_LOCK:
            result["written"] = write_if_changed(path, data, header_of(path, SHIP_HEADER.format(name=data.get("name", sid))))
        result["saved"] = rel(path)
    return result


def layout_request(body, save):
    data, load_errors = parse_body_object(body, "layout")
    carrier = body.get("carrier")
    is_new = bool(body.get("isNew"))
    _, raw_ships, raw_layouts, missing = load_disk()
    if not isinstance(carrier, str) or carrier not in raw_ships:
        raise BadRequest("unknown carrier")
    if data is None:
        return {"ok": False, "errors": load_errors, "warnings": []}
    data = tidy_layout(data)
    name = data.get("layout")
    if not isinstance(name, str) or not LAYOUT_NAME_RE.match(name):
        return {"ok": False, "errors": ["layout: bad value (name must be camelCase letters and digits, "
                                        "starting lower case, e.g. inGameLoadout)"], "warnings": [], "layout": data}
    path = layout_path(carrier, name)
    exists = any(lp == path for lp, _, _ in raw_layouts)
    if is_new and exists:
        return {"ok": False, "errors": [f"layout: bad value ({name} already exists for this ship)"],
                "warnings": [], "layout": data}
    if not is_new and body.get("originalName") != name:
        return {"ok": False, "errors": ["layout: bad value (a layout's name can't change in the editor; "
                                        "save it as a new layout instead)"], "warnings": [], "layout": data}
    raw_layouts = [t for t in raw_layouts if t[0] != path] + [(path, carrier, data)]
    errors, warnings, rubric, ships, scored = check_change(raw_ships, raw_layouts, missing, [rel(path)], load_errors)
    s = scored.get((carrier, name))
    result = {"ok": not errors, "errors": errors, "warnings": warnings, "layout": data,
              "score": s["result"] if s else None}
    if carrier in ships:
        result["alone"] = score.ship_breakdown(rubric, carrier, ships[carrier])["alone"]
    if save and not errors:
        with WRITE_LOCK:
            result["written"] = write_if_changed(path, data, header_of(path, LAYOUT_HEADER))
        result["saved"] = rel(path)
    return result


def yaml_request(body):
    """Turn form data into the YAML the file would hold, for the "Edit as YAML" box."""
    data = body.get("data")
    if not isinstance(data, dict):
        raise BadRequest("send data as an object")
    kind = body.get("kind")
    if kind == "ship":
        return {"yaml": dump(tidy_ship(data), "")}
    if kind == "layout":
        return {"yaml": dump(tidy_layout(data), "")}
    raise BadRequest("kind must be ship or layout")


def run_scorer(args):
    proc = subprocess.run([sys.executable, str(ROOT / "scripts" / "score.py")] + args,
                          cwd=ROOT, capture_output=True, text=True, timeout=120)
    return {"exitCode": proc.returncode, "output": (proc.stdout + proc.stderr).strip()}


def leaderboard_status():
    r = run_scorer(["--check"])
    stale = [line[6:] for line in r["output"].splitlines() if line.startswith("STALE ")]
    return {"upToDate": r["exitCode"] == 0, "stale": stale, "output": r["output"]}


class Handler(BaseHTTPRequestHandler):
    server_version = f"ShipEditor/{EDITOR_VERSION}"

    def log_message(self, fmt, *args):  # keep the terminal quiet apart from errors
        try:
            if int(args[1]) < 400:
                return
        except (IndexError, TypeError, ValueError):
            pass
        super().log_message(fmt, *args)

    def host_ok(self):
        """Refuse requests addressed to another host name (guards against DNS rebinding)."""
        port = self.server.server_address[1]
        return self.headers.get("Host", "") in (f"127.0.0.1:{port}", f"localhost:{port}")

    def send_json(self, obj, status=HTTPStatus.OK):
        body = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if not self.host_ok():
            return self.send_error(HTTPStatus.FORBIDDEN)
        path = self.path.split("?", 1)[0]
        try:
            if path == "/api/state":
                return self.send_json(state())
            if path == "/api/leaderboard":
                return self.send_json(leaderboard_status())
        except Exception as e:  # report, don't crash the server
            return self.send_json({"error": str(e)}, HTTPStatus.INTERNAL_SERVER_ERROR)
        if path == "/":
            path = "/index.html"
        name = path.lstrip("/")
        target = (STATIC_DIR / name).resolve()
        if target.parent != STATIC_DIR.resolve() or target.suffix not in STATIC_TYPES or not target.is_file():
            return self.send_error(HTTPStatus.NOT_FOUND)
        body = target.read_bytes()
        self.send_response(HTTPStatus.OK)
        self.send_header("Content-Type", STATIC_TYPES[target.suffix])
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def do_POST(self):
        # Only the editor page itself may post: JSON only (a cross-site form can't send it
        # without permission), and the Origin, when sent, must be this server.
        if not self.host_ok():
            return self.send_json({"error": "wrong host"}, HTTPStatus.FORBIDDEN)
        if not self.headers.get("Content-Type", "").startswith("application/json"):
            return self.send_json({"error": "send JSON"}, HTTPStatus.UNSUPPORTED_MEDIA_TYPE)
        origin = self.headers.get("Origin")
        host = self.headers.get("Host", "")
        if origin and origin not in (f"http://{host}",):
            return self.send_json({"error": "wrong origin"}, HTTPStatus.FORBIDDEN)
        try:
            length = int(self.headers.get("Content-Length", "0"))
            body = json.loads(self.rfile.read(length) or b"{}")
            if not isinstance(body, dict):
                raise BadRequest("send a JSON object")
            routes = {
                "/api/ship/check": lambda: ship_request(body, save=False),
                "/api/ship/save": lambda: ship_request(body, save=True),
                "/api/layout/check": lambda: layout_request(body, save=False),
                "/api/layout/save": lambda: layout_request(body, save=True),
                "/api/yaml": lambda: yaml_request(body),
                "/api/leaderboard/update": lambda: run_scorer([]),
            }
            route = routes.get(self.path)
            if route is None:
                return self.send_json({"error": "not found"}, HTTPStatus.NOT_FOUND)
            return self.send_json(route())
        except (BadRequest, json.JSONDecodeError, ValueError) as e:
            return self.send_json({"error": str(e)}, HTTPStatus.BAD_REQUEST)
        except Exception as e:
            return self.send_json({"error": f"{type(e).__name__}: {e}"}, HTTPStatus.INTERNAL_SERVER_ERROR)


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--port", type=int, default=8765, help="port to serve on (default 8765)")
    ap.add_argument("--no-browser", action="store_true", help="don't open a browser tab")
    args = ap.parse_args(argv)
    server = ThreadingHTTPServer(("127.0.0.1", args.port), Handler)
    url = f"http://127.0.0.1:{args.port}/"
    print(f"Ship editor {EDITOR_VERSION} on {url} (Ctrl+C to stop). Only this computer can reach it.")
    if not args.no_browser:
        threading.Timer(0.5, lambda: webbrowser.open(url)).start()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopped.")
    finally:
        server.server_close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
