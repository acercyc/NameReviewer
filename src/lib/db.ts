import { openDB, DBSchema } from 'idb';

export interface Person {
  id: string;
  name: string;
  photoData: string; // base64
  audioData?: string; // base64
  repetition: number;
  interval: number;
  easeFactor: number;
  nextReviewDate: number;
}

interface NameDB extends DBSchema {
  people: {
    key: string;
    value: Person;
  };
}

const dbPromise = openDB<NameDB>('name-remember-db', 1, {
  upgrade(db) {
    db.createObjectStore('people', { keyPath: 'id' });
  },
});

export async function addPerson(person: Person) {
  const db = await dbPromise;
  await db.put('people', person);
}

export async function getPeople() {
  const db = await dbPromise;
  return db.getAll('people');
}

export async function getPerson(id: string) {
  const db = await dbPromise;
  return db.get('people', id);
}

export async function updatePerson(person: Person) {
  const db = await dbPromise;
  await db.put('people', person);
}

export async function deletePerson(id: string) {
  const db = await dbPromise;
  await db.delete('people', id);
}
