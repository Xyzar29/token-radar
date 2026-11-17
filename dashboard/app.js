// EV Radar's dashboard. It reads window.RADAR (written beside dashboard/ by main.ts from the same
// board board.json carries) and renders the ranked board, a filterable and sortable table, a
// per-protocol detail drawer with the model's own arithmetic and the protocol's farm plan, and the
// Already launched view of token-bearing protocols at the market's own values. No network: every
// byte it shows is in data.js, and every figure on it is recomputed from the snapshot's records by
// lib/model.ts, never typed by hand.
(function () {
  'use strict';

  var DATA = window.RADAR;
  if (!DATA) return;
  var app = document.getElementById('board');
  var state = { q: '', chain: 'all', category: 'all', wl: false, tab: 'pre', sort: 'implied', dir: -1, selected: null };

  var usd0 = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
  function fmtUsd(n) {
    if (n === null || n === undefined || !isFinite(n)) return 'n/a';
    if (Math.abs(n) >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B';
    if (Math.abs(n) >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
    return usd0.format(n);
  }
  function fmtPct(n) {
    if (n === null || n === undefined || !isFinite(n)) return 'n/a';
    return (n > 0 ? '+' : '') + n.toFixed(1) + '%';
  }
  function fmtAge(days) {
    if (days === null || days === undefined) return 'unknown';
    if (days >= 730) return (days / 365).toFixed(1) + 'y';
    if (days >= 60) return Math.round(days / 30.4) + 'mo';
    return Math.max(0, Math.round(days)) + 'd';
  }
  function fmtOdds(x) { return Math.round(x * 100) + '%'; }

  function el(tag, attrs) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === 'class') node.className = attrs[k];
        else if (k === 'text') node.textContent = attrs[k];
        else if (k.slice(0, 2) === 'on') node.addEventListener(k.slice(2), attrs[k]);
        else if (attrs[k] !== null && attrs[k] !== undefined) node.setAttribute(k, attrs[k]);
      });
    }
    for (var i = 2; i < arguments.length; i++) {
      var child = arguments[i];
      if (child === null || child === undefined) continue;
      if (Array.isArray(child)) child.forEach(function (c) { if (c) node.appendChild(c); });
      else if (typeof child === 'string') node.appendChild(document.createTextNode(child));
      else node.appendChild(child);
    }
    return node;
  }

  function readHash() {
    var hash = window.location.hash.replace(/^#/, '');
    if (!hash) return;
    var params = new URLSearchParams(hash);
    if (params.get('q')) state.q = params.get('q');
    if (params.get('chain')) state.chain = params.get('chain');
    if (params.get('category')) state.category = params.get('category');
    if (params.get('wl') === '1') state.wl = true;
    if (params.get('tab') === 'live') state.tab = 'live';
    if (params.get('p')) state.selected = params.get('p');
  }
  function writeHash() {
    var params = new URLSearchParams();
    if (state.q) params.set('q', state.q);
    if (state.chain !== 'all') params.set('chain', state.chain);
    if (state.category !== 'all') params.set('category', state.category);
    if (state.wl) params.set('wl', '1');
    if (state.tab === 'live') params.set('tab', 'live');
    if (state.selected) params.set('p', state.selected);
    var next = params.toString();
    window.history.replaceState(null, '', next ? '#' + next : window.location.pathname + window.location.search);
  }

  function rows() {
    var q = state.q.trim().toLowerCase();
    return DATA.rows.filter(function (r) {
      if (state.wl && !r.watchlist) return false;
      if (state.chain !== 'all' && (r.chains || []).indexOf(state.chain) < 0) return false;
      if (state.category !== 'all' && (r.category || 'Uncategorized') !== state.category) return false;
      if (!q) return true;
      var hay = [r.name, r.slug, r.category || '', (r.chains || []).join(' ')].join(' ').toLowerCase();
      return hay.indexOf(q) >= 0;
    });
  }
  function sortedRows(list) {
    var key = state.sort;
    return list.slice().sort(function (a, b) {
      var av, bv;
      if (key === 'name') { av = a.name.toLowerCase(); bv = b.name.toLowerCase(); }
      else if (key === 'tvl') { av = a.tvl_usd; bv = b.tvl_usd; }
      else if (key === 'growth') { av = a.change_7d === null ? -Infinity : a.change_7d; bv = b.change_7d === null ? -Infinity : b.change_7d; }
      else if (key === 'age') { av = a.age_days === null ? -1 : a.age_days; bv = b.age_days === null ? -1 : b.age_days; }
      else if (key === 'odds') { av = a.launch_likelihood; bv = b.launch_likelihood; }
      else if (key === 'fdv') { av = a.expected_fdv_usd; bv = b.expected_fdv_usd; }
      else { av = a.implied_value_usd; bv = b.implied_value_usd; }
      if (av < bv) return -state.dir;
      if (av > bv) return state.dir;
      return a.rank - b.rank;
    });
  }

  function header() {
    return el('header', { class: 'top' },
      el('div', { class: 'brand' },
        el('span', { class: 'scope', 'aria-hidden': 'true' }),
        el('div', null,
          el('div', { class: 'brand-name', text: 'EV RADAR' }),
          el('div', { class: 'brand-sub', text: 'Token launch radar: every pre-token protocol, ranked by what one farming wallet expects to earn' })
        )
      ),
      el('div', { class: 'top-meta' },
        el('span', null, 'snapshot ', el('b', { text: DATA.as_of })),
        el('span', null, 'model ', el('b', { text: DATA.model_version })),
        el('span', { text: 'DefiLlama protocol index, frozen' })
      )
    );
  }

  function stats() {
    function stat(label, value, note, hot) {
      return el('div', { class: 'stat' + (hot ? ' hot' : '') },
        el('span', { text: label }), el('b', { text: value }), note ? el('small', { text: note }) : null);
    }
    return el('section', { class: 'stats', 'aria-label': 'Radar summary' },
      stat('Protocols scanned', String(DATA.universe_size), DATA.tokenized_size + ' already record a token'),
      stat('Pre-token candidates', String(DATA.board_size), 'every one ranked, none hand-picked', true),
      stat('Watchlist covered', DATA.watchlist_size + ' / ' + DATA.watchlist_size, 'the $' + Math.round(DATA.floor_usd / 1e6) + 'M-and-no-token floor, all on the board'),
      stat('Expected airdrop pool', fmtUsd(DATA.expected_pool_usd), 'odds-weighted, across the whole board'),
      stat('Universe launch multiple', DATA.universe_multiple.toFixed(2) + 'x', 'median market cap / TVL of traded protocols')
    );
  }

  function formula() {
    return el('div', { class: 'formula' },
      el('code', { text: 'implied $/wallet = TVL x category multiple x ' + Math.round(DATA.model.airdrop_share * 1000) / 10 + '% pool x launch odds / est. farmers' }),
      el('p', { text: 'The rank is the money one wallet expects, not the protocol\u2019s size: a smaller protocol with a thin crowd can outrank a giant. Select any row for its arithmetic and farm plan.' })
    );
  }

  function controls() {
    var chains = Array.from(new Set(DATA.rows.reduce(function (acc, r) { return acc.concat(r.chains || []); }, []))).sort();
    var categories = Array.from(new Set(DATA.rows.map(function (r) { return r.category || 'Uncategorized'; }))).sort();
    var search = el('input', { type: 'search', id: 'q', placeholder: 'Search name, slug, category, chain', value: state.q, 'aria-label': 'Search the board' });
    search.addEventListener('input', function () { state.q = search.value; writeHash(); render(); });
    function select(id, label, values, current, onchange) {
      var sel = el('select', { id: id, 'aria-label': label },
        el('option', { value: 'all', text: label + ': all' }),
        values.map(function (v) { return el('option', { value: v, text: v, selected: v === current ? 'selected' : null }); })
      );
      sel.addEventListener('change', function () { onchange(sel.value); writeHash(); render(); });
      return sel;
    }
    var wlBox = el('input', { type: 'checkbox', 'aria-label': 'Watchlist only' });
    if (state.wl) wlBox.setAttribute('checked', '');
    wlBox.addEventListener('change', function () { state.wl = wlBox.checked; writeHash(); render(); });
    var pre = el('button', { type: 'button', 'aria-pressed': state.tab === 'pre' ? 'true' : 'false', text: 'Pre-token board', onclick: function () { state.tab = 'pre'; writeHash(); render(); } });
    var live = el('button', { type: 'button', 'aria-pressed': state.tab === 'live' ? 'true' : 'false', text: 'Already launched', onclick: function () { state.tab = 'live'; writeHash(); render(); } });
    return el('div', { class: 'controls' },
      el('div', { class: 'tabs', role: 'group', 'aria-label': 'Token status' }, pre, live),
      el('div', { class: 'field' }, el('label', { for: 'q', text: 'Search' }), search),
      el('div', { class: 'field' }, el('label', { for: 'chain', text: 'Chain' }),
        select('chain', 'Chain', chains, state.chain, function (v) { state.chain = v; })),
      el('div', { class: 'field' }, el('label', { for: 'category', text: 'Category' }),
        select('category', 'Category', categories, state.category, function (v) { state.category = v; })),
      el('label', { class: 'switch' }, wlBox, el('span', { text: 'Watchlist only' })),
      el('span', { class: 'count', text: state.tab === 'pre' ? rows().length + ' of ' + DATA.board_size + ' rows' : DATA.live.length + ' launched protocols' })
    );
  }

  function sortHeader(key, label) {
    return el('th', { scope: 'col' },
      el('button', { type: 'button', onclick: function () {
        if (state.sort === key) state.dir = -state.dir;
        else { state.sort = key; state.dir = key === 'name' ? 1 : -1; }
        render();
      } }, label, state.sort === key ? el('span', { class: 'dir', 'aria-hidden': 'true', text: state.dir < 0 ? ' \u25bc' : ' \u25b2' }) : null)
    );
  }

  function chainText(r) {
    var c = r.chains || [];
    if (!c.length) return 'chain n/a';
    return c.length <= 2 ? c.join(', ') : c[0] + ' +' + (c.length - 1);
  }

  function boardTable() {
    var list = sortedRows(rows());
    if (list.length === 0) {
      return el('div', { class: 'panel' }, el('div', { class: 'empty' },
        el('h2', { text: 'No protocol matches that filter' }),
        el('p', { text: 'Clear the search or widen the chain and category filters to see the board again.' }),
        el('button', { class: 'button primary', type: 'button', text: 'Clear filters', onclick: function () {
          state.q = ''; state.chain = 'all'; state.category = 'all'; state.wl = false; writeHash(); render();
        } })
      ));
    }
    var max = Math.max.apply(null, list.map(function (r) { return r.implied_value_usd; })) || 1;
    var tbody = el('tbody');
    list.forEach(function (r) {
      var growthClass = r.change_7d === null ? '' : r.change_7d >= 0 ? 'pos' : 'neg';
      var tr = el('tr', {
        'data-selected': state.selected === r.slug ? 'true' : 'false', tabindex: '0',
        onclick: function () { openDetail(r.slug); },
        onkeydown: function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDetail(r.slug); } }
      },
        el('td', { class: 'num', text: String(r.rank) }),
        el('td', null, el('div', { class: 'name' },
          el('b', { text: r.name }),
          r.watchlist ? el('span', { class: 'wl', text: 'WL', title: 'On the snapshot watchlist' }) : null
        )),
        el('td', { class: 'sub', text: r.category || 'Uncategorized' }),
        el('td', { class: 'sub', text: chainText(r) }),
        el('td', { class: 'num', text: fmtUsd(r.tvl_usd) }),
        el('td', { class: 'num ' + growthClass, text: fmtPct(r.change_7d) }),
        el('td', { class: 'num', text: fmtAge(r.age_days) }),
        el('td', { class: 'odds', text: fmtOdds(r.launch_likelihood) }),
        el('td', { class: 'num', text: fmtUsd(r.expected_fdv_usd) }),
        el('td', null, el('div', { class: 'implied' },
          el('div', { class: 'bar', 'aria-hidden': 'true' }, el('i', { style: 'width:' + Math.max(2, Math.round((r.implied_value_usd / max) * 100)) + '%' })),
          el('b', { text: fmtUsd(r.implied_value_usd) })
        ))
      );
      tbody.appendChild(tr);
    });
    return el('div', { class: 'panel' }, el('div', { class: 'table-wrap' },
      el('table', null,
        el('caption', { text: 'Pre-token protocols ranked by expected airdrop value per farming wallet. WL marks the snapshot\u2019s watchlist. Select a row for the model behind its rank and its farm plan.' }),
        el('thead', null, el('tr', null,
          sortHeader('implied', '#'), sortHeader('name', 'Protocol'),
          el('th', { scope: 'col', text: 'Category' }), el('th', { scope: 'col', text: 'Chains' }),
          sortHeader('tvl', 'TVL'), sortHeader('growth', '7d'), sortHeader('age', 'Tokenless'),
          sortHeader('odds', 'Launch odds'), sortHeader('fdv', 'Exp. FDV'), sortHeader('implied', 'Implied / wallet')
        )),
        tbody
      )
    ));
  }

  function liveTable() {
    var tbody = el('tbody');
    DATA.live.forEach(function (r) {
      tbody.appendChild(el('tr', null,
        el('td', null, el('div', { class: 'name' }, el('b', { text: r.name }))),
        el('td', { class: 'num', text: r.symbol || 'n/a' }),
        el('td', { class: 'sub', text: r.category || 'Uncategorized' }),
        el('td', { class: 'num', text: fmtUsd(r.tvl_usd) }),
        el('td', { class: 'num ' + (r.change_7d !== null && r.change_7d >= 0 ? 'pos' : 'neg'), text: fmtPct(r.change_7d) }),
        el('td', { class: 'num', text: fmtUsd(r.mcap_usd) }),
        el('td', null, el('span', { class: 'status live', text: 'trades' }))
      ));
    });
    return el('div', { class: 'panel' }, el('div', { class: 'table-wrap' },
      el('table', null,
        el('caption', { text: 'Already launched: these protocols record a token, so their market cap is a market fact, not a model output. They are set aside from the pre-token ranking; their category medians are what price the board.' }),
        el('thead', null, el('tr', null,
          el('th', { scope: 'col', text: 'Protocol' }), el('th', { scope: 'col', text: 'Symbol' }),
          el('th', { scope: 'col', text: 'Category' }), el('th', { scope: 'col', text: 'TVL' }),
          el('th', { scope: 'col', text: '7d' }), el('th', { scope: 'col', text: 'Market cap' }),
          el('th', { scope: 'col', text: 'Token' })
        )),
        tbody
      )
    ));
  }

  function methodPanel() {
    var m = DATA.model;
    var cats = DATA.categories.filter(function (c) { return c.traded_peers > 0; })
      .sort(function (a, b) { return b.multiple - a.multiple; }).slice(0, 10);
    return el('section', { class: 'panel method' },
      el('div', null,
        el('h2', { text: 'How the radar scores' }),
        el('p', { class: 'sub', text: 'One function of the snapshot\u2019s own figures scores every row. No protocol name is special-cased, no list is kept by hand, and a protocol that appears tomorrow is scored the day it is listed.' })
      ),
      el('div', { class: 'cols' },
        el('div', null, el('h3', { text: 'The multiple' }),
          el('p', null, 'Each category\u2019s launch multiple is the ', el('b', { text: 'median market cap / TVL of its own traded protocols' }),
            ', shrunk toward the universe median (' + DATA.universe_multiple.toFixed(2) + 'x) by peer count, so two traded peers cannot swing a category. Expected FDV = TVL x that multiple. Top multiples on this snapshot: ',
            el('code', { text: cats.map(function (c) { return c.category + ' ' + c.multiple.toFixed(2) + 'x (n=' + c.traded_peers + ')'; }).join(' \u00b7 ') }))),
        el('div', null, el('h3', { text: 'The odds' }),
          el('p', null, 'Launch odds start from ', el('b', { text: 'how often the protocol\u2019s category has tokenized before' }),
            ' (its token share in this snapshot), then move with time run tokenless, seven-day TVL growth and chain reach. Three cuts follow: a versioned name (a V2 of something) keeps ' + Math.round(m.versioned_penalty * 100) + '%; a wrapped, staked or bridged product of an asset that already trades keeps ' + Math.round(m.product_penalty * 100) + '% \u2014 WBTC is Bitcoin on Ethereum, not a launch waiting to happen; and a CEX keeps ' + Math.round(m.cex_penalty * 100) + '%, its TVL being custodial balances. They stay on the board, priced as what they are.')),
        el('div', null, el('h3', { text: 'The crowd' }),
          el('p', null, 'The pool is ', el('b', { text: Math.round(m.airdrop_share * 1000) / 10 + '% of expected FDV' }),
            ', a typical community allocation. The wallets chasing it grow as TVL^' + m.crowd_exponent + ', slower than TVL itself, so being early and consistent on a mid-size protocol can beat joining the crowd at a giant. Implied value is the odds-weighted pool divided by that crowd.'))
      ),
      el('div', { class: 'consts' },
        el('span', null, 'airdrop share ', el('b', { text: String(m.airdrop_share) })),
        el('span', null, 'farmers ', el('b', { text: 'max(' + m.min_farmers + ', ' + m.farmer_base + ' x (TVL/$1M)^' + m.crowd_exponent + ')' })),
        el('span', null, 'odds ', el('b', { text: m.odds_base + ' + ' + m.odds_category + ' cat + ' + m.odds_age + ' age + ' + m.odds_growth + ' growth + ' + m.odds_reach + ' reach, cap ' + m.odds_cap })),
        el('span', null, 'growth clamp ', el('b', { text: m.growth_floor + '%..' + m.growth_cap_pct + '%' })),
        el('span', null, 'age horizon ', el('b', { text: m.age_horizon_days + 'd' })),
        el('span', null, 'multiple cap ', el('b', { text: m.multiple_cap + 'x, shrink prior ' + m.prior_weight })),
        el('span', null, 'candidate cuts ', el('b', { text: 'versioned x' + m.versioned_penalty + ' \u00b7 traded-asset product x' + m.product_penalty + ' \u00b7 CEX x' + m.cex_penalty }))
      )
    );
  }

  var dialog = el('dialog', { class: 'detail', id: 'detail', 'aria-labelledby': 'detail-title' });
  dialog.addEventListener('close', function () { state.selected = null; writeHash(); render(); });

  function splitStep(s) {
    var at = s.indexOf(' Cost: ');
    if (at < 0) return { action: s, cost: '', time: '' };
    var tail = s.slice(at + 7);
    var tAt = tail.lastIndexOf('. Time: ');
    if (tAt < 0) return { action: s.slice(0, at), cost: tail.replace(/\.$/, ''), time: '' };
    return { action: s.slice(0, at), cost: tail.slice(0, tAt), time: tail.slice(tAt + 8).replace(/\.$/, '') };
  }

  function factor(label, value, cls) {
    return el('div', { class: 'factor ' + (cls || '') },
      el('div', { class: 'frow' }, el('span', { text: label }), el('b', { text: String(value) })),
      el('div', { class: 'bar', 'aria-hidden': 'true' }, el('i', { style: 'width:' + Math.max(2, Math.min(100, value)) + '%' }))
    );
  }

  function openDetail(slug) {
    var row = null;
    DATA.rows.forEach(function (r) { if (r.slug === slug) row = r; });
    if (!row) return;
    state.selected = slug;
    writeHash();
    dialog.textContent = '';
    dialog.appendChild(el('div', { class: 'detail-head' },
      el('div', null,
        el('span', { class: 'rankline', text: 'RANK ' + row.rank + ' OF ' + DATA.board_size + (row.watchlist ? ' \u00b7 WATCHLIST' : '') }),
        el('h2', { id: 'detail-title', text: row.name }),
        el('p', { class: 'sub', text: (row.category || 'Uncategorized') + ' \u00b7 ' + ((row.chains || []).join(', ') || 'chain n/a') })
      ),
      el('button', { class: 'close', type: 'button', 'aria-label': 'Close details', text: 'Close', onclick: function () { dialog.close(); } })
    ));
    dialog.appendChild(el('section', { class: 'detail-section' },
      el('h3', { text: 'The record' }),
      el('div', { class: 'kv' },
        el('div', null, el('span', { text: 'TVL' }), el('b', { text: fmtUsd(row.tvl_usd) })),
        el('div', null, el('span', { text: '7d change' }), el('b', { text: fmtPct(row.change_7d) })),
        el('div', null, el('span', { text: 'Tokenless for' }), el('b', { text: fmtAge(row.age_days) })),
        el('div', null, el('span', { text: 'Chains' }), el('b', { text: String((row.chains || []).length) })),
        el('div', null, el('span', { text: 'Category multiple' }), el('b', { text: row.category_multiple.toFixed(2) + 'x' })),
        el('div', null, el('span', { text: 'Est. farmers' }), el('b', { text: row.est_farmers.toLocaleString('en-US') }))
      )
    ));
    dialog.appendChild(el('section', { class: 'detail-section' },
      el('h3', { text: 'Why this rank' }),
      factor('Launch value if priced like its peers', row.scores.size),
      factor('Launch odds', row.scores.launch, 'launch'),
      factor('Momentum (7d TVL growth)', row.scores.momentum, 'momentum'),
      factor('Maturity (time run tokenless)', row.scores.maturity),
      factor('Crowd room (fewer farmers, higher score)', row.scores.crowd),
      el('div', { class: 'eq' },
        'TVL ', el('b', { text: fmtUsd(row.tvl_usd) }), ' x ', el('b', { text: row.category_multiple.toFixed(2) + 'x' }), ' = exp. FDV ', el('b', { text: fmtUsd(row.expected_fdv_usd) }), el('br'),
        'FDV x ', el('b', { text: Math.round(DATA.model.airdrop_share * 1000) / 10 + '%' }), ' = pool ', el('b', { text: fmtUsd(row.airdrop_pool_usd) }), el('br'),
        row.candidate_factor < 1 ? [el('span', { text: 'odds already carry the x' }), el('b', { text: String(row.candidate_factor) }), el('span', { text: ' candidate cut for this kind of record' }), el('br')] : null,
        'pool x odds ', el('b', { text: fmtOdds(row.launch_likelihood) }), ' / ', el('b', { text: row.est_farmers.toLocaleString('en-US') }), ' farmers = ',
        el('span', { class: 'out', text: fmtUsd(row.implied_value_usd) + ' / wallet' })
      ),
      el('p', { class: 'sub', text: 'An estimate from the snapshot\u2019s figures, not a price and not a promise: the entry\u2019s own claim about what farming this protocol is worth.' })
    ));
    dialog.appendChild(el('section', { class: 'detail-section' },
      el('h3', { text: 'Farm plan' }),
      el('ol', { class: 'steps' }, row.farm_steps.map(function (s) {
        var parts = splitStep(s);
        return el('li', null,
          el('b', { text: parts.action }),
          el('span', { class: 'chips' },
            parts.cost ? el('span', { class: 'chip', text: 'Cost: ' + parts.cost }) : null,
            parts.time ? el('span', { class: 'chip time', text: 'Time: ' + parts.time }) : null
          )
        );
      }))
    ));
    if (typeof dialog.showModal === 'function') { if (!dialog.open) dialog.showModal(); }
    else dialog.setAttribute('open', '');
  }

  function render() {
    app.textContent = '';
    var shell = el('div', { class: 'shell' });
    shell.appendChild(header());
    shell.appendChild(stats());
    shell.appendChild(formula());
    shell.appendChild(controls());
    shell.appendChild(state.tab === 'pre' ? boardTable() : liveTable());
    if (state.tab === 'pre') shell.appendChild(methodPanel());
    app.appendChild(shell);
    app.setAttribute('aria-busy', 'false');
    if (!dialog.isConnected) app.appendChild(dialog);
    if (state.selected) openDetail(state.selected);
  }

  readHash();
  render();
  window.addEventListener('keydown', function (e) { if (e.key === 'Escape' && dialog.open) dialog.close(); });
})();
