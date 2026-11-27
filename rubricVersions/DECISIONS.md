# Rubric and script decisions

Newest first. Each entry says what changed, why, and which categories it touches.
Semver for both the rubric and the score script: **major** = old scores are not comparable,
**minor** = new rule or category, **patch** = fix. Each rubric version gets a git tag
`rubric-vX.Y.Z`. Keep the last 3-5 rubric versions in this folder, each with its results
snapshot.

## Rubric 4.0.0 / script 3.0.0 / editor 3.0.0 / viewer 2.2.0 (Nov 27 2026): bespoke guns, mining by passive power, salvage by heads, repair split out

**Major**: the salvage cap goes to 6 and a new needed category (repair) is added, so the maximum
total changes and 4.0.0 scores aren't comparable with 3.x. The script follows (3.0.0), and the editor
too (3.0.0, since the mining and salvage data formats changed). The viewer reads both 2.x and 3.x
results (2.2.0). 3.2.0 was never merged; its changes ship here. The 3.1.0 rubric and results stay in
`rubricVersions/3.1.0/`.

### Salvage by heads, tractor beam and material grade

- **Salvage** (salvageRepair, shown as "Salvage"). The named levels are gone. A ship's salvage is
  `{heads, tractorBeam, materialGrade}`. It scores 1 per salvage head, capped at `maxHeads` (2)
  because the owner plays solo; `tractorBeam` (1) if the ship has at least one tractor beam, since
  more add nothing; and the construction material grade it makes (`materialGrade`: low 1, medium 2,
  high 3). Hopper and cargo size don't count, because the mothership covers them. Owner's words: head
  count (max 2, solo), a tractor beam (1 point, they don't need more than one), and the strength of
  construction material (1-3, low/medium/high grade).
- **Cap 6.** Heads, tractor and high grade add up to 6, so the cap is 6. Owner: "The odd cap is fine, I
  am more interested in capturing an accurate category as this is a needed role." Raising caps on other
  categories is tracked in issue 23.
- Grades come from each ship's salvage hopper in scunpacked-data: Construction Rubble (low) for the
  Salvation, Vulture and Fortune; Construction Pieces (medium) for the Moth; Construction Salvage (high)
  for the Reclaimer. Owner, Nov 27: Fortune 1 head, Vulture 2, both with tractor beams; the Salvation
  has none and swaps its scraper module, not its heads.
- Ship scores: Vulture 2 + 1 + 1 = 4; Salvation 2 + 0 + 1 = 3; Fortune 1 + 1 + 1 = 3 (new ship,
  miscSFortune). Reference only, not in the ship data: Moth 4-5 (5 with a tractor module), Reclaimer 6.
  Estimates are in issue 21.
- An earlier draft the same day scored heads, tractor heads and scraper modules (0.25 each); the owner
  replaced it before merge.

### Repair split out

- **Repair** (new category, needed tier, weight 1.0, max 5). Repair no longer adds to salvage. No ship
  repairs in game yet, so it's theoretical: each base has `repair:` in its ship data (0-5, default 0,
  a slider in the editor), counting in the high case only. Every base is at 0. Owner's words: split
  repair into a new category, entirely theoretical for now, a slider 0-5, most have 0. Issue 22.
- The old repair bonus (+1 small ships, +2 itself or larger) is gone. Bases that had +1: Idris-P,
  Liberator, Kraken, Ironclad Assault, Polaris; Galaxy 0-1.
- The Galaxy (Med Bay) layout now lists salvage as No room: it has no salvage of its own, and before,
  only its repair range filled the role.

### Scores that moved (from 3.1.0)

| Layout | 3.1.0 | 4.0.0 | Salvage line |
|---|---|---|---|
| Kraken | 28-32.5 | 29-33.5 | 2 -> 3 (Salvation, no repair bonus) |
| Polaris | 29 | 30 | 2 -> 3 |
| Idris-P | 28.5 | 29.5 | 2 -> 3 |
| Liberator | 25 | 26 | 3 -> 4 (Vulture) |
| Ironclad Assault | 23-26 | 24-27 | 2 -> 3 |
| Odyssey | 21-28 | 21-27 | 0 (mining high 3 -> 2) |
| Ironclad | 19-21 | 21-23 | 1 -> 3 |
| Galaxy (Med Bay) | 19-24 | 19-23 | 0-1 -> 0 (repair moved out) |

The Ironclad now ranks above the Galaxy.

### Mining by passive power

- **Mining by passive power** (mining). The named levels (capital 5, MOLE 4, Prospector 3, Golem 2,
  ROC 1) are gone. A ship's mining is now `{headPower, moduleSlots, heads}`: the best head it can fit,
  its module slots, and how many heads it has. Power is `headPower x passiveModuleMultiplier ^
  moduleSlots`, with every slot holding the best passive power module (Rieger-C3, x1.25), so active
  modules never count. Owner's words: Golem and Prospector should come out the same, they favour high
  power passive, and a ship like the MOLE with several heads deserves an extra point or two. Confirmed
  Nov 27: passive modules only; heads score by their power with modules, since heads have different
  numbers of module slots. A carried MOLE is tracked in issue 20.
- Tiers (`powerTiers`, maintainer's defaults): above 0 scores 1, 5,000+ 2, 8,000+ 3, 12,000+ 4.
  `headBonus`: 2 heads +1, 3 or more +2. Capped at 5.
- Owner, Nov 27: every snub industrial's head is unlocked in game now, so the Golem counts the best
  S1 head (Pitman and Helix I are both 3,900 power with 2 slots). If that changes, it gets adjusted.
- Data from scunpacked-data: Pitman and Helix I 3,900 / 2 slots (6,094 passive, score 2); Helix II S2
  4,930 / 3 slots (9,629, so a MOLE would score 3 + 2 = 5, not in the ship data yet); ROC-DS fixed S0
  head at 0.8 on another scale (score 1). Odyssey's arm head is estimated, ROC-class to S1.
- Unverified (issue 19): module stacking assumed multiplicative, S0 power scale, Odyssey arm head,
  and the thresholds.
- Scores that moved: Prospector mining 3 -> 2 (not in any layout). Odyssey mining high 3 -> 2, total
  21-28 -> 21-27. Every Golem layout stays at 2, Galaxy's ROC-DS stays at 0-1.

### Bespoke guns

- **Bespoke guns** (defense). A seat can be marked `bespoke: true` with a `weaponType` (energy,
  ballistic or distortion) for guns built for the ship that can't be swapped. Swappable guns keep
  scoring by size whatever they ship with, since they can take energy guns. Bespoke guns also score
  by size, but a bespoke gun that needs ammo (`ammoWeaponTypes`, ballistic for now) scores
  `bespokeAmmoPenalty` (0.5) less per gun, because it needs rearming. Owner's words: they would use
  them, but rearming isn't in the game yet. Bespoke distortion guns score by size, since they don't
  need ammo.
- Each gun is floored at 0, so a bespoke ballistic S3 (0.25) can't go negative and an S4 lands on 0.
  This floor is the maintainer's default and hasn't been confirmed.
- `energyCapable: false` is removed in favour of `bespoke` and `weaponType`.
- Data checked in scunpacked-data: only the Polaris front turret's two S6 Maris cannons are bespoke
  ballistic (Polaris-only mounts, locked weapon ports). The Idris-P bridge remote turrets were marked
  not energy-capable, but their gun ports take any S4 gun, so they are now swappable. The Kraken and
  Odyssey turrets are assumed swappable until they are in game (issue 17).
- Scores that moved: none. The Polaris front seat drops from 5 to 4 (2 x (2.5 - 0.5)), but the
  Polaris is in `largeBases`, so its +1 still caps defense at 5 and it stays at 29.
- On its own this was a minor change (a new rule, no score incomparable); it ships in 4.0.0 with the
  rest.

## Rubric 3.1.0 / script 2.1.0 / editor 2.1.0 / viewer 2.1.0 (Nov 26 2026): extra ships score and take cargo space

- **Extra ships' cargo comes off the hold** (cargoCapacity). An extra ship still fills no role and
  scores nothing itself, but its `cargoScu` is taken off the hold before cargo capacity is scored,
  the same as a role ship's, including `fitsInLowCase: false` (then it only comes off in the high
  case). Owner's example: a 400 SCU hold with one ship taking 100 SCU scores as 300 SCU. Before,
  the editor let you tick "takes cargo space" on an extra ship and the score ignored it.
- An extra ship's `cargoScu` that isn't a number of 0 or more only warns and counts as 0, since
  extra ships stay unvalidated.
- **Extra ships line** (extraShips, new category in the needed tier, weight 1.0). Each extra ship
  gets a `score` from 1 to 5 that the owner sets (a slider in the editor), floor 1 because the
  owner wants weight for bases that can carry a lot. Left out, it counts as 1; outside 1-5 or not
  a number, it warns and is clamped or taken as 1. The line is the sum, capped at 5, so listing
  ships can't run away with the total (locations hold any number of ships and extra ships aren't
  validated). A ship that may not fit counts in the high case only. The cap of 5 and putting the
  line in the needed tier (weight 1.0) are proposals; both live in `rubric.yaml`.
- Scores that moved: the Idris-P (27.5 to 28.5) and Kraken (27-31.5 to 28-32.5) starter layouts
  each list a Guardian MX as an extra ship, now scored 1. The tested Liberator and Polaris layouts
  list no extra ships, so they score nothing here until their extras are recorded.
- **Minor**, not major: a new category, and old totals are the new totals with that line at 0, so
  3.0.0 scores stay comparable. Editor and viewer gain the score field (minor).
- The 3.0.0 rubric and its results are kept in `rubricVersions/3.0.0/`.

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
