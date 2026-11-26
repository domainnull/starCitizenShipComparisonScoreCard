# Rubric and script decisions

Newest first. Each entry says what changed, why, and which categories it touches.
Semver for both the rubric and the score script: **major** = old scores are not comparable,
**minor** = new rule or category, **patch** = fix. Each rubric version gets a git tag
`rubric-vX.Y.Z`. Keep the last 3-5 rubric versions in this folder, each with its results
snapshot.

## Rubric 3.0.0 / script 2.0.0 / editor 2.0.0 / viewer 2.0.0 (Nov 26 2026): no carrier score, locations, commuter 0 or 1, required roles, cargo split, full-value carried ships, theoretical roles, exploration

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
- **Cargo split in two** (cargo, cargoCapacity). The old 0-10 cargo line mixed the hauling role
  with hold size. Now **cargo hauler** (layout key still `cargo`) is a required role, 0-5: the
  manoeuvrability of whatever moves the cargo, the base or a carried hauler at full value (the old
  0.5 on carried haulers is gone). **Cargo capacity** is a needed line, 0-5, that no layout fills:
  0 at 100 SCU or less, then 1 point per doubling (200 SCU 1, 400 2, 800 3, 1600 4, 3200 or more 5)
  after role ships take their cargo space. Owner's call to split them; both scales are proposals
  the owner can change. Why doubling: the old capacity half flattened every hold over 800 SCU, so a
  3,792 SCU Kraken and an 800 SCU ship scored the same. Since capacity isn't a role, No room on the
  hauler no longer zeroes the base's own hold.
- **Starter layouts get the Golem OX as hauler**. The Idris-P, Kraken, Ironclad and Ironclad
  Assault have manoeuvrability 0, so "built in" isn't allowed for the hauler role any more. Their
  estimated starter layouts now carry the Golem OX, as the tested Liberator and Polaris layouts do,
  with cargo taken estimated as the Golem's on the Ironclads. Set it to No room if that's wrong.
- **Carried ships score full value** (mining, medical, salvageRepair, manufacturing). The x0.8 with
  its minimum of 1 (0.5 for mining) is removed. Owner's words: leaning on native already shows up as
  better use of hangar space. Steps that still favour built in, left as they are: refining (5 or 4
  built in, 3 carried) and defense (a carried fighter scores 2 x its gun - 0.5 and nothing on
  large bases, built in gets +1 there). Shuttle is 1 either way.
- **Hold-size scale approved** by the owner as proposed. Hauler scoring stays on manoeuvrability
  for now; a future score from max cargo, container size and ease of loading is issue #7 (the
  Golem OX takes 32 SCU containers where the Hull A, with the same 64 SCU, can't).
- **Theoretical option** (every required role). `source: theoretical` with a `score` from 0 to
  the role's max, set by the owner (a slider in the editor), and an optional `note`, for a
  capability no ship has in game yet. It is handled as theoretical values were before: it counts
  only in the high case (low = the built-in line, high = the larger of that and the score), so the
  low case is never self-graded, and a layout with one is estimated. (Briefly called "experimental"
  during this round; the owner confirmed theoretical is the name.)
- **Living quarters stay a required role, and a carried ship can fill it** (livingQuarters), so a
  luxury ship can be the quarters. The line is the larger of the base's own beds and rec space and
  the carried ship's, and the ship needs living-quarters data. Owner's words: "I agree with the
  living quarters staying as a required role, this makes more sense."
- **Engineering dropped** (engineering). It came from the owner's Nov 24 role list as a desired
  "dedicated engineering ship, if one is announced". No ship or gameplay loop exists, and every base
  scored 0, so no total moved. Owner: "Let's drop the engineering role."
- **Exploration is a required role** at full weight, a placeholder until the gameplay exists. The
  line is the larger of two things. The low end is the ship's radar component size, a stand-in for
  scanning (owner's idea): size 1 = 1, 2 = 1.5, 3 = 2, 4 = 2.5, from scunpacked-data's ships.json
  loadout (the `Radar.*` item's installed size; grade isn't counted). Every ship has a radar, so
  every base scores at least 1, and a radar alone stays under a dedicated scout. The high end adds
  what a ship is marketed for: explorer 5, scout 3. A marketed level that isn't in game goes in as
  a range from none (`level: {low: none, high: explorer}`), so it counts in the high case only,
  as theoretical values do. Ship data: `exploration: {radarSize, level}`. Radar sizes: Polaris 4;
  Idris-P, Galaxy, Ironclad and Ironclad Assault 3; Liberator 2; Kraken and Odyssey (concepts, not
  in game data) estimated 3 to 4. Only the Odyssey gets the explorer uplift; the Carrack is
  marketed for exploration too but isn't a base in this repo. Defense scores only gun size and
  count, so radar doesn't count twice. The steps are proposals. The desired tier is now empty; its
  0.5 weight is kept for later.
- **Deferred and theoretical items are tracked as issues**: #7 hauler score, #8 exploration rework,
  #9 radar-based exploration, #14 gathering radar strength, #10 refining, #11 salvage and repair, #12 manufacturing, #13 concept
  ships and estimated layouts.
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
| Drake Kraken | 25.5-34.5 (1st) | 27-31.5 (1st) |
| RSI Polaris | 27 (3rd) | 29 (2nd) |
| Aegis Idris-P | 28.5 (2nd) | 27.5 (3rd) |
| Drake Ironclad Assault | 20.5-24.5 (4th) | 25.5-28.5 (4th) |
| MISC Odyssey | 19.5-23.5 (6th) | 21-28 (5th) |
| Anvil Liberator | 22-23 (5th) | 23 (6th) |
| RSI Galaxy (Med Bay) | 18.5-23 (7th) | 19-24 (7th) |
| Drake Ironclad | 13.5-16.5 (8th) | 19-21 (8th) |

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
