import { experience } from './resume';

export const signals = [
  {
    id: 'roots', label: 'roots', gameTitle: 'Retrace my steps.', instruction: 'Put the cities in order. Start in southern Italy, pass through Milan and Dublin, and finish in London.',
    title: 'Bari → Milan → Dublin → London.',
    text: 'I’m Italian, based in London. I studied computer science in Bari, then followed work and curiosity through Milan and Dublin. A few cities. A few different chapters. The same person underneath.',
  },
  {
    id: 'curiosity', label: 'curiosity', gameTitle: 'Close the circuit.', instruction: 'Tap the tiles to turn them. Carry the power from the top-left entrance to the bottom-right exit.',
    title: 'Code. Cells. Endless questions.',
    text: 'Computers and biology fascinate me. One is built from code, the other from living things. Both give me a reason to keep asking how things work. That curiosity also led me to a master’s in ethical hacking and cybersecurity.',
  },
  {
    id: 'music', label: 'on repeat', gameTitle: 'Find the rhythm.', instruction: 'Watch the four pads, then repeat the pattern. Take your time between taps.',
    title: 'Italian rap. EDM. Repeat.',
    text: 'I love Italian rap and EDM. Wordplay on one side, synthesizers and electronic beats on the other. Different sounds, both very much me.',
  },
  {
    id: 'work', label: 'at work', gameTitle: 'Spot the anomaly.', instruction: 'Three batches of data. Find the unusual reading in each one.',
    title: 'Big systems. Real people.',
    text: `At ${experience[0].company}, I lead AI and digital transformation programmes. My path started in software engineering. These days, I bring that technical grounding to leading teams and putting ideas to work.`,
  },
  {
    id: 'pizza', label: 'a small controversy', gameTitle: 'Make my usual.', instruction: 'Three toppings. An Italian base with a tropical twist. Build the pizza you think I’d order.',
    title: 'Yes, pineapple. On purpose.',
    text: 'I’m Italian. I love pizza. I also love pineapple pizza. These facts coexist quite happily in my life. You’re welcome to disagree. We can still get along.',
  },
  {
    id: 'family', label: 'closest to the heart', gameTitle: 'Bring the light home.', instruction: 'Guide the little light to the house. Use the arrow buttons, or focus the maze and use your keyboard.',
    title: 'Father of a little queen.',
    text: 'The work, the science, the music, the pizza: they’re all pieces of the picture. I’m also the father of a little queen. There’s a person, and a family, behind this little blinking line.',
  },
];
