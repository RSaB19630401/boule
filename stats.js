/* Statistik für Spieler – reine Funktionen (im Browser und in Node testbar)
 * Spiel: { id, date, form, target, teams:[{name, players:[id]}, {...}], score:[a,b] }
 */
(function (root) {
  const blank = () => ({ g: 0, w: 0, pf: 0, pa: 0 });
  const add = (o, won, pf, pa) => { o.g++; if (won) o.w++; o.pf += pf; o.pa += pa; };

  // filter: { form: 'alle'|'tete'|..., year: 'alle'|2026 }
  function filterGames(games, f = {}) {
    return games.filter(g => g.teams && g.score &&
      (!f.form || f.form === 'alle' || g.form === f.form) &&
      (!f.year || f.year === 'alle' || new Date(g.date).getFullYear() === +f.year));
  }

  function playerStats(games, pid, f = {}) {
    const s = Object.assign(blank(), { byForm: {}, partners: {}, opponents: {}, seq: [] });
    const list = filterGames(games, f).filter(g => g.teams.some(t => (t.players || []).includes(pid)))
      .sort((a, b) => a.date - b.date);
    for (const g of list) {
      const ti = g.teams[0].players.includes(pid) ? 0 : 1, oi = 1 - ti;
      const pf = g.score[ti], pa = g.score[oi], won = pf > pa;
      add(s, won, pf, pa);
      add(s.byForm[g.form] || (s.byForm[g.form] = blank()), won, pf, pa);
      for (const p of g.teams[ti].players) if (p !== pid) add(s.partners[p] || (s.partners[p] = blank()), won, pf, pa);
      for (const p of g.teams[oi].players) add(s.opponents[p] || (s.opponents[p] = blank()), won, pf, pa);
      s.seq.push({ date: g.date, won, pf, pa, form: g.form, id: g.id });
    }
    return s;
  }

  // Rangliste: Siegquote, dann Punktdifferenz, dann Anzahl Spiele; unter minGames ans Ende
  function ranking(games, players, f = {}, minGames = 3) {
    return players.map(p => ({ p, s: playerStats(games, p.id, f) }))
      .filter(r => r.s.g > 0)
      .map(r => Object.assign(r, { rate: r.s.w / r.s.g, diff: r.s.pf - r.s.pa, ok: r.s.g >= minGames }))
      .sort((a, b) => (b.ok - a.ok) || (b.rate - a.rate) || (b.diff - a.diff) || (b.s.g - a.s.g));
  }

  // Partner/Gegner sortiert, mit Mindestanzahl gemeinsamer Spiele
  function topList(map, minG = 2, best = true) {
    return Object.entries(map).filter(([, o]) => o.g >= minG)
      .map(([id, o]) => ({ id, ...o, rate: o.w / o.g }))
      .sort((a, b) => best ? (b.rate - a.rate) || (b.g - a.g) : (a.rate - b.rate) || (b.g - a.g));
  }

  const api = { filterGames, playerStats, ranking, topList };
  if (typeof module !== 'undefined') module.exports = api; else root.BouleStats = api;
})(typeof window !== 'undefined' ? window : globalThis);
