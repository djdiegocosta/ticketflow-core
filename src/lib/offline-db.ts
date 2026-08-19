
const DB_NAME = 'ticketflow_offline';
const DB_VERSION = 1;

export interface OfflineTicket {
  code: string;
  name: string;
  eventName: string;
  status: 'valid' | 'already_used' | 'invalid';
  synced?: boolean;
}

export interface SyncItem {
  id: string;
  code: string;
  eventName: string;
  timestamp: number;
}

export class OfflineDB {
  private db: IDBDatabase | null = null;

  async init(): Promise<IDBDatabase> {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        if (!db.objectStoreNames.contains('event_tickets')) {
          db.createObjectStore('event_tickets', { keyPath: 'code' });
        }
        
        if (!db.objectStoreNames.contains('checkin_sync_queue')) {
          db.createObjectStore('checkin_sync_queue', { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains('my_tickets')) {
          db.createObjectStore('my_tickets', { keyPath: 'id' });
        }
      };

      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        resolve(this.db);
      };

      request.onerror = (event) => {
        reject((event.target as IDBOpenDBRequest).error);
      };
    });
  }

  async saveTickets(tickets: OfflineTicket[]): Promise<void> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['event_tickets'], 'readwrite');
      const store = transaction.objectStore('event_tickets');
      
      tickets.forEach(ticket => store.put(ticket));
      
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async getTicket(code: string): Promise<OfflineTicket | null> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['event_tickets'], 'readonly');
      const store = transaction.objectStore('event_tickets');
      const request = store.get(code);
      
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async updateTicketStatus(code: string, status: OfflineTicket['status']): Promise<void> {
    const ticket = await this.getTicket(code);
    if (ticket) {
      ticket.status = status;
      const db = await this.init();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(['event_tickets'], 'readwrite');
        const store = transaction.objectStore('event_tickets');
        store.put(ticket);
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      });
    }
  }

  async addToSyncQueue(item: SyncItem): Promise<void> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['checkin_sync_queue'], 'readwrite');
      const store = transaction.objectStore('checkin_sync_queue');
      store.put(item);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async getSyncQueue(): Promise<SyncItem[]> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['checkin_sync_queue'], 'readonly');
      const store = transaction.objectStore('checkin_sync_queue');
      const request = store.getAll();
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async clearSyncQueue(): Promise<void> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['checkin_sync_queue'], 'readwrite');
      const store = transaction.objectStore('checkin_sync_queue');
      store.clear();
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async saveMyTickets(tickets: any[]): Promise<void> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['my_tickets'], 'readwrite');
      const store = transaction.objectStore('my_tickets');
      tickets.forEach(t => store.put(t));
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async getMyTickets(): Promise<any[]> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['my_tickets'], 'readonly');
      const store = transaction.objectStore('my_tickets');
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
}

export const offlineDB = new OfflineDB();
