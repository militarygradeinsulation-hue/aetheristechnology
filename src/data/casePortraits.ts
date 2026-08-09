// Real photographic portraits for case study client contacts.
// Deterministically mapped from the contact name so each card is stable.
import p01 from '@/assets/portraits/p01.jpg';
import p02 from '@/assets/portraits/p02.jpg';
import p03 from '@/assets/portraits/p03.jpg';
import p04 from '@/assets/portraits/p04.jpg';
import p05 from '@/assets/portraits/p05.jpg';
import p06 from '@/assets/portraits/p06.jpg';
import p07 from '@/assets/portraits/p07.jpg';
import p08 from '@/assets/portraits/p08.jpg';
import p09 from '@/assets/portraits/p09.jpg';
import p10 from '@/assets/portraits/p10.jpg';
import p11 from '@/assets/portraits/p11.jpg';
import p12 from '@/assets/portraits/p12.jpg';

const MALE = [p01, p03, p05, p07, p09, p11];
const FEMALE = [p02, p04, p06, p08, p10, p12];

// Given names in the case credit list that read female.
const FEMALE_FIRST_NAMES = new Set([
  'elena', 'priya', 'naomi', 'simone', 'rina', 'bianca', 'camille', 'lena',
  'marisol', 'ingrid', 'colette', 'adaeze', 'marta', 'hollis', 'nadia',
  'sofia', 'sophia', 'clara', 'imani', 'greta', 'rosa', 'delphine', 'anika',
  'harriet', 'yara', 'tamsin', 'petra', 'noor', 'esme', 'cleo', 'thea',
  'juno', 'astrid', 'maeve', 'iris', 'linnea', 'saoirse', 'valentina',
  'beatriz', 'renata', 'aurelia', 'freya', 'zara', 'leila', 'mira', 'nadine',
]);

const hash = (s: string) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
};

export function portraitFor(name: string): string {
  const first = name.trim().split(/\s+/)[0].toLowerCase();
  const pool = FEMALE_FIRST_NAMES.has(first) ? FEMALE : MALE;
  return pool[hash(name) % pool.length];
}
