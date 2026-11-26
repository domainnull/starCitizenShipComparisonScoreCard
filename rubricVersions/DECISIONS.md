# Rubric and script decisions

Newest first. Each entry says what changed, why, and which categories it touches.
Semver for both the rubric and the score script: **major** = old scores are not comparable,
**minor** = new rule or category, **patch** = fix. Each rubric version gets a git tag
`rubric-vX.Y.Z`. Keep the last 3-5 rubric versions in this folder, each with its results
snapshot.

## Rubric 3.0.0 / script 2.0.0 / editor 2.0.0 / viewer 2.0.0 (Nov 26 2026): no carrier score, locations, commuter 0 or 1, required roles

- **Carrier category removed** (carrier, cargo). Spare room was scored from hangar slot counts
  (1 per small slot up to 4, 2 per open pad, 2 per medium slot up to 6). The repo owner's call: room
  left is about cargo space, which each layout already records per carried ship (`cargoScu`), not
  hangar space. The cargo line's capacity half already scores cargo left after carried ships, so a
  separate spare-room line would count it twice; the carrier score is dropped instead (owner
  confirmed). Why: slot counts were set up before layouts existed, and a hangar holds however many
  ships its geometry allows, so a fixed count was a guess that penalised every role ship aboard.
- **Slots become locations** (all carried roles). `hangar: {smallSlot: 4, ...}` in ship data is now
  `locations: [hangar, cargoHold]`, from `hangar`, `pad`, `cargoHold` and `vehicleBay`, with no ship
  count. Layout entries say `location:` instead of `slot:`. Which ships fit together is a fact of the
  layout and its fit sources; the script no longer errors when a location holds "too many" ships.
  `cargoBay` (floor size and grid SCU) moved to the top level of ship data. Mapping used: small and
  medium slots to hangar or pad by where they are on the ship (Kraken upper platforms are pads),
  open pads to pad, the Polaris vehicle area to cargo hold (owner's words), the Ironclads' small
  slots to cargo hold (ships ride in the cargo bay), other vehicle bays stay vehicle bays.
- **Shuttle is 0 or 1 and needed** (commuter). It was desired, 10 native or 5 carried (x0.5). Now
  it is a needed line worth 1 when the base has a commuter, built in or carried. A base without one
  still ranks; it just misses the point. The Ironclad command module still earns nothing.
- **Required roles and No room** (all needed roles). Every needed role must be filled by the base
  itself, a carried ship or `source: noRoom`, which scores 0 in that role (owner's call: 0, not -1).
  Leaving a role as built in when the base has nothing built in for it is a validation error. Why:
  an empty role used to be silent, so a layout couldn't say "there's no space left for this" apart
  from "nobody looked". The Odyssey's salvage line, which had nothing built in and no ship, is now
  marked No room; its score didn't change.
- **Extra bay space removed** (cargo). The old idea that a role ship adding nothing over built in
  takes no cargo is gone: a ship in a role is aboard and its `cargoScu` always comes off the cargo.
  No current layout had such a ship, so no score moved.
- **Extra ships** (all). `extraShips` is its own section with the same fields as a role entry
  (ship, location, cargo use, fit, patch) plus a `note`. Extra ships score nothing, cargo included,
  and aren't validated: an unknown ship or location there is a warning, never an error.
- **Estimated flag**: a layout is estimated when its file says so or the carrier's roles hold a
  range. Hangar count ranges are gone, so the Liberator's tested layout is no longer a range.
- **Script 2.0.0** (major): no `carrier` line; layout entries carry `location` instead of `slot`;
  the editor helpers return `aboard` (ships per location) instead of slot counts. **Viewer 2.0.0**
  reads script 2.x results and still shows older snapshots' slot names. **Editor 2.0.0**: ships pick
  their locations with checkboxes, layouts pick a location per ship with no limit.
- The 2.0.0 rubric and its results are kept in `rubricVersions/2.0.0/`.

Leaderboard, best layout, 2.0.0 then 3.0.0:

| Ship | 2.0.0 | 3.0.0 |
|---|---|---|
| RSI Polaris | 27 (3rd) | 24.5 (1st) |
| Aegis Idris-P | 28.5 (2nd) | 23 (2nd) |
| Drake Kraken | 25.5-34.5 (1st) | 20-25 (3rd) |
| Drake Ironclad Assault | 20.5-24.5 (4th) | 19-22 (4th) |
| MISC Odyssey | 19.5-23.5 (6th) | 18-22 (5th) |
| RSI Galaxy (Med Bay) | 18.5-23 (7th) | 17-21.5 (6th) |
| Anvil Liberator | 22-23 (5th) | 17.5 (7th) |
| Drake Ironclad | 13.5-16.5 (8th) | 12-14 (8th) |

No base now scores lower with its role ships aboard than with nothing carried (under 2.0.0 the
Kraken and Ironclad did).

## Script 1.2.0 / editor 1.0.0 (Nov 26 2026): ship data and layout editor

- **Editor 1.0.0**: `uv run scripts/editor.py` serves `editor/` on 127.0.0.1 and writes
  `ships/<id>/ship_data.yaml` and `ships/<id>/layouts/<name>.yaml`. It never writes `rubric.yaml`;
  the leaderboard updates only when you press Update leaderboard. Why a local server and not a page
  opened from disk: a page can't save into the repo, and a JavaScript copy of the rules could drift
  from this script. The editor scores nothing itself.
- **Script 1.2.0** (minor, no score or output change): `collect` is split into `load_raw` and
  `validate_all` so the editor can validate ships and layouts held in memory before saving them.
  New helpers for the editor: `carried_role_check` (the validator's rule for which ship can fill a
  role, now shared), `score_both`, `is_carrier`, `ship_stats`, `carried_value`, `ship_breakdown`
  (a ship scored with nothing carried) and `layout_result`. `score_layout` also returns slot counts.
  `results/leaderboard.js` gains no fields.
- Scores checked unchanged: the results file is identical to 1.1.0's apart from `scriptVersion`
  and the fingerprints, which change because they include `scripts/score.py`.

## Script 1.1.0 / viewer 1.0.0 (Nov 26 2026): leaderboard viewer

- **Viewer 1.0.0**: `index.html` with `viewer/viewer.js` and `viewer/viewer.css`. Leaderboard, ship
  page with its best layout, compare with an older rubric, stale and estimated badges. No libraries,
  no server, works from file:// and GitHub Pages, light and dark mode, phone width.
- **Script 1.1.0** (minor, new output fields only): each layout now carries `roles` (which ship fills
  each role, slot, `cargoScu`, fit source, patch) and `extraShips`; each line adds `sources` with the
  low and high case apart. The file adds `categoryMax`, `tiers`, `rules` and `shipInfo` (name,
  maker, size, status, patch, data file, sources and patch changes for every ship). A normal run also
  writes `rubricVersions/index.js`, the list of snapshots the viewer loads.
- No score changed. Every fingerprint changed because the fingerprint includes `scripts/score.py`.
- `rubricVersions/1.3.0/leaderboard.js` added so the viewer can compare against 1.3.0. It holds
  the same hand-scored totals as `leaderboard.md` in that folder, with no layouts.

## Tooling (Nov 26 2026): uv environment

- The scorer now runs in a uv-managed environment: `pyproject.toml` pins PyYAML 6.0.3, `uv.lock`
  locks it, `.python-version` sets Python 3.13, and `scripts/run.sh` syncs and runs in one step.
  `requirements.txt` is exported from the lock so plain pip still works.
- No version bump: `rubric.yaml` and `scripts/score.py` are unchanged, so scores and fingerprints
  are the same.

## Rubric 2.0.0 / script 1.0.0 (Nov 26 2026): loadout scoring

- **Layouts decide carried roles** (all carried categories, carrier). Carried roles now count only
  from one layout in `ships/<id>/layouts/`, whose ships fit together. A ship ranks by its best layout.
  Why: the doc scored "could carry" ships one at a time, so a base could get credit for ships that
  never fit at once. Layouts are written by hand; a generator is a separate issue.
- **Cargo footprint replaces the flat x0.5 shared-space cut** (cargo, carrier). A layout records how
  much cargo space each carried ship takes up, and capacity is scored on what is left. Carrier is
  scored on slots left, like every other base. Why: the x0.5 was a stand-in until layouts existed.
- **Spare-room rule applied per case** (carrier). A carried ship counts as a role ship only where
  removing it would lower that role's score; otherwise its slot stays spare. With ranges this is
  checked separately for the low and high case.
- **Carried hauler** (cargo). Manoeuvrability is the higher of the base's own and 0.5 x a carried
  hauler's. The Golem OX is scored as a hauler.
- **Capacity formula written down** (cargo). 0 points at 200 SCU or less, rising evenly to 5 at
  800 SCU, rounded down to the half point.
- **Polaris-and-larger list kept by id** (defense): Polaris, Idris-P, Kraken. It does not follow
  CIG size.
- Major bump: Ironclad and Ironclad Assault scores are not comparable with 1.3.0.

## Rubric 1.3.0 (Nov 26 2026)

- Shared hangar and cargo (carrier, cargo): a base whose hangar is also its cargo hold scores carrier
  and cargo capacity at x0.5. Applied to both Ironclads only.
- Command module earns no shuttle points (commuter).

## Rubric 1.2.0 (Nov 26 2026)

- Carried fighter = 2 x its gun score - 0.5 (defense). Polaris, Idris-P and Kraken get +1 toughness
  on their own seat and no credit for carried fighters, whose space counts as spare.

## Rubric 1.1.0 (Nov 26 2026)

- Carried fighters take full value in defense, no x0.8 (defense).

## Rubric 1.0.0 (Nov 25 2026)

- Weighted rubric: needed lines x1, desired x0.5, lines 0-5, carried role ships x0.8 rounded down
  (minimum 1, mining 0.5), cargo 0-10, shuttle 5 carried / 10 native. Replaced the earlier
  0-3 scale out of 54 points.
