// Firestore del proyecto penke-e6555. En App Hosting las credenciales llegan
// por Application Default Credentials; no hace falta configurar nada más.
import { getApps, initializeApp } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

let db: Firestore | null = null;

export function firestore(): Firestore {
  if (!db) {
    if (getApps().length === 0) initializeApp();
    db = getFirestore();
  }
  return db;
}

export const VERIFICACIONES = "verificaciones";
