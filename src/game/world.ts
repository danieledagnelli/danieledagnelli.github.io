import type { Room } from './content';

export interface Point { x: number; y: number }
export interface Box extends Point { w: number; h: number }
export interface Hotspot extends Point { id: string; label: string; kind: 'room' | 'puzzle' | 'story' | 'ecosystem' | 'exit' | 'dinner'; target?: string; area?: Box }
export const W = 960, H = 640;
export const spawn: Point = { x: 226, y: 348 };
export const buildings: { room: Room; box: Box; door: Point; label: string; color: string }[] = [
  { room: 'workshop', box: { x: 66, y: 70, w: 270, h: 184 }, door: { x: 205, y: 276 }, label: 'SCIENCE CLUB', color: '#aff174' },
  { room: 'listening', box: { x: 635, y: 70, w: 255, h: 184 }, door: { x: 760, y: 276 }, label: 'GOOD FREQUENCIES', color: '#bd9cfc' },
  { room: 'pizzeria', box: { x: 65, y: 414, w: 280, h: 170 }, door: { x: 205, y: 388 }, label: 'PIZZERIA', color: '#ff8e75' },
  { room: 'rooftop', box: { x: 650, y: 422, w: 242, h: 158 }, door: { x: 758, y: 394 }, label: 'THE ROOFTOP', color: '#f7d76b' },
];
export const hotspots: Record<Room, Hotspot[]> = {
  neighbourhood: [
    ...buildings.map(b => ({ id: b.room, label: `Enter ${b.label.toLowerCase()}`, kind: 'room' as const, target: b.room, ...b.door, area: b.box })),
    { id: 'hello', label: 'Meet player one', kind: 'story', target: 'hello', x: 291, y: 340 },
    { id: 'journey', label: 'Inspect the luggage', kind: 'story', target: 'journey', x: 572, y: 360 },
    { id: 'bari', label: 'Read the notebook', kind: 'story', target: 'bari', x: 419, y: 183 },
    { id: 'work', label: 'Check the workstation', kind: 'story', target: 'work', x: 470, y: 528 },
  ],
  workshop: [
    { id: 'circuit', label: 'Repair the circuit', kind: 'puzzle', target: 'dough', x: 454, y: 268 },
    { id: 'ecosystem', label: 'Explore the ecosystem', kind: 'ecosystem', x: 719, y: 285 },
    { id: 'toolbox', label: 'Open the toolbox', kind: 'story', target: 'toolbox', x: 233, y: 360 },
    { id: 'exit', label: 'Back to the neighbourhood', kind: 'exit', x: 480, y: 558 },
  ],
  listening: [
    { id: 'beats', label: 'Find the frequency', kind: 'puzzle', target: 'mozzarella', x: 480, y: 277 },
    { id: 'music', label: 'Read the sleeve notes', kind: 'story', target: 'music', x: 245, y: 355 },
    { id: 'exit', label: 'Back to the neighbourhood', kind: 'exit', x: 480, y: 558 },
  ],
  pizzeria: [
    { id: 'recipe', label: 'Make the controversial special', kind: 'puzzle', target: 'pineapple', x: 480, y: 279 },
    { id: 'pizza', label: 'Read the house rules', kind: 'story', target: 'pizza', x: 720, y: 362 },
    { id: 'exit', label: 'Back to the neighbourhood', kind: 'exit', x: 480, y: 558 },
  ],
  rooftop: [
    { id: 'dinner', label: 'Dinner with the queen', kind: 'dinner', x: 477, y: 295 },
    { id: 'exit', label: 'Back to the neighbourhood', kind: 'exit', x: 480, y: 558 },
  ],
};
export function obstacles(room: Room): Box[] {
  return room === 'neighbourhood' ? [
    ...buildings.map(b => b.box), { x: 416, y: 244, w: 116, h: 68 },
    { x: 377, y: 95, w: 191, h: 55 }, { x: 425, y: 548, w: 126, h: 40 },
  ] : [
    { x: 0, y: 0, w: 960, h: 100 }, { x: 0, y: 0, w: 110, h: 640 },
    { x: 850, y: 0, w: 110, h: 640 }, { x: 0, y: 599, w: 960, h: 41 },
    { x: 315, y: 153, w: 315, h: 80 },
  ];
}
export function canStand(point: Point, room: Room): boolean {
  return point.x > 22 && point.x < W - 22 && point.y > 28 && point.y < H - 22 &&
    !obstacles(room).some(b => point.x + 9 > b.x && point.x - 9 < b.x + b.w && point.y + 5 > b.y && point.y - 5 < b.y + b.h);
}
/** Small grid search keeps mouse/touch walking out of buildings. */
export function findPath(from: Point, to: Point, room: Room): Point[] {
  const size = 20, cols = W / size, rows = H / size;
  const cell = (p: Point) => ({ x: Math.floor(p.x / size), y: Math.floor(p.y / size) });
  const start = cell(from), end = cell(to), key = (p: Point) => p.y * cols + p.x;
  const center = (p: Point) => ({ x: p.x * size + size / 2, y: p.y * size + size / 2 });
  const queue = [start], seen = new Map<number, Point | null>([[key(start), null]]);
  for (let i = 0; i < queue.length; i++) {
    const current = queue[i];
    if (key(current) === key(end)) {
      const result: Point[] = [];
      let cursor: Point | null = current;
      while (cursor && key(cursor) !== key(start)) { result.unshift(center(cursor)); cursor = seen.get(key(cursor)) ?? null; }
      if (canStand(to, room)) result.push(to);
      return result;
    }
    for (const delta of [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }]) {
      const next = { x: current.x + delta.x, y: current.y + delta.y };
      if (next.x < 0 || next.x >= cols || next.y < 0 || next.y >= rows || seen.has(key(next)) || !canStand(center(next), room)) continue;
      seen.set(key(next), current); queue.push(next);
    }
  }
  return [];
}

const palette = { ink: '#171c32', grass: '#365a4c', leaf: '#6b9861', leafLight: '#a2bc70', road: '#525b6d', pavement: '#9aaba7', cream: '#fff1ce', yellow: '#f8d76b' };
let c: CanvasRenderingContext2D;
function rect(x: number, y: number, w: number, h: number, color: string) { c.fillStyle = color; c.fillRect(Math.round(x), Math.round(y), w, h); }
function text(value: string, x: number, y: number, size = 12, color = palette.cream, align: CanvasTextAlign = 'left') {
  c.font = `bold ${size}px monospace`; c.fillStyle = color; c.textAlign = align; c.fillText(value, Math.round(x), Math.round(y));
}
function frame(x: number, y: number, w: number, h: number, color: string, border = palette.ink) {
  rect(x, y, w, h, border); rect(x + 4, y + 4, w - 8, h - 8, color);
}
function tree(x: number, y: number, small = false) {
  const s = small ? 0.7 : 1;
  c.save(); c.translate(x, y); c.scale(s, s);
  rect(-20, 19, 49, 11, '#2b443f'); rect(-4, 0, 9, 29, '#976c55');
  rect(-22, -21, 45, 35, '#28433f'); rect(-31, -14, 59, 20, '#477552');
  rect(-21, -30, 40, 28, palette.leaf); rect(-10, -38, 24, 23, palette.leaf);
  rect(-18, -25, 13, 6, palette.leafLight); rect(-25, -13, 10, 6, palette.leafLight);
  rect(7, -8, 15, 8, '#365e45'); c.restore();
}
function plant(x: number, y: number) {
  rect(x - 10, y, 21, 17, '#bf7861'); rect(x - 13, y - 4, 27, 6, '#f0b08c');
  rect(x - 2, y - 24, 4, 22, '#6eac72'); rect(x - 13, y - 21, 13, 7, '#a2c778'); rect(x + 1, y - 29, 13, 9, '#6eac72');
}
function pineapple(x: number, y: number, scale = 1) {
  c.save(); c.translate(x, y); c.scale(scale, scale);
  rect(-9, -4, 18, 24, '#de9e47'); rect(-13, 0, 26, 16, palette.yellow);
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) rect(-7 + i * 7, j * 6, 3, 3, '#c78b45');
  rect(-3, -17, 6, 15, '#80b86b'); rect(-11, -18, 5, 10, '#b2db78'); rect(6, -18, 5, 10, '#b2db78');
  rect(-15, -23, 5, 6, '#80b86b'); rect(10, -23, 5, 6, '#80b86b'); c.restore();
}
function windowPane(x: number, y: number, w: number, h: number, color: string) {
  frame(x, y, w, h, color); rect(x + w / 2 - 2, y, 4, h, palette.ink);
  rect(x, y + h / 2, w, 4, palette.ink); rect(x + 6, y + 6, 6, h / 2 - 8, '#ffffff30');
}
function lamp(x: number, y: number) {
  rect(x - 3, y - 50, 6, 55, palette.ink); rect(x - 8, y + 4, 17, 5, palette.ink);
  frame(x - 10, y - 66, 20, 20, palette.yellow); rect(x - 13, y - 69, 26, 5, palette.ink);
}
function bench(x: number, y: number) {
  rect(x + 3, y + 14, 5, 15, palette.ink); rect(x + 62, y + 14, 5, 15, palette.ink);
  frame(x, y, 72, 13, '#b68d6b'); frame(x - 3, y + 15, 78, 12, '#c9a179');
}
function building(b: typeof buildings[number]) {
  const { x, y, w, h } = b.box;
  rect(x + 12, y + 12, w, h, '#1c2c35');
  frame(x, y, w, h, b.room === 'workshop' ? '#aab6a2' : b.room === 'listening' ? '#807da3' : b.room === 'pizzeria' ? '#cc9c7c' : '#9bb2a6');
  frame(x - 8, y - 12, w + 16, 35, b.room === 'listening' ? '#4f4b72' : '#657d78');
  for (let n = 0; n < w - 15; n += 22) rect(x + n + 9, y - 5, 13, 4, '#ffffff16');
  frame(x + 17, y + 31, w - 34, 34, b.color);
  text(b.label, x + w / 2, y + 53, b.label.length > 14 ? 14 : 18, palette.ink, 'center');
  if (b.room === 'rooftop') {
    for (let i = 0; i < 5; i++) frame(x + 75 + i * 5, y + 79 + i * 14, 70, 14, '#c9cfb5');
    plant(x + 35, y + 132); plant(x + w - 35, y + 132);
    text('DINNER AT THE TOP', x + w / 2, y + 77, 10, palette.ink, 'center');
  } else {
    windowPane(x + 21, y + 80, 65, 65, b.room === 'workshop' ? '#7aa889' : '#e8cba1');
    windowPane(x + w - 85, y + 80, 65, 65, b.room === 'listening' ? '#b99ee2' : '#e8cba1');
    frame(x + w / 2 - 24, y + 87, 48, h - 88, '#283743');
    rect(x + w / 2 - 15, y + 96, 29, 33, b.color); rect(x + w / 2 + 11, y + 143, 5, 5, palette.yellow);
    if (b.room === 'pizzeria') {
      for (let i = 0; i < 10; i++) rect(x + 4 + i * (w - 8) / 10, y + 70, (w - 8) / 10, 18, i % 2 ? '#f9e4b1' : '#bb5355');
      text('PINEAPPLE WELCOME.', x + w / 2, y + 160, 10, palette.cream, 'center');
    }
    if (b.room === 'workshop') { plant(x + 45, y + 135); rect(x + w - 62, y + 97, 15, 25, '#426967'); }
    if (b.room === 'listening') {
      rect(x + 35, y + 96, 29, 30, '#25283e'); rect(x + 44, y + 102, 12, 15, '#d09fc8');
      text('33⅓', x + w - 64, y + 113, 12, palette.ink);
    }
  }
  for (let i = 0; i < 3; i++) rect(x + 8 + i * 14, y + h - 19, 9, 3, '#22283140');
}

function neighbourhood() {
  rect(0, 0, W, H, palette.grass);
  for (let y = 15; y < H; y += 25) for (let x = 9; x < W; x += 31) {
    rect(x + (y % 7), y, 3, 3, '#5f805d'); if ((x + y) % 3 === 0) rect(x + 5, y - 2, 2, 4, '#6b966a');
  }
  rect(27, 262, 906, 139, '#2b3b42'); rect(29, 265, 902, 130, palette.pavement);
  rect(359, 23, 242, 593, palette.pavement);
  for (let y = 32; y < 620; y += 23) rect(364, y, 231, 1, '#788d8a');
  for (let x = 40; x < 920; x += 24) rect(x, 271, 1, 118, '#788d8a');
  rect(0, 299, W, 61, palette.road); rect(452, 0, 61, H, palette.road);
  for (let x = 14; x < W; x += 40) rect(x, 328, 18, 3, '#d8ccb0');
  for (let y = 15; y < H; y += 40) rect(481, y, 3, 17, '#d8ccb0');
  for (let i = 0; i < 6; i++) { rect(350 + i * 12, 301, 6, 57, '#d7d6bd'); rect(563 + i * 12, 301, 6, 57, '#d7d6bd'); }
  rect(389, 225, 167, 95, '#7f948f'); frame(412, 241, 122, 66, '#bdc7b2');
  frame(424, 248, 97, 45, '#548d99'); rect(432, 263, 30, 4, '#a4c4b8'); rect(479, 278, 26, 4, '#a4c4b8');
  frame(462, 239, 23, 41, '#a9b19d'); pineapple(475, 226, 1.5);
  frame(410, 89, 127, 63, '#647865'); rect(419, 95, 109, 43, '#456d57');
  for (let i = 0; i < 5; i++) plant(431 + i * 19, 117);
  buildings.forEach(building);
  [[37, 62], [36, 176], [366, 62], [592, 66], [928, 120], [915, 213], [25, 442], [45, 611], [365, 544], [595, 579], [935, 459], [922, 613], [573, 190]].forEach(([x, y]) => tree(x, y));
  lamp(356, 284); lamp(616, 388); lamp(39, 385); lamp(921, 285);
  bench(394, 170); bench(518, 403);
  frame(410, 149, 18, 25, '#efd4a3'); rect(415, 155, 8, 2, '#82645b'); rect(415, 162, 8, 2, '#82645b');
  frame(559, 369, 28, 23, '#a26b63'); rect(567, 364, 11, 6, palette.ink); rect(567, 375, 7, 5, '#e7cd89');
  frame(428, 551, 111, 31, '#9c927b'); frame(460, 514, 35, 36, '#536973'); rect(465, 519, 25, 21, '#a9d99e');
  rect(476, 549, 5, 10, palette.ink); frame(451, 582, 40, 22, '#818d84');
  frame(267, 305, 26, 29, '#ecd29e'); text('i', 280, 326, 21, palette.ink, 'center');
  rect(277, 334, 5, 10, '#554657');
  text('CURIOSITY AVENUE', 484, 34, 10, palette.cream, 'center');
  text('EST. ALWAYS CURIOUS', 177, 36, 11, '#bacdb2');
  text('NO PIZZA POLICE.', 740, 617, 11, '#bacdb2');
  // Café tables, flower boxes, and a very small parked bicycle.
  frame(111, 376, 34, 24, '#c69574'); frame(101, 380, 8, 15, '#e8c28d'); frame(148, 380, 8, 15, '#e8c28d');
  rect(727, 307, 45, 5, '#f1d47d'); frame(721, 312, 15, 16, '#9cae99'); frame(763, 312, 15, 16, '#9cae99');
  plant(320, 271); plant(682, 388);
}

function interior(room: Room) {
  const accent = room === 'workshop' ? '#aff174' : room === 'listening' ? '#bd9cfc' : room === 'pizzeria' ? '#ff9477' : palette.yellow;
  rect(0, 0, W, H, '#22293d');
  // A small skyline around the room gives each interior the feel of a cutaway diorama.
  for (let x = 8; x < W; x += 47) { const h = 60 + (x * 7 % 91); rect(x, 160 - h, 37, h, '#30394c'); for (let y = 160 - h + 12; y < 150; y += 20) rect(x + 11, y, 5, 6, '#665e5a'); }
  frame(108, 81, 745, 523, '#657b79');
  rect(116, 92, 729, 115, room === 'listening' ? '#62607e' : '#9aaa98');
  rect(116, 208, 729, 387, room === 'listening' ? '#5b526d' : '#9d9c87');
  for (let y = 211; y < 594; y += 28) {
    rect(116, y, 729, 2, '#151d3017');
    for (let x = 116 + (y % 56 ? 0 : 22); x < 845; x += 44) rect(x, y, 1, 28, '#151d3017');
  }
  rect(116, 202, 729, 8, '#3d5053');
  frame(302, 96, 355, 43, accent); text(room === 'workshop' ? 'SCIENCE CLUB / STAY CURIOUS' : room === 'listening' ? 'GOOD FREQUENCIES / SIDE A' : room === 'pizzeria' ? 'PIZZERIA CONTROVERSIA' : 'A TABLE FOR TWO', 480, 123, 16, palette.ink, 'center');
  frame(325, 167, 295, 67, '#a37764'); rect(333, 173, 279, 12, '#e9c49b');
  rect(342, 234, 10, 18, palette.ink); rect(593, 234, 10, 18, palette.ink);
  frame(374, 348, 213, 107, room === 'listening' ? '#817491' : '#b4b299');
  frame(443, 580, 76, 20, '#253545'); text('EXIT ↓', 480, 574, 13, palette.cream, 'center');
  plant(153, 258); plant(810, 529);
  if (room === 'workshop') {
    frame(373, 146, 111, 60, '#253b43'); rect(382, 155, 92, 40, '#96c797');
    text('HELLO, WORLD_', 388, 179, 11, '#274d42'); rect(417, 206, 20, 13, palette.ink);
    for (let i = 0; i < 6; i++) rect(502 + i * 14, 182 - (i % 3) * 8, 8, 29 + (i % 3) * 8, '#a3d884');
    frame(648, 145, 158, 121, '#609381'); rect(655, 152, 144, 105, '#aec4a3');
    for (let i = 0; i < 4; i++) plant(672 + i * 33, 234);
    rect(721, 149, 4, 108, '#497b77'); rect(651, 187, 150, 4, '#497b77');
    text('LIFE, IN MINIATURE', 725, 134, 11, palette.cream, 'center');
    frame(178, 318, 98, 35, '#876f65'); rect(202, 309, 49, 12, '#484b50');
    rect(198, 331, 9, 12, '#d7c494'); rect(249, 331, 9, 12, '#d7c494');
    text('CODE + CURIOSITY', 482, 407, 13, '#586a5e', 'center');
  } else if (room === 'listening') {
    [350, 507].forEach(x => { frame(x, 164, 103, 61, '#222a3d'); frame(x + 17, 173, 42, 42, '#6c6581'); frame(x + 29, 185, 18, 18, '#bd9cfc'); rect(x + 75, 178, 8, 30, '#e7ca99'); });
    for (let i = 0; i < 5; i++) frame(456 + i * 8, 182, 7, 31, '#ccabc8');
    [180, 704].forEach(x => { frame(x, 162, 76, 121, '#353347'); frame(x + 13, 176, 50, 39, '#5a506b'); frame(x + 13, 226, 50, 43, '#5a506b'); frame(x + 26, 237, 25, 21, '#aaa0bd'); });
    for (let i = 0; i < 8; i++) frame(180 + i * 15, 321 - i % 3 * 4, 13, 39, ['#de8c94', '#bd9cfc', '#d7bb79'][i % 3]);
    text('ITALIAN RAP ↔ EDM', 480, 401, 16, '#d5bfdd', 'center');
    text('ORIGINAL BEATS. GOOD COMPANY.', 480, 481, 12, palette.cream, 'center');
  } else if (room === 'pizzeria') {
    frame(164, 137, 115, 114, '#9b6054'); frame(180, 162, 84, 67, '#3c323b'); rect(193, 194, 54, 24, '#e09657');
    rect(204, 180, 10, 33, '#f4d785'); rect(232, 184, 8, 30, '#f4d785');
    for (let i = 0; i < 5; i++) frame(342 + i * 52, 190, 43, 29, ['#c77b68', '#f7e3b7', '#efd46f', '#7d9a70', '#cf9389'][i]);
    frame(681, 291, 97, 64, '#333b43'); text('HOUSE RULE', 729, 310, 10, palette.cream, 'center'); text('YES TO', 729, 328, 12, palette.yellow, 'center'); text('PINEAPPLE.', 729, 344, 12, palette.yellow, 'center');
    pineapple(480, 395, 1.3); text('A SLICE OF PERSONALITY', 480, 478, 12, palette.cream, 'center');
  } else {
    rect(116, 93, 729, 110, '#394856');
    for (let i = 0; i < 13; i++) { rect(139 + i * 55, 115 + Math.sin(i / 4) * 22, 4, 22, '#454b57'); frame(134 + i * 55, 135 + Math.sin(i / 4) * 22, 13, 15, palette.yellow); }
    frame(362, 174, 235, 68, '#e6b295');
    for (let x = 370; x < 590; x += 24) for (let y = 183; y < 240; y += 21) rect(x, y, 12, 10, '#ce8880');
    frame(404, 196, 39, 25, '#f8e8c3'); frame(518, 196, 39, 25, '#f8e8c3');
    c.save(); c.translate(569, 265); c.scale(0.8, 0.8); character(0, 0, false, 0, true); c.restore();
    plant(222, 267); plant(719, 279); plant(238, 503);
    text('THE BEST COMPANY.', 480, 410, 14, '#5a695f', 'center');
  }
}
function character(x: number, y: number, moving: boolean, tick: number, queen = false) {
  const stride = moving ? Math.sin(tick / 90) * 3 : 0;
  rect(x - 11, y + 1, 25, 6, '#17253570');
  rect(x - 7, y - 11, 6, 14 + stride, '#26344c'); rect(x + 3, y - 11, 6, 14 - stride, '#26344c');
  rect(x - 9, y + stride, 8, 4, '#f4e5c2'); rect(x + 3, y - stride, 8, 4, '#f4e5c2');
  rect(x - 10, y - 26, 21, 19, queen ? '#d8a0c5' : '#f7d76b');
  rect(x - 13, y - 23 + stride, 4, 12, '#d79e79'); rect(x + 11, y - 23 - stride, 4, 12, '#d79e79');
  rect(x - 8, y - 40, 17, 17, '#e2ae89'); rect(x - 10, y - 43, 21, 9, '#443635');
  rect(x - 10, y - 36, 4, 9, '#443635'); rect(x - 3, y - 32, 3, 3, palette.ink); rect(x + 5, y - 32, 3, 3, palette.ink);
  if (queen) { rect(x - 9, y - 49, 20, 7, palette.yellow); rect(x - 9, y - 54, 4, 9, palette.yellow); rect(x - 1, y - 56, 4, 9, palette.yellow); rect(x + 7, y - 54, 4, 9, palette.yellow); }
}

export class WorldRenderer {
  private backgrounds = new Map<Room, HTMLCanvasElement>();
  private camera = { x: 0, y: 0, w: W, h: H };
  private context: CanvasRenderingContext2D;
  constructor(private canvas: HTMLCanvasElement) {
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas is unavailable');
    this.context = context;
  }
  screenToWorld(clientX: number, clientY: number): Point {
    const box = this.canvas.getBoundingClientRect();
    return { x: this.camera.x + (clientX - box.left) / box.width * this.camera.w, y: this.camera.y + (clientY - box.top) / box.height * this.camera.h };
  }
  draw(room: Room, player: Point, moving: boolean, time: number, nearest?: Hotspot, finished = false) {
    if (!this.backgrounds.has(room)) {
      const background = document.createElement('canvas'); background.width = W; background.height = H;
      c = background.getContext('2d')!;
      room === 'neighbourhood' ? neighbourhood() : interior(room);
      this.backgrounds.set(room, background);
    }
    const box = this.canvas.getBoundingClientRect();
    const viewW = box.width < 580 ? 520 : W;
    const viewH = viewW * box.height / Math.max(1, box.width);
    this.camera = { x: Math.max(0, Math.min(W - viewW, player.x - viewW / 2)), y: Math.max(0, Math.min(H - Math.min(H, viewH), player.y - viewH / 2)), w: viewW, h: viewH };
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.round(box.width * pixelRatio), height = Math.round(box.height * pixelRatio);
    if (this.canvas.width !== width || this.canvas.height !== height) { this.canvas.width = width; this.canvas.height = height; }
    c = this.context; c.imageSmoothingEnabled = false;
    c.setTransform(width / viewW, 0, 0, height / viewH, -this.camera.x * width / viewW, -this.camera.y * height / viewH);
    rect(this.camera.x, this.camera.y, viewW, viewH, '#22293d');
    c.drawImage(this.backgrounds.get(room)!, 0, 0);
    for (const spot of hotspots[room]) {
      const selected = nearest?.id === spot.id;
      rect(spot.x - 12, spot.y + 8, 24, 3, selected ? palette.yellow : '#eff3c462');
      if (spot.kind !== 'exit') {
        frame(spot.x - 8, spot.y - 55, 16, 16, selected ? palette.yellow : '#f7ebc6');
        text(spot.kind === 'room' ? '↗' : spot.kind === 'story' ? '?' : '!', spot.x, spot.y - 43, 12, palette.ink, 'center');
      }
    }
    character(player.x, player.y, moving, time);
    if (finished && room === 'rooftop') { pineapple(480, 201, 0.85); text('♥', 568, 202, 21, '#ffb3c1', 'center'); }
    // A single restrained locator follows the player; no full-screen flashes.
    text('YOU', player.x, player.y - 53, 10, palette.yellow, 'center');
    c.setTransform(1, 0, 0, 1, 0, 0);
  }
}
