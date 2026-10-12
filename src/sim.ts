// Fixed-step, seeded simulation. No browser or rendering dependencies.
export const W = 400, H = 620, ROUND_TIME = 60, STEP = 1 / 60;
export const HOME = { x: 200, y: 550 };
export type Company = { version: 1; credits: number; drones: number; scanner: boolean; blaster: boolean; rounds: number; total: number };
export const freshCompany = (): Company => ({ version: 1, credits: 0, drones: 1, scanner: false, blaster: false, rounds: 0, total: 0 });
export type Purchase = 'drone' | 'scanner' | 'blaster';
export function cost(c: Company, item: Purchase) { return item === 'drone' ? 45 + (c.drones - 1) * 35 : item === 'scanner' ? 60 : 160; }
export function buy(c: Company, item: Purchase): Company | null {
  if (c.credits < cost(c, item) || (item === 'drone' ? c.drones >= 6 : c[item])) return null;
  return { ...c, credits: c.credits - cost(c, item), ...(item === 'drone' ? { drones: c.drones + 1 } : { [item]: true }) };
}
export type Rock = { id: number; x: number; y: number; r: number; hp: number; max: number; shape: number[] };
export type Ore = { id: number; x: number; y: number; value: number };
export type Drone = { id: number; x: number; y: number; angle: number; hp: number; cargo: number; cooldown: number; targetX: number; targetY: number; wander: number; state: 'mine' | 'return' | 'docked' | 'dead' };
export type Effect = { type: 'hit' | 'shot' | 'ore' | 'deposit' | 'dead'; x: number; y: number; tx?: number; ty?: number; life: number; max: number; amount?: number };
export type World = { time: number; phase: 'mining' | 'recall' | 'done'; company: Company; rocks: Rock[]; ores: Ore[]; drones: Drone[]; effects: Effect[]; delivered: number; lost: number; collisions: number; shots: number; mined: number; rng: () => number; nextId: number };
export function random(seed: number) { let s = seed >>> 0; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; }
export function createWorld(company: Company, seed = 7): World {
  const rng = random(seed);
  const world: World = { time: 0, phase: 'mining', company: { ...company }, rocks: [], ores: [], drones: [], effects: [], delivered: 0, lost: 0, collisions: 0, shots: 0, mined: 0, rng, nextId: 100 };
  // A small starter rock lies on the first launch lane; the rest varies by expedition.
  const locations = [[200, 440], [74, 100], [285, 91], [160, 165], [337, 224], [60, 281], [242, 309], [119, 377], [337, 419], [50, 461], [296, 165], [157, 65]];
  locations.forEach(([x, y], id) => {
    const r = id === 0 ? 18 : 21 + rng() * 15;
    const hp = id === 0 ? 2 : r > 29 ? 4 : 3;
    world.rocks.push({ id, x: x + (id ? (rng() - .5) * 18 : 0), y, r, hp, max: hp, shape: Array.from({ length: 11 }, () => .77 + rng() * .23) });
  });
  for (let i = 0; i < company.drones; i++) world.drones.push({ id: i, x: HOME.x + (i - (company.drones - 1) / 2) * 18, y: HOME.y - 27, angle: -Math.PI / 2, hp: 100, cargo: 0, cooldown: 0, targetX: 200 + i * 25, targetY: 90, wander: 3.5, state: 'mine' });
  return world;
}
const distance = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);
function effect(w: World, e: Omit<Effect, 'life' | 'max'>, life = .5) { w.effects.push({ ...e, life, max: life }); }
function hit(w: World, rock: Rock, d: Drone) {
  rock.hp--; w.mined++;
  effect(w, { type: 'hit', x: rock.x, y: rock.y });
  // Every hit liberates 4 units. Chips remain available for any drone to collect.
  for (let j = 0; j < 2; j++) {
    const angle = Math.atan2(d.y - rock.y, d.x - rock.x) + (j ? .25 : -.25);
    w.ores.push({ id: w.nextId++, x: rock.x + Math.cos(angle) * (rock.r + 8), y: rock.y + Math.sin(angle) * (rock.r + 8), value: 2 });
  }
}
export function step(w: World, dt = STEP) {
  if (w.phase === 'done') return;
  w.time += dt;
  w.effects.forEach(e => e.life -= dt); w.effects = w.effects.filter(e => e.life > 0);
  if (w.time >= ROUND_TIME) w.phase = 'recall';
  for (const d of w.drones) {
    if (d.state === 'dead' || d.state === 'docked') continue;
    d.cooldown = Math.max(0, d.cooldown - dt);
    if (w.phase === 'recall' || d.cargo >= 12 || (!w.rocks.some(r => r.hp > 0) && !w.ores.length)) d.state = 'return';
    let target: { x: number; y: number };
    let rock: Rock | undefined;
    if (d.state === 'return') target = HOME;
    else {
      const ore = w.ores.filter(o => distance(d, o) < 125).sort((a, b) => distance(d, a) - distance(d, b))[0];
      if (ore) target = ore;
      else {
        if (w.company.scanner) rock = w.rocks.filter(r => r.hp > 0).sort((a, b) => distance(d, a) - distance(d, b))[0];
        if (rock) target = rock;
        else {
          d.wander -= dt;
          if (d.wander <= 0 || distance(d, { x: d.targetX, y: d.targetY }) < 15) { d.targetX = 30 + w.rng() * 340; d.targetY = 45 + w.rng() * 450; d.wander = 2.5 + w.rng() * 2; }
          target = { x: d.targetX, y: d.targetY };
        }
      }
    }
    const desired = Math.atan2(target.y - d.y, target.x - d.x);
    const delta = Math.atan2(Math.sin(desired - d.angle), Math.cos(desired - d.angle));
    d.angle += Math.max(-dt * 4, Math.min(dt * 4, delta));
    // Blaster has basic proximity targeting even before scanner research.
    const shotTarget = w.company.blaster && d.state === 'mine' ? w.rocks.filter(r => r.hp > 0 && distance(d, r) < r.r + 92).sort((a, b) => distance(d, a) - distance(d, b))[0] : undefined;
    if (shotTarget && d.cooldown <= 0) {
      effect(w, { type: 'shot', x: d.x, y: d.y, tx: shotTarget.x, ty: shotTarget.y }, .16);
      hit(w, shotTarget, d); w.shots++; d.cooldown = .65;
    }
    const speed = d.state === 'return' ? 83 : 65;
    const travel = Math.min(speed * dt, distance(d, target));
    d.x += Math.cos(d.angle) * travel; d.y += Math.sin(d.angle) * travel;
    d.x = Math.max(12, Math.min(W - 12, d.x)); d.y = Math.max(15, Math.min(H - 15, d.y));
    // Cargo pickup is baseline functionality, independent of scanner research.
    if (d.state === 'mine') for (let i = w.ores.length - 1; i >= 0; i--) {
      const ore = w.ores[i];
      if (distance(d, ore) < 17 && d.cargo + ore.value <= 12) { d.cargo += ore.value; effect(w, { type: 'ore', x: ore.x, y: ore.y, amount: ore.value }, .7); w.ores.splice(i, 1); }
    }
    if (d.state === 'mine') for (const r of w.rocks) {
      if (r.hp <= 0 || distance(d, r) >= r.r + 8) continue;
      if (d.cooldown <= 0 && !w.company.blaster) { hit(w, r, d); d.hp -= 3; w.collisions++; d.cooldown = .9; }
      const a = Math.atan2(d.y - r.y, d.x - r.x); d.x = r.x + Math.cos(a) * (r.r + 10); d.y = r.y + Math.sin(a) * (r.r + 10);
      if (!w.company.scanner) { d.angle = a; d.wander = 0; }
      if (d.hp <= 0) { w.lost += d.cargo; d.cargo = 0; d.state = 'dead'; effect(w, { type: 'dead', x: d.x, y: d.y }, 1); break; }
    }
    if (d.state === 'return' && distance(d, HOME) < 21) {
      w.delivered += d.cargo;
      if (d.cargo) effect(w, { type: 'deposit', x: HOME.x, y: HOME.y - 35, amount: d.cargo }, 1.2);
      d.cargo = 0;
      if (w.phase === 'recall' || !w.rocks.some(r => r.hp > 0) && !w.ores.length) d.state = 'docked';
      else { d.state = 'mine'; d.angle = -Math.PI / 2; d.y = HOME.y - 29; d.wander = 0; }
    }
  }
  if (w.drones.every(d => d.state === 'dead' || d.state === 'docked')) w.phase = 'done';
}
export function settle(c: Company, w: World): Company {
  return { ...c, credits: c.credits + w.delivered, total: c.total + w.delivered, rounds: c.rounds + 1 };
}
