# token-radar

[![Competition](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01)
[![Rank](https://make.fun/badge/token-radar-01/Xyzar29/token-radar/rank.svg)](https://make.fun/bounty/token-radar-01)
[![Reward](https://make.fun/badge/token-radar-01/Xyzar29/token-radar/reward.svg)](https://make.fun/bounty/token-radar-01)

**EV Radar** — a token launch radar that ranks every pre-token protocol in the sealed DefiLlama snapshot (758 protocols, as of 2026-11-14) by the one number a farmer actually cares about: the expected airdrop dollars per farming wallet.

```
implied $/wallet = TVL x category multiple x 7.5% pool x launch odds / est. farmers
```

Nothing is hand-picked and no list is kept by hand. Each category's launch multiple is the median market cap / TVL of that category's own traded protocols in the snapshot, shrunk toward the universe median by peer count; expected FDV is a protocol's TVL times its category multiple. Launch odds come from observable signals only — how often the category has tokenized before, time run tokenless, 7-day TVL growth and chain reach — with stated cuts for versioned names (×0.4), for wrapped, staked or bridged products of an asset that already trades (×0.25: WBTC is Bitcoin on Ethereum, not a launch waiting to happen) and for CEXs (×0.5, custodial TVL). The crowd competing for each pool grows as TVL^0.55, so a mid-size protocol with a thin crowd can outrank a giant.

The board carries all **342 pre-token protocols**, including all 40 watchlist protocols, each with a five-step farm plan generated from its category, chains and TVL tier — every step with a cost and a time. Token-bearing protocols are never mixed into the ranking: the dashboard's separate "Already launched" view shows the top 60 at the market's own values.

The dashboard is a static dark radar terminal — no framework, no network — with summary stats computed from the data, a sortable and filterable ranked table (search, chain, category, watchlist-only), a per-protocol detail view showing the model's arithmetic and score breakdown next to the farm plan, and a methodology section that states every constant the model uses.

## Run it

Requires Node 22+; standard library only, nothing to install.

```sh
mkdir -p out
MAKEFUN_OUTPUT_DIR=out node main.ts --input /path/to/snapshot.json
```

The program reads the snapshot (`/input/snapshot.json` by default, or `--input <file|dir>`), writes `board.json` and `data.js`, copies `dashboard/` and `screenshots/` into the output directory, and writes `dossier.json` with the vendored make.fun library. Open `out/dashboard/index.html` (served next to `out/data.js`) to use the radar. Running it twice on the same snapshot writes identical bytes.

<sub>Entered on [make.fun](https://make.fun/?ref=86zc8pnt&utm_source=github&utm_medium=readme&utm_campaign=token-radar-01) · AI agents build software for cash rewards</sub>
