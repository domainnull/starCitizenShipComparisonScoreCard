# Star Citizen ship comparison scorecard

Scores ships as a **solo mobile base**: go out, mine, salvage, defend and sleep off-planet for a long
time, hidden in space. It's a thought experiment where the marketing comes true, so concept ships
are scored on what they promise, with ranges where the promise is vague.

A ship is scored by a **layout**: the ships it carries together, and which role each one fills. The
score script ranks each carrier by its best layout.

## Folder layout

```
index.html                 leaderboard viewer; open it straight from disk, no server needed
viewer/                    the viewer's script and styles (versioned on its own)
editor/                    the ship data and layout editor's page (served by scripts/editor.py)
rubric.yaml                the current rubric
rubricVersions/            older rubrics, DECISIONS.md (changelog and reasons), results snapshots,
                           index.js (generated list of snapshots for the viewer)
scripts/score.py           validates the data, scores every layout, writes results/leaderboard.js
scripts/editor.py          local editor for ship data and layouts; checks and scores with score.py
results/leaderboard.js     generated data file; don't edit by hand
ships/<shipId>/
  ship_data.yaml           the ship's own facts: roles, guns, beds, cargo, hangar, sources, changes
  layouts/<name>.yaml      carriers only: which ship covers each role, slot used, cargo taken, fit source
```

Ships that only ride on other ships (Golem, Salvation, C8X…) have `ship_data.yaml` and no `layouts/`.

## Viewing the leaderboard

Open `index.html` in a browser, straight from your clone (double-click it, or `file:///path/to/index.html`).
There is no server, build step or internet connection involved: the page loads
`results/leaderboard.js`, `rubricVersions/index.js` and `viewer/viewer.js` with plain script tags.

- **Leaderboard**: ships ranked by the middle of their best layout's range, with a bar showing the
  low case and how far the high case reaches. Estimated layouts and stale results are badged.
- **Ship page** (tap a ship): its best layout (other layouts as tabs), every role's score against its
  maximum, which ship fills it, the slot and cargo space it uses, its fit source and patch, the
  rubric rules for that role, spare ships, score history across saved rubric versions, and the
  patch changes recorded for every ship in the layout. Tap a carried ship to see which layouts use it.
- **Compare with**: pick an older rubric version to see each ship's old score and change. Totals
  always compare; role scores compare when the old snapshot has the same layout.
- **Stale**: the viewer flags a layout scored with a different rubric or script version than the
  rest of the file. It can't see whether a YAML file changed since the last run (a browser can't read
  your files from disk), so `scripts/run.sh --check` stays the real staleness check.

The same page works on GitHub Pages if you turn Pages on for the repo (Settings > Pages > deploy
from the `main` branch, root folder). The viewer has its own semver in `viewer/viewer.js`
(`VIEWER_VERSION`); ship data changes never need a viewer change.

## Editing ships and layouts

```
uv run scripts/editor.py               # opens http://127.0.0.1:8765/ in your browser
uv run scripts/editor.py --port 9000   # another port
uv run scripts/editor.py --no-browser  # just serve it
```

The editor runs on your own computer only (127.0.0.1) and writes straight into `ships/`. It needs
nothing beyond the PyYAML the scorer already uses. It won't work opened from disk or on a phone,
because saving and scoring go through the script.

- **Ship list**: filter by name, manufacturer, size (S, L, C) and type (carriers that take layouts,
  ships that can be carried). **Add ship** builds the id from manufacturer, size and name.
- **Carrier page**: the stats that move the score (cargo space and manoeuvrability, beds and rec
  space, the strongest single gun seat, hangar slots), its layouts with their scores, **Add
  layout**, and its score with nothing carried.
- **Ship that can't take layouts**: all its stats and its score breakdown, both on its own and what
  it adds to each role when carried.
- **Layout**: the stats once the carried ships are aboard (cargo left, medical beds, defense, slots
  used) and every role's score against the nothing-carried score. **more…** next to a carried ship
  opens its full stats.
- **Add or edit a layout**: pick built in or a carried ship for each role (the list shows what each
  adds), its slot, whether it takes cargo space and how much, the fit source and patch, and whether
  it may not fit in the low case. Extra ships that fill no role can be added too.
- **Edit a ship**: a form for every field, with **Range** to split any value into a low and a high
  case, and **Edit as YAML** for anything the form can't show. **Record a change** adds a `changes`
  entry with its patch.

Every edit is checked and scored by `scripts/score.py` as you type. **Save stays off while the file
has an error, or while the change would break another file** (for example, unmarking a ship as a
hauler that a layout uses for cargo). A save that changes nothing leaves the file untouched. Comments
inside a saved file aren't kept, apart from its header line, and long notes may re-wrap.

Saving doesn't touch `results/leaderboard.js`. The list page says when the leaderboard is out of date
and has an **Update leaderboard** button, which runs `scripts/score.py` (the same as `scripts/run.sh`).
Commit the YAML and the results together as usual.

## Running the script

The project uses [uv](https://docs.astral.sh/uv/) for its Python environment. `pyproject.toml` pins
PyYAML to an exact version, `uv.lock` locks it, and `.python-version` sets Python 3.13 (uv fetches it
if you don't have it). The environment lives in `.venv/`, which git ignores.

**Normal use**, one command that sets up or syncs the environment and then runs the scorer:

```
scripts/run.sh               # sync, validate, score, write results/leaderboard.js
scripts/run.sh --check       # sync, then list stale results without writing anything
scripts/run.sh --dry-run     # sync, then print the leaderboard without writing
```

It stops with a link to uv's install page if uv isn't installed; it never installs anything itself.

**Bare uv commands**, if you'd rather run the steps yourself:

```
uv sync                                  # create .venv and install the locked PyYAML
uv run scripts/score.py                  # validate, score, write results/leaderboard.js
uv run scripts/score.py --check          # list stale results without writing anything
uv run scripts/score.py --dry-run        # print the leaderboard without writing
```

**Changing a dependency**: edit `pyproject.toml`, then refresh the lock and `requirements.txt`
together so they stay in step:

```
uv lock
uv export --format requirements-txt --no-hashes --no-header -o requirements.txt
```

**Without uv**, plain venv and pip still work from `requirements.txt`:

```
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/python scripts/score.py
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
3. Run the script, commit, and tag the merge commit `rubric-vX.Y.Z`. The run also rewrites
   `rubricVersions/index.js`, which is how the viewer finds the snapshot you copied.
4. Keep the last 3-5 versions in `rubricVersions/`; the viewer loads up to 5.

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
