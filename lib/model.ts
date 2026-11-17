// EV Radar's model: one snapshot of the protocol universe in, one ranked board out.
//
// The board ranks EVERY protocol that records no token (no market cap, no CoinGecko id, no symbol:
// 342 of this snapshot's 758), the snapshot's 40-slug watchlist among them, by the expected airdrop
// value of one farming wallet. Token-bearing protocols are kept apart and shown at the market's own
// values, never mixed into the ranked board.
//
// Nothing is hand-picked and no name is special-cased: every figure below is derived from the
// snapshot's own records at run time.
//
//   multiple(c)   the median market-cap / TVL of category c's TRADED protocols, shrunk toward the
//                 universe median by the peer count, so a category with two traded peers cannot
//                 swing the board: (n x median + 6 x universe) / (n + 6), capped at 3.
//   expected FDV  = tvl_usd x multiple(category): what a launch would be valued at if this protocol
//                 were priced like its traded peers. (The snapshot's market caps stand in for launch
//                 valuations; they are the only peer prices the record carries.)
//   launch odds   = 0.06 + 0.46 x category token share (smoothed) + 0.22 x age factor
//                 + 0.16 x growth factor + 0.10 x chain-reach factor, capped at 0.90, then cut by
//                 the candidate factors below. The category token share is the share of the
//                 category's protocols that already record a token: categories that tokenize,
//                 tokenize.
//   candidate     x 0.4 for a versioned name (a V2 of a protocol rarely issues a second token);
//   factors       x 0.25 for a wrapped, staked or bridged product of an asset that already trades
//                 (the bridge, canonical bridge, liquid staking, liquid restaking and restaked-BTC
//                 categories, a name carrying the whole word wrapped, staked or staking, or one
//                 beginning with an exchange's name: WBTC is Bitcoin on Ethereum, not a protocol
//                 waiting on a launch of its own, so it sits on the board for completeness and
//                 ranks where a product of a traded asset belongs); x 0.5 for a CEX, whose listed
//                 TVL is custodial balances rather than a protocol's own deposits. The board still
//                 carries every one of them: the radar hides nothing, it prices the difference.
//   airdrop pool  = expected FDV x 7.5% (a typical community allocation at launch).
//   farmers       = max(300, round(420 x (tvl_usd / 1e6) ^ 0.55)): the crowd competing for the pool
//                 grows slower than TVL, so size still pays, but with diminishing returns.
//   implied value = round(pool x launch odds / farmers): the expected dollars one farming wallet
//                 takes if it farms this protocol now. That per-wallet figure, not the protocol's
//                 size, is the board's rank: it is the number a farmer acts on.

/** The snapshot's protocol entry: exactly the ten fields the sealed input carries. */
export interface SnapshotProtocol {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  gecko_id: string | null;
  symbol: string | null;
}

/** The whole snapshot document. */
export interface Snapshot {
  as_of: string;
  source: string;
  floor_usd: number;
  protocols: SnapshotProtocol[];
  watchlist: string[];
}

/** The model's constants, as the dashboard states them. */
export interface ModelConstants {
  airdrop_share: number;
  farmer_base: number;
  crowd_exponent: number;
  min_farmers: number;
  prior_weight: number;
  multiple_cap: number;
  odds_base: number;
  odds_category: number;
  odds_age: number;
  odds_growth: number;
  odds_reach: number;
  odds_cap: number;
  versioned_penalty: number;
  product_penalty: number;
  cex_penalty: number;
  growth_floor: number;
  growth_cap_pct: number;
  age_horizon_days: number;
  unknown_age_factor: number;
}

export const MODEL: ModelConstants = {
  airdrop_share: 0.075,
  farmer_base: 420,
  crowd_exponent: 0.55,
  min_farmers: 300,
  prior_weight: 6,
  multiple_cap: 3,
  odds_base: 0.06,
  odds_category: 0.46,
  odds_age: 0.22,
  odds_growth: 0.16,
  odds_reach: 0.1,
  odds_cap: 0.9,
  versioned_penalty: 0.4,
  product_penalty: 0.25,
  cex_penalty: 0.5,
  growth_floor: -30,
  growth_cap_pct: 60,
  age_horizon_days: 1095,
  unknown_age_factor: 0.45,
};

/** The model's version label: the dashboard names it and the rules quote it. */
export const MODEL_VERSION = 'ev-radar-2';

/** How many live-token protocols the Already launched view carries, by market cap. */
export const LIVE_ROWS = 60;

/** A farm step: the action, what it costs, and how long it takes. */
export interface FarmStep {
  text: string;
  cost: string;
  time: string;
}

/** One row of board.json: the ranked board's row. */
export interface BoardRow {
  rank: number;
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  gecko_id: string | null;
  symbol: string | null;
  token_status: 'pre-token';
  age_days: number | null;
  implied_value_usd: number;
  model: {
    category_multiple: number;
    expected_fdv_usd: number;
    airdrop_pool_usd: number;
    launch_likelihood: number;
    candidate_factor: number;
    est_farmers: number;
    growth_pct: number;
    age_days: number | null;
  };
  farm_steps: string[];
}

/** The dashboard's compact view of one row, with its score breakdown and farm plan. */
export interface RadarRow {
  rank: number;
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  age_days: number | null;
  implied_value_usd: number;
  expected_fdv_usd: number;
  airdrop_pool_usd: number;
  launch_likelihood: number;
  candidate_factor: number;
  est_farmers: number;
  category_multiple: number;
  watchlist: boolean;
  scores: { size: number; launch: number; momentum: number; maturity: number; crowd: number };
  farm_steps: string[];
}

/** A live-token protocol: it already trades, so the board shows the market's own value, not a model's. */
export interface LiveRow {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  mcap_usd: number | null;
  change_7d: number | null;
  symbol: string | null;
}

/** The category statistics the model derives from the snapshot itself. */
export interface CategoryStat {
  category: string;
  protocols: number;
  tokenized: number;
  token_share: number;
  traded_peers: number;
  multiple: number;
}

/** Everything the dashboard needs: the board, the live set, the derived statistics and the model. */
export interface RadarData {
  as_of: string;
  source: string;
  floor_usd: number;
  model: ModelConstants;
  model_version: string;
  universe_size: number;
  tokenized_size: number;
  watchlist_size: number;
  board_size: number;
  early_size: number;
  live_size: number;
  universe_multiple: number;
  expected_pool_usd: number;
  categories: CategoryStat[];
  rows: RadarRow[];
  live: LiveRow[];
}

/** Why the snapshot is not one this model can score. */
export class SnapshotError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SnapshotError';
  }
}

const DAY_MS = 86_400_000;

/** A finite number, else `fallback`. */
function finite(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

const round4 = (n: number): number => Math.round(n * 1e4) / 1e4;
const clamp = (n: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, n));

/** A whole day count from `from` to `to`, clamped at zero; null when either date is absent or bad. */
export function ageDays(asOf: string, listedAt: string | null): number | null {
  if (listedAt === null) return null;
  const a = Date.parse(`${asOf}T00:00:00Z`);
  const b = Date.parse(`${listedAt}T00:00:00Z`);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return Math.max(0, Math.floor((a - b) / DAY_MS));
}

/** Whether a protocol records no token at all. */
export function isPreToken(p: SnapshotProtocol): boolean {
  return p.mcap_usd === null && p.gecko_id === null && p.symbol === null;
}

/** DefiLlama's version-marker rule: a name ending in a release is a later version of a protocol. */
const VERSIONED = /\s(V\d+(\.\d+)?|v\d+(\.\d+)?|\d+\.\d+)$/;

/** Categories that are a product of another asset rather than a protocol of their own. */
const PRODUCT_CATEGORIES = new Set(['Bridge', 'Canonical Bridge', 'Liquid Staking', 'Liquid Restaking', 'Restaked BTC']);
/** A name carrying one of these as a whole word is a wrapped or staked product of a traded asset. */
const PRODUCT_WORD = /\b(wrapped|staked|staking)\b/i;
/** A name beginning with an exchange's name is that exchange's product, not a new protocol. */
const EXCHANGE_PREFIX = /^(Binance|Coinbase|Bybit|Kraken|Bitget|OKX|Bitfinex|Gemini)\b/;

/**
 * The candidate factor: how much of a launch candidate this record is, from its own fields alone.
 * A wrapped, staked or bridged product of an asset that already trades is not a token that does not
 * exist yet; a CEX's listed TVL is custodial balances. Both stay on the board, priced accordingly.
 */
export function candidateFactor(p: SnapshotProtocol, model: ModelConstants = MODEL): number {
  const product =
    (p.category !== null && PRODUCT_CATEGORIES.has(p.category)) || PRODUCT_WORD.test(p.name) || EXCHANGE_PREFIX.test(p.name);
  if (product) return model.product_penalty;
  if (p.category === 'CEX') return model.cex_penalty;
  return 1;
}

/** The median of a non-empty list of numbers. */
function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

/**
 * The category statistics: for every category, how many of its protocols already record a token, and
 * the shrunk median market-cap / TVL of its traded peers. Both are read off the snapshot at run time,
 * so the same code scores any snapshot it is handed, including protocols that do not exist yet.
 */
export function categoryStats(snapshot: Snapshot, model: ModelConstants = MODEL): { stats: Map<string, CategoryStat>; universeMultiple: number } {
  const allRatios: number[] = [];
  const groups = new Map<string, SnapshotProtocol[]>();
  for (const p of snapshot.protocols) {
    const key = p.category ?? 'Uncategorized';
    const list = groups.get(key) ?? [];
    list.push(p);
    groups.set(key, list);
    if (p.mcap_usd !== null && p.mcap_usd > 0 && p.tvl_usd > 0) allRatios.push(p.mcap_usd / p.tvl_usd);
  }
  const universeMultiple = allRatios.length > 0 ? median(allRatios) : 0.2;
  const stats = new Map<string, CategoryStat>();
  for (const [category, list] of groups) {
    const ratios = list.filter((p) => p.mcap_usd !== null && p.mcap_usd > 0 && p.tvl_usd > 0).map((p) => p.mcap_usd! / p.tvl_usd);
    const tokenized = list.filter((p) => !isPreToken(p)).length;
    const raw = ratios.length > 0 ? median(ratios) : universeMultiple;
    const shrunk = (ratios.length * raw + model.prior_weight * universeMultiple) / (ratios.length + model.prior_weight);
    stats.set(category, {
      category,
      protocols: list.length,
      tokenized,
      token_share: round4((tokenized + 2.2) / (list.length + 4)),
      traded_peers: ratios.length,
      multiple: round4(clamp(shrunk, 0.02, model.multiple_cap)),
    });
  }
  return { stats, universeMultiple: round4(universeMultiple) };
}

/** One protocol's full scoring: every figure the board, the detail view and the farm plan use. */
export interface Scored {
  age: number | null;
  growthPct: number;
  ageFactor: number;
  growthFactor: number;
  reachFactor: number;
  candidate: number;
  likelihood: number;
  expectedFdv: number;
  pool: number;
  farmers: number;
  implied: number;
  multiple: number;
}

export function scoreProtocol(p: SnapshotProtocol, asOf: string, stat: CategoryStat, model: ModelConstants = MODEL): Scored {
  const age = ageDays(asOf, p.listed_at);
  const growthPct = clamp(finite(p.change_7d, 0), model.growth_floor, model.growth_cap_pct);
  const growthFactor = (growthPct - model.growth_floor) / (model.growth_cap_pct - model.growth_floor);
  const ageFactor = age === null ? model.unknown_age_factor : Math.min(age, model.age_horizon_days) / model.age_horizon_days;
  const reachFactor = Math.min(p.chains.length, 6) / 6;
  let likelihood =
    model.odds_base + model.odds_category * stat.token_share + model.odds_age * ageFactor + model.odds_growth * growthFactor + model.odds_reach * reachFactor;
  const candidate = candidateFactor(p, model);
  likelihood *= candidate;
  if (VERSIONED.test(p.name)) likelihood *= model.versioned_penalty;
  likelihood = clamp(likelihood, 0.02, model.odds_cap);
  const expectedFdv = Math.max(1, Math.round(p.tvl_usd * stat.multiple));
  const pool = Math.round(expectedFdv * model.airdrop_share);
  const farmers = Math.max(model.min_farmers, Math.round(model.farmer_base * Math.pow(Math.max(p.tvl_usd, 1) / 1e6, model.crowd_exponent)));
  const implied = Math.max(1, Math.round((pool * likelihood) / farmers));
  return { age, growthPct, ageFactor, growthFactor, reachFactor, candidate, likelihood, expectedFdv, pool, farmers, implied, multiple: stat.multiple };
}

/** The protocols the board ranks, strongest first, with ranks 1..n: every pre-token protocol. */
export function buildBoard(snapshot: Snapshot, model: ModelConstants = MODEL): BoardRow[] {
  const { stats } = categoryStats(snapshot, model);
  const scored = snapshot.protocols
    .filter(isPreToken)
    .map((p) => ({ p, s: scoreProtocol(p, snapshot.as_of, stats.get(p.category ?? 'Uncategorized')!, model) }));
  scored.sort((a, b) => b.s.implied - a.s.implied || (a.p.slug < b.p.slug ? -1 : a.p.slug > b.p.slug ? 1 : 0));
  return scored.map(({ p, s }, i) => ({
    rank: i + 1,
    slug: p.slug,
    name: p.name,
    category: p.category,
    chains: p.chains,
    tvl_usd: p.tvl_usd,
    change_7d: p.change_7d,
    mcap_usd: p.mcap_usd,
    listed_at: p.listed_at,
    gecko_id: p.gecko_id,
    symbol: p.symbol,
    token_status: 'pre-token',
    age_days: s.age,
    implied_value_usd: s.implied,
    model: {
      category_multiple: s.multiple,
      expected_fdv_usd: s.expectedFdv,
      airdrop_pool_usd: s.pool,
      launch_likelihood: round4(s.likelihood),
      candidate_factor: s.candidate,
      est_farmers: s.farmers,
      growth_pct: s.growthPct,
      age_days: s.age,
    },
    farm_steps: farmSteps(p, s).map(stepText),
  }));
}

/** A step as one string: its action, then its cost and time, within the gate's 20..600 characters. */
export function stepText(step: FarmStep): string {
  let s = `${step.text} Cost: ${step.cost}. Time: ${step.time}.`;
  if (s.length > 600) s = `${s.slice(0, 596)}...`;
  if (s.length < 20) s = `${s} Hold the position and check the protocol's own page.`;
  return s;
}

/** The first chain a protocol names, or a neutral phrase. */
function chainOf(p: SnapshotProtocol): string {
  return p.chains.length > 0 ? p.chains[0]! : 'its main chain';
}

/** Per-action gas on a chain, in dollars, and the asset it is paid in: the chains a farmer actually pays. */
const CHAIN_GAS: Record<string, { usd: number; asset: string }> = {
  Ethereum: { usd: 7, asset: 'ETH' },
  Solana: { usd: 0.05, asset: 'SOL' },
  Bitcoin: { usd: 2, asset: 'BTC' },
  Tron: { usd: 1.2, asset: 'TRX' },
  Cardano: { usd: 0.4, asset: 'ADA' },
  Sui: { usd: 0.1, asset: 'SUI' },
  Aptos: { usd: 0.05, asset: 'APT' },
  TON: { usd: 0.05, asset: 'TON' },
  Near: { usd: 0.05, asset: 'NEAR' },
  Stellar: { usd: 0.01, asset: 'XLM' },
  Ripple: { usd: 0.01, asset: 'XRP' },
};
const L2_GAS = { usd: 0.4, asset: 'ETH' };
const ALT_GAS = { usd: 0.8, asset: 'gas token' };

function gasOf(chain: string): { usd: number; asset: string } {
  if (chain in CHAIN_GAS) return CHAIN_GAS[chain]!;
  if (['Arbitrum', 'Base', 'Optimism', 'Linea', 'Scroll', 'zkSync Era', 'Blast', 'Mantle', 'Unichain', 'Ink', 'X Layer'].includes(chain)) return L2_GAS;
  return ALT_GAS;
}

const fmtGas = (n: number): string => (n < 1 ? `$${n.toFixed(2)}` : `$${n.toFixed(n % 1 === 0 ? 0 : 1)}`);

/** How much capital one farm position needs, from the protocol's own TVL. */
function capitalFor(p: SnapshotProtocol): number {
  if (p.tvl_usd >= 5_000_000_000) return 500;
  if (p.tvl_usd >= 1_000_000_000) return 300;
  if (p.tvl_usd >= 250_000_000) return 200;
  if (p.tvl_usd >= 50_000_000) return 120;
  if (p.tvl_usd >= 10_000_000) return 80;
  return 60;
}

/** How many weekly actions to run, from the protocol's age: a young wallet history needs a longer runway. */
function weeksFor(age: number | null): number {
  if (age === null) return 6;
  if (age < 180) return 8;
  if (age < 365) return 6;
  if (age < 730) return 5;
  return 4;
}

/** The category's core position: the one action that makes a wallet count on this kind of protocol. */
function coreAction(p: SnapshotProtocol, capital: number, chain: string): string {
  const c = (p.category ?? '').toLowerCase();
  const n = p.name;
  if (c.includes('lend') || c.includes('cdp')) return `Supply $${capital} of USDC to ${n} on ${chain}, then borrow no more than 40% of it back and re-supply half the borrow, so the wallet shows both sides of the market`;
  if (c.includes('dex')) return `Provide $${capital} split evenly across ${n}'s deepest USDC pair on ${chain}, and make two swaps of about $25 through the same pool so the wallet has trade history, not just a deposit`;
  if (c.includes('perpetual') || c.includes('derivative')) return `Deposit $${capital} of USDC as margin on ${n} and open a small delta-neutral pair (an equal long and short) so the position can sit open without price risk`;
  if (c.includes('bridge') || c.includes('canonical')) return `Bridge $${capital} of USDC from Ethereum to ${chain} through ${n}, then bridge a quarter of it back a week later: round trips are what bridge snapshots count`;
  if (c.includes('liquid staking') || c.includes('restak') || c.includes('staking')) return `Stake $${capital} of ${chain}'s staking asset through ${n} and hold the receipt token in the same wallet, unsold, for the whole window`;
  if (c.includes('risk curator') || c.includes('allocator') || c.includes('curator')) return `Deposit $${capital} into the largest USDC vault ${n} curates on ${chain}, and leave the vault shares untouched for the whole window`;
  if (c.includes('basis')) return `Deposit $${capital} of USDC into ${n}'s basis vault on ${chain}: the position earns the funding spread while it qualifies the wallet`;
  if (c.includes('rwa')) return `Mint or subscribe $${capital} of ${n}'s yield asset on ${chain} through its own app and hold it to term`;
  if (c.includes('cex')) return `Open a verified account on ${n}, deposit $${capital}, and place two spot trades a week from the same account so the activity is aged, not burst`;
  if (c === 'chain') return `Bridge $${capital} to ${chain}, hold at least $25 of its gas asset there, and use two of its native apps so the wallet reads as a resident, not a passer-by`;
  if (c.includes('yield')) return `Deposit $${capital} into ${n}'s highest-TVL USDC vault on ${chain} and keep the shares for the whole window`;
  if (c.includes('prediction')) return `Fund $${capital} on ${n} and hold one position on each side of two different markets, so the wallet is active without a directional bet`;
  if (c.includes('payment') || c.includes('card')) return `Activate ${n} with $${capital} loaded and route two ordinary payments a week through it for the whole window`;
  if (c.includes('insurance')) return `Buy $${capital} of cover from ${n} on ${chain} for a position you actually hold, and keep the policy to expiry`;
  if (c.includes('privacy')) return `Deposit $${capital} through ${n}'s shielded pool on ${chain} and make one shielded transfer a week, keeping amounts ordinary`;
  return `Deposit $${capital} of USDC into ${n} on ${chain} and keep the position open for the whole window`;
}

/** The second surface: another chain the protocol runs on, or a second kind of activity on the first. */
function secondAction(p: SnapshotProtocol, capital: number, gasUsd: number): { text: string; cost: string } {
  const half = Math.max(25, Math.round(capital / 2));
  if (p.chains.length >= 2) {
    return {
      text: `Repeat a smaller position of about $${half} on ${p.chains[1]}, the protocol's second chain: multi-chain wallets are the ones points programs weight most`,
      cost: `about $${half} more capital and ${fmtGas(gasUsd)} of gas`,
    };
  }
  const c = (p.category ?? '').toLowerCase();
  if (c.includes('dex')) {
    return {
      text: `Add a second, smaller position of about $${half} to a different pool on ${p.name} so the wallet is not riding a single pair`,
      cost: `about $${half} more capital and ${fmtGas(gasUsd)} of gas`,
    };
  }
  if (c.includes('lend') || c.includes('cdp')) {
    return {
      text: `Vote in one governance poll or delegate to an active delegate on ${p.name}: lenders with a governance record are counted as users, not mercenaries`,
      cost: `no capital, about ${fmtGas(gasUsd)} of gas`,
    };
  }
  return {
    text: `Make one governance or community action on ${p.name} (a vote, a delegation or a forum-verified task) so the wallet carries a record beyond deposits`,
    cost: `no capital, about ${fmtGas(gasUsd)} of gas`,
  };
}

/**
 * A protocol's farm plan: five steps, each an action with a cost and a time, derived from the
 * protocol's own record (category, chains, TVL, age and the crowd it competes with), never from a
 * hand-written list of names.
 */
export function farmSteps(p: SnapshotProtocol, s: Scored): FarmStep[] {
  const chain = chainOf(p);
  const gas = gasOf(chain);
  const capital = capitalFor(p);
  const weeks = weeksFor(s.age);
  return [
    {
      text: `Use a fresh wallet for ${p.name} alone, fund it with ${gas.asset} on ${chain} for gas, and keep its seed phrase offline`,
      cost: `about ${fmtGas(gas.usd * 2)} of ${gas.asset} held for gas`,
      time: '10 minutes',
    },
    {
      text: coreAction(p, capital, chain),
      cost: `$${capital} of capital and about ${fmtGas(gas.usd)} of gas`,
      time: '15 minutes to set up',
    },
    (() => {
      const second = secondAction(p, capital, gas.usd);
      return { text: second.text, cost: second.cost, time: '10 minutes' };
    })(),
    {
      text: `Repeat one qualifying action a week for ${weeks} weeks (a $25 swap, deposit, borrow or vote on ${p.name}), because snapshots reward aged, regular wallets over one-day bursts; with about ${s.farmers.toLocaleString('en-US')} wallets expected to farm this one, consistency is the edge`,
      cost: `about ${fmtGas(gas.usd)} of gas a week, ${fmtGas(gas.usd * weeks)} over the window`,
      time: `10 minutes a week for ${weeks} weeks`,
    },
    {
      text: `Check ${p.name}'s own points or rewards page before withdrawing, claim only from the link it publishes, and log every transaction with its date so the position can be repeated or unwound`,
      cost: 'nothing to check, and never pay anyone to claim',
      time: '10 minutes, then 5 minutes a week for the log',
    },
  ];
}

/** The live-token protocols, by market cap, for the dashboard's Already launched view. */
export function liveRows(snapshot: Snapshot): LiveRow[] {
  return snapshot.protocols
    .filter((p) => !isPreToken(p))
    .sort((a, b) => (b.mcap_usd ?? 0) - (a.mcap_usd ?? 0) || b.tvl_usd - a.tvl_usd)
    .slice(0, LIVE_ROWS)
    .map((p) => ({
      slug: p.slug,
      name: p.name,
      category: p.category,
      chains: p.chains,
      tvl_usd: p.tvl_usd,
      mcap_usd: p.mcap_usd,
      change_7d: p.change_7d,
      symbol: p.symbol,
    }));
}

/** The 0..100 bars of a row's detail view, each one a factor of the model a reader can check. */
function scoresOf(s: Scored): RadarRow['scores'] {
  return {
    size: Math.round(clamp(((Math.log10(Math.max(s.expectedFdv, 1)) - 5) / 5.5) * 100, 0, 100)),
    launch: Math.round(s.likelihood * 100),
    momentum: Math.round(s.growthFactor * 100),
    maturity: Math.round(s.ageFactor * 100),
    crowd: Math.round(clamp(((5.2 - Math.log10(Math.max(s.farmers, 1))) / 2.7) * 100, 0, 100)),
  };
}

/** Everything the dashboard renders, from the snapshot. */
export function buildRadar(snapshot: Snapshot, model: ModelConstants = MODEL): { board: BoardRow[]; radar: RadarData } {
  const board = buildBoard(snapshot, model);
  const { stats, universeMultiple } = categoryStats(snapshot, model);
  const live = liveRows(snapshot);
  const watch = new Set(snapshot.watchlist);
  const protocolBySlug = new Map(snapshot.protocols.map((p) => [p.slug, p]));
  const radar: RadarData = {
    as_of: snapshot.as_of,
    source: snapshot.source,
    floor_usd: snapshot.floor_usd,
    model,
    model_version: MODEL_VERSION,
    universe_size: snapshot.protocols.length,
    tokenized_size: snapshot.protocols.length - board.length,
    watchlist_size: snapshot.watchlist.length,
    board_size: board.length,
    early_size: board.filter((r) => !watch.has(r.slug)).length,
    live_size: live.length,
    universe_multiple: universeMultiple,
    expected_pool_usd: board.reduce((n, r) => n + Math.round(r.model.airdrop_pool_usd * r.model.launch_likelihood), 0),
    categories: [...stats.values()].sort((a, b) => (a.category < b.category ? -1 : 1)),
    rows: board.map((r) => {
      const p = protocolBySlug.get(r.slug)!;
      const s = scoreProtocol(p, snapshot.as_of, stats.get(r.category ?? 'Uncategorized')!, model);
      return {
        rank: r.rank,
        slug: r.slug,
        name: r.name,
        category: r.category,
        chains: r.chains,
        tvl_usd: r.tvl_usd,
        change_7d: r.change_7d,
        mcap_usd: r.mcap_usd,
        listed_at: r.listed_at,
        age_days: r.age_days,
        implied_value_usd: r.implied_value_usd,
        expected_fdv_usd: r.model.expected_fdv_usd,
        airdrop_pool_usd: r.model.airdrop_pool_usd,
        launch_likelihood: r.model.launch_likelihood,
        candidate_factor: r.model.candidate_factor,
        est_farmers: r.model.est_farmers,
        category_multiple: r.model.category_multiple,
        watchlist: watch.has(r.slug),
        scores: scoresOf(s),
        farm_steps: r.farm_steps,
      };
    }),
    live,
  };
  return { board, radar };
}

/** The snapshot out of a file's text, refused unless it is the shape the model scores. */
export function parseSnapshot(text: string): Snapshot {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new SnapshotError('snapshot.json is not JSON');
  }
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) throw new SnapshotError('snapshot.json is not a JSON object');
  const o = raw as Record<string, unknown>;
  if (typeof o.as_of !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(o.as_of)) throw new SnapshotError('snapshot.json has no as_of date');
  if (typeof o.source !== 'string') throw new SnapshotError('snapshot.json has no source');
  if (typeof o.floor_usd !== 'number' || !Number.isSafeInteger(o.floor_usd) || o.floor_usd <= 0) throw new SnapshotError('snapshot.json has no floor_usd');
  if (!Array.isArray(o.protocols)) throw new SnapshotError('snapshot.json has no protocols array');
  if (!Array.isArray(o.watchlist) || o.watchlist.some((s) => typeof s !== 'string')) throw new SnapshotError('snapshot.json has no watchlist of slugs');
  const protocols = o.protocols.map((v, i) => {
    if (typeof v !== 'object' || v === null || Array.isArray(v)) throw new SnapshotError(`snapshot.json's protocol ${i} is not an object`);
    const p = v as Record<string, unknown>;
    if (typeof p.slug !== 'string' || typeof p.name !== 'string' || typeof p.tvl_usd !== 'number' || !Number.isFinite(p.tvl_usd)) {
      throw new SnapshotError(`snapshot.json's protocol ${i} lacks a slug, a name or a TVL`);
    }
    return {
      slug: p.slug,
      name: p.name,
      category: typeof p.category === 'string' ? p.category : null,
      chains: Array.isArray(p.chains) ? p.chains.filter((c): c is string => typeof c === 'string') : [],
      tvl_usd: p.tvl_usd,
      change_7d: typeof p.change_7d === 'number' && Number.isFinite(p.change_7d) ? p.change_7d : null,
      mcap_usd: typeof p.mcap_usd === 'number' && Number.isFinite(p.mcap_usd) ? p.mcap_usd : null,
      listed_at: typeof p.listed_at === 'string' ? p.listed_at : null,
      gecko_id: typeof p.gecko_id === 'string' ? p.gecko_id : null,
      symbol: typeof p.symbol === 'string' ? p.symbol : null,
    };
  });
  return {
    as_of: o.as_of,
    source: o.source,
    floor_usd: o.floor_usd,
    protocols,
    watchlist: o.watchlist as string[],
  };
}

/** Why a board is not one the gate will take, or null: coverage, ranks, order, one shared implied value, and farm steps. */
export function boardIssue(board: BoardRow[], snapshot: Snapshot): string | null {
  const slugs = new Set(board.map((r) => r.slug));
  const missing = snapshot.watchlist.filter((s) => !slugs.has(s));
  if (missing.length > 0) return `the board misses ${missing.length} watchlist slug${missing.length === 1 ? '' : 's'}: ${missing.slice(0, 5).join(', ')}`;
  const ranks = board.map((r) => r.rank).sort((a, b) => a - b);
  for (let i = 0; i < ranks.length; i++) if (ranks[i] !== i + 1) return `rank ${i + 1} is ${ranks[i]}`;
  for (let i = 1; i < board.length; i++) if (board[i]!.implied_value_usd > board[i - 1]!.implied_value_usd) return `row ${i + 1} outranks row ${i} on implied value`;
  if (board.length >= 2 && board[0]!.implied_value_usd === board[board.length - 1]!.implied_value_usd) {
    return `all ${board.length} rows share the same implied value $${board[0]!.implied_value_usd}: a board that ranks nothing by value is not a ranking`;
  }
  for (const r of board) {
    const steps = r.farm_steps;
    if (steps.length < 3 || steps.length > 12) return `${r.slug} has ${steps.length} farm steps`;
    for (const s of steps) if (s.length < 20 || s.length > 600) return `${r.slug} has a farm step of ${s.length} characters`;
    if (!Number.isSafeInteger(r.implied_value_usd) || r.implied_value_usd <= 0) return `${r.slug} has implied value ${r.implied_value_usd}`;
  }
  return null;
}

/** A compact data.js: the dashboard's whole dataset as one script, no fetch and no network. */
export function dataScript(radar: RadarData): string {
  return `window.RADAR=${JSON.stringify(radar)};\n`;
}
