# Star Citizen ship comparison scorecard

Scores ships as a **solo mobile base**: go out, mine, salvage, defend and sleep off-planet for a long
time, hidden in space. It's a thought experiment where the marketing comes true, so concept ships
are scored on what they promise, with ranges where the promise is vague.

A ship is scored by a **layout**: the ships it carries together, and which role each one fills. The
score script ranks each carrier by its best layout.

## Folder layout

```
index.html                 leaderboard viewer (placeholder for now; reads results/leaderboard.js)
rubric.yaml                the current rubric
rubricVersions/            older rubrics, DECISIONS.md (changelog and reasons), results snapshots
scripts/score.py           validates the data, scores every layout, writes results/leaderboard.js
results/leaderboard.js     generated data file; don't edit by hand
ships/<shipId>/
  ship_data.yaml           the ship's own facts: roles, guns, beds, cargo, hangar, sources, changes
  layouts/<name>.yaml      carriers only: which ship covers each role, slot used, cargo taken, fit source
```

Ships that only ride on other ships (Golem, Salvation, C8X…) have `ship_data.yaml` and no `layouts/`.

## Running the script

```
pip install -r requirements.txt
python3 scripts/score.py            # validate, score, write results/leaderboard.js
python3 scripts/score.py --check    # list stale results without writing anything
python3 scripts/score.py --dry-run  # print the leaderboard without writing
```

Validation names the file, the field and the problem: **missing field**, **extra field** or **bad
value**. Extra fields are warnings: they're skipped and grading carries on. An unknown ship id in a
layout is an error that names the layout. A file with errors isn't graded; the rest still are.

## Versions and staleness

Scores are never written into layout files. Each layout's result in `results/leaderboard.js` carries
the rubric version, the script version and a **fingerprint**: a hash of `rubric.yaml`,
`scripts/score.py`, the layout file and every `ship_data.yaml` it uses. If any of those change, the
fingerprint changes and `--check` lists the layout as stale.

Rubric and script both use semver: **major** = old scores aren't comparable, **minor** = new rule or
category, **patch** = fix. When the rubric changes:

1. Copy `rubric.yaml` and `results/leaderboard.js` into `rubricVersions/<old version>/`.
2. Edit `rubric.yaml`, bump `rubricVersion`, add an entry to `rubricVersions/DECISIONS.md`.
3. Run the script, commit, and tag the merge commit `rubric-vX.Y.Z`.
4. Keep the last 3-5 versions in `rubricVersions/`.

## Ship ids

`manufacturer code` + `size letter` + `Name`, camelCase, and the folder name matches the id:
`anvlLLiberator`, `miscSGuardianMx`, `drakLIroncladAssault`.

- **Codes** (from game data): AEGS ANVL ARGO BANU CNOU CRUS DRAK ESPR GAMA GRIN KRIG MISC ORIG RSI
  TMBL XNAA. Mirai (MRAI) folds into MISC.
- **Size**: S = CIG size 1-2, L = 3-5, C = 6, from game data. A ship can override this with
  `sizeOverride` and a reason. Current overrides: Liberator is L (CIG 6) and Carrack is C (CIG 5).
  Concepts not in game data (Kraken, Odyssey) are assigned by judgement and say so.

Keys are camelCase everywhere, including the results file. The viewer shows each ship's `name`.

## Writing data

- **Ranges**: any value can be `{low: X, high: Y}` where it rests on marketing or an estimate. The
  script scores the low case and the high case.
- **Layouts**: each role says `source: native` or a carried ship id, the `slot` it uses
  (`smallSlot`, `openPad`, `mediumSlot`, `vehicleBay`), `cargoScu` it takes up (0 unless it sits on
  the cargo grid), an optional one-line `fit` source and the `patch`. Use `fitsInLowCase: false` for
  a ship that may not fit at all. `extraShips` lists ships aboard that fill no role.
- **Fit sources**, best first: the maintainer's own in-game test, then a player fit test. Note
  whether the roof or bay door was open or closed; if a player didn't say, mark it about 90%.
- **changes**: add an entry only when something about the ship changed, with the patch it changed in.
- **Sources**: record numbers and link the source. Write notes in your own words and never paste
  wiki or forum text into this repo.

## Licence

GPL-3.0, see `LICENSE`.
