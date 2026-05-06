import { 
  collection, 
  getDocs, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy, 
  onSnapshot 
} from 'firebase/firestore';
import { db, OperationType, handleFirestoreError } from '../lib/firebase';
import { Product, Settings } from '../types';

const PRODUCTS_COLLECTION = 'products';
const SETTINGS_COLLECTION = 'settings';
const GLOBAL_SETTINGS_ID = 'global';

export const firebaseService = {
  // PRODUCTS
  async getAllProducts() {
    try {
      const q = query(collection(db, PRODUCTS_COLLECTION), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, PRODUCTS_COLLECTION);
      return [];
    }
  },

  async getProductById(id: string) {
    try {
      const docRef = doc(db, PRODUCTS_COLLECTION, id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as Product;
      }
      return null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `${PRODUCTS_COLLECTION}/${id}`);
      return null;
    }
  },

  // SETTINGS
  async getSettings() {
    try {
      const docRef = doc(db, SETTINGS_COLLECTION, GLOBAL_SETTINGS_ID);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return docSnap.data() as Settings;
      }
      return null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `${SETTINGS_COLLECTION}/${GLOBAL_SETTINGS_ID}`);
      return null;
    }
  }
};
