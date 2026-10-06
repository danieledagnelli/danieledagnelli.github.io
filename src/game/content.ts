import { education, experience, skills } from '../data/resume';

export type Room = 'neighbourhood' | 'workshop' | 'listening' | 'pizzeria' | 'rooftop';
export type Ingredient = 'dough' | 'mozzarella' | 'pineapple';
export interface Story { id: string; category: string; title: string; text: string }
export const ingredients: { id: Ingredient; name: string; symbol: string }[] = [
  { id: 'dough', name: 'Dough', symbol: '◒' },
  { id: 'mozzarella', name: 'Mozzarella', symbol: '◉' },
  { id: 'pineapple', name: 'Pineapple', symbol: '✦' },
];
export const roomNames: Record<Room, string> = {
  neighbourhood: 'Little Italy, big ideas', workshop: 'The science workshop',
  listening: 'Good frequencies', pizzeria: 'Pizzeria Controversia', rooftop: 'Dinner with the queen',
};
export const stories: Story[] = [
  { id: 'hello', category: 'PLAYER ONE', title: "Ciao. I’m Daniele.", text: 'Italian. Based in London. Into science, good music, and highly debatable pizza toppings. This little neighbourhood is a playful introduction to the person behind the CV.' },
  { id: 'science', category: '01 / CURIOSITY', title: 'Computers. Biology. Endless questions.', text: 'I have a passion for science, especially computers and biology. Both are full of systems to explore: one built from code, the other from living things. The workshop is a fictional home for that very real curiosity.' },
  { id: 'music', category: '02 / ON REPEAT', title: 'Different beats. Same volume.', text: 'I love Italian rap and EDM. Wordplay on one side, synthesizers and electronic beats on the other. The music in this game is an original little synth soundtrack, inspired by those two moods.' },
  { id: 'pizza', category: '03 / A HILL TO DINE ON', title: 'Yes, pineapple. On purpose.', text: 'I love pizza. Of course. And I love pineapple pizza. These two facts coexist peacefully in my life, even if they cause considerable unrest at this fictional pizzeria.' },
  { id: 'family', category: '04 / THE IMPORTANT BIT', title: 'Father of a little queen.', text: 'Beyond the work, the science, the music, and the pizza: I’m the father of a little queen. That’s why this adventure ends with a place at the table, together.' },
  { id: 'bari', category: 'FIELD NOTE / BARI', title: 'Start with the fundamentals.', text: `I studied ${education[1].degree} at ${education[1].institution} (${education[1].period}). Later came an ${education[0].degree} at ${education[0].institution} (${education[0].period}), with ${education[0].distinction?.toLowerCase()}. Computers and cybersecurity are a lasting thread.` },
  { id: 'journey', category: 'FIELD NOTE / IN TRANSIT', title: 'Bari → Milan → Dublin → London.', text: `After studying in Bari, my career took me to Milan as a Software Engineer at Accenture (${experience[4].roles[0].period}), then to Dublin as a Senior Consultant at Codec (${experience[3].roles[0].period}), and on to London with Accenture, Deloitte, and C3 AI.` },
  { id: 'work', category: 'FIELD NOTE / LONDON', title: 'Big systems. Real-world impact.', text: `${experience[0].roles[0].title} at ${experience[0].company}, ${experience[0].location}. ${experience[0].roles[0].description} Highlights from my portfolio include a predictive-maintenance rollout across 100+ plants with $18M EBIT impact, enterprise GenAI, and building Deloitte’s Anaplan practice to 25+ practitioners.` },
  { id: 'toolbox', category: 'FIELD NOTE / TOOLBOX', title: 'Still close to the code.', text: `My technical interests and skills span ${skills.slice(0, 6).join(', ')}, cloud engineering, machine learning, generative AI, and security tooling. My work combines that technical grounding with leading teams and delivering programmes.` },
];
export const storyById = (id: string) => stories.find(story => story.id === id)!;
export const CAREER_STORIES = ['bari', 'journey', 'work', 'toolbox'];

export const SAVE_KEY = 'operation-pineapple:v1';
export interface Progress { version: 1; ingredients: Ingredient[]; discoveries: string[]; finished: boolean }
export function freshProgress(): Progress {
  return { version: 1, ingredients: [], discoveries: ['hello'], finished: false };
}
export function readProgress(): Progress {
  try {
    const value = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
    if (value?.version !== 1 || !Array.isArray(value.ingredients) || !Array.isArray(value.discoveries)) return freshProgress();
    const collected = ingredients.filter(item => value.ingredients.includes(item.id)).map(item => item.id);
    const discoveries = stories.filter(story => value.discoveries.includes(story.id)).map(story => story.id);
    return { version: 1, ingredients: collected, discoveries: [...new Set(['hello', ...discoveries])], finished: value.finished === true && collected.length === 3 };
  } catch { return freshProgress(); }
}
export function saveProgress(progress: Progress): boolean {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(progress)); return true; }
  catch { return false; }
}
