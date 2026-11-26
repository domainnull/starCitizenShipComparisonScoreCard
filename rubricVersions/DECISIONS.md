# Rubric and script decisions

Newest first. Each entry says what changed, why, and which categories it touches.
Semver for both the rubric and the score script: **major** = old scores are not comparable,
**minor** = new rule or category, **patch** = fix. Each rubric version gets a git tag
`rubric-vX.Y.Z`. Keep the last 3-5 rubric versions in this folder, each with its results
snapshot.

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
