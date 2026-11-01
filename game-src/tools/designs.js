// Hand-designed signature levels. Each has one idea the player has to discover.
const D = {};

// 30 — the charger fan has to leave its wire to reach the generator; only a bot can carry it there,
// and it keeps blowing from its stored charge.
D[30] = { name: 'Second Wind', w: 9, h: 13,
  map: [
    '.......b.',
    '.......bT',
    '.......b.',
    '.........',
    '.........',
    '.........',
    'Paaaa...#',
    '.........',
    '.........',
    '.........',
    '.........',
    '.........',
    '.........'],
  fixed: [['generator', 7, 2, 0]],
  inv: { pushbot: 1, chargefan: 1, fan: 1 },
  sol: [['pushbot', 1, 6, 0], ['chargefan', 2, 6, 3]],
  nudge: 'The generator is far from the power wire. Something has to carry a fan over there, and that fan must keep blowing without power.',
  trick: 'A Charger Fan keeps blowing from its stored charge after it leaves the wire. A Push Bot behind it shoves it along the row until the block stops it.',
  steps: ['Put the Push Bot on the first power wire square, facing right.', 'Put the Charger Fan on the next square, pointing UP.', 'Tap the Power Box: the fan charges, gets pushed under the generator and blows up into it.'] };

// 40 — the fixed mirror is slanted the wrong way. The laser first powers the rotator that flips it.
D[40] = { name: 'Ricochet', w: 9, h: 13,
  map: [
    '...Paaa..',
    '.........',
    '.........',
    '.........',
    '.........',
    '.........',
    '.b......c',
    '.b....b.c',
    '.bbbbbb.c',
    '........c',
    '.....Tccc',
    '.........',
    '.........'],
  fixed: [['solar', 1, 6, 0], ['mirror', 6, 6, 0], ['feeder', 8, 6, 0]],
  inv: { laser: 1, rotator: 1, mirror: 1 },
  sol: [['laser', 6, 0, 1], ['rotator', 6, 7, 0]],
  nudge: 'The mirror sends the laser the wrong way, into the solar panel. Maybe that is not a mistake.',
  trick: 'Let the wrong bounce power a Rotating Tool under the mirror: it flips the mirror, and the beam swings right into the feeder.',
  steps: ['Put the Laser on the power wire straight above the mirror, pointing DOWN.', 'Put the Rotating Tool on the wire directly under the mirror.', 'Tap the Power Box: the beam lights the solar panel, the rotator flips the mirror, and the beam turns into the feeder.'] };

// 50 — the generator is walled in. Teleport it out into the wind, and the wind itself comes from light.
D[50] = { name: 'Portal Wind', w: 9, h: 13,
  map: [
    '.........',
    '.........',
    '.........',
    '.........',
    '....ccc..',
    '......c..',
    '......c..',
    '..#......',
    '.#.#a....',
    '..a.a...T',
    '..a.a#bbb',
    'Paaaaaa..',
    '.........'],
  fixed: [['generator', 2, 8, 0], ['solar', 4, 4, 0]],
  inv: { tpsend: 1, tprecv: 1, bulb: 1, fan: 1, wsender: 1 },
  sol: [['tpsend', 2, 9, 0], ['tprecv', 6, 11, 0], ['bulb', 4, 8, 0], ['fan', 6, 6, 1]],
  nudge: 'The generator is boxed in by blocks, and the only fan spot is on a wire with no power yet.',
  trick: 'Light the solar panel to power the fan\'s wire, then teleport the boxed generator onto the target wire, right in the fan\'s wind.',
  steps: ['Put the Teleporter Sender on the wire right under the boxed generator.', 'Put the Teleporter Receiver at the right end of the bottom power wire.', 'Put the Light Bulb at the top of the middle power wire, under the solar panel.', 'Put the Electric Fan at the bottom of the panel\'s wire, pointing DOWN.', 'Tap the Power Box.'] };

// 60 — two cores, one bulb. It must sit where both solar panels can see it.
D[60] = { name: 'Twin Cores', w: 9, h: 13,
  map: [
    '..Tbbb...',
    '.........',
    '.......Td',
    '.....c..d',
    '.....c...',
    '.....c...',
    'Paa..c...',
    '.........',
    '.........',
    '.........',
    '.........',
    '.........',
    '.........'],
  fixed: [['solar', 5, 0, 0], ['solar', 8, 3, 0]],
  inv: { fan: 1, generator: 1, bulb: 1, laser: 1, solar: 1 },
  sol: [['fan', 2, 6, 0], ['generator', 5, 6, 0], ['bulb', 5, 3, 0]],
  nudge: 'Two targets, and only one bulb. A bulb shines in all four directions at once.',
  trick: 'Wind powers the tall wire. The bulb must sit on its top square, the one square both solar panels can see.',
  steps: ['Put the Electric Fan on the end of the power wire, pointing right.', 'Put the Generator on the bottom of the tall wire, in the wind.', 'Put the Light Bulb on the top square of the tall wire.', 'Tap the Power Box: both cores light up.'] };


// 100 — the finale: the wrong-way mirror powers its own fix, and that power has to be carried across the board
// by a pushed charger fan that keeps blowing on stored charge.
D[100] = { name: 'Forge Prime', w: 10, h: 14,
  map: [
    '...Paaa...',
    '..........',
    '..........',
    '..........',
    '.b......c.',
    '.b....b.c.',
    '.bbbbbb.c.',
    '.#......c.',
    'Td#.....c.',
    '........c.',
    '........c.',
    '#....cccc.',
    '..........',
    '..........'],
  fixed: [['solar', 1, 4, 0], ['mirror', 6, 4, 0], ['feeder', 8, 4, 0], ['generator', 1, 8, 0]],
  inv: { laser: 1, rotator: 1, pushbot: 1, chargefan: 1, mirror: 1, fan: 1, generator: 1 },
  sol: [['laser', 6, 0, 1], ['rotator', 6, 5, 0], ['pushbot', 8, 11, 2], ['chargefan', 7, 11, 3]],
  nudge: 'Two old tricks at once. The mirror points the wrong way, and the last generator is nowhere near a wire you can power.',
  trick: 'Let the wrong bounce power a rotator that fixes the mirror. The feeder then powers a Push Bot that shoves a charged Charger Fan under the generator.',
  steps: ['Put the Laser on the top power wire, straight above the mirror, pointing DOWN.', 'Put the Rotating Tool on the wire directly under the mirror.', 'Put the Push Bot on the bottom-right corner of the feeder\'s wire, facing LEFT.', 'Put the Charger Fan right next to it, pointing UP.', 'Tap the Power Box.'] };

module.exports = D;
