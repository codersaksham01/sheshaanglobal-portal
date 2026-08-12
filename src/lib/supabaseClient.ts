import { createClient } from '@supabase/supabase-js';
import { collection, deleteDoc, doc, getDocs, getFirestore, setDoc } from 'firebase/firestore';
import { firebaseApp, isFirebaseConfigured } from './firebaseClient';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Decorated Promise that emulates Supabase query chaining.
function makeChainPromise(promise: Promise<any>, extra: any = {}): any {
  const chainObj: any = {
    then: (onfulfilled: any, onrejected?: any) => {
      return makeChainPromise(promise.then(onfulfilled, onrejected), extra);
    },
    catch: (onrejected: any) => {
      return makeChainPromise(promise.catch(onrejected), extra);
    },
    finally: (onfinally: any) => {
      return makeChainPromise(promise.finally(onfinally), extra);
    }
  };

  // Assign extra methods
  Object.keys(extra).forEach(key => {
    chainObj[key] = extra[key];
  });

  return chainObj;
}

// Server API-backed database client to allow persistent state in Replit/Local workspaces.
class ServerFileDB {
  private getLocalDB() {
    if (typeof window === 'undefined') return null;
    const data = localStorage.getItem('crixy_portal_db');
    return data ? JSON.parse(data) : null;
  }

  private saveLocalDB(db: any) {
    if (typeof window === 'undefined') return;
    localStorage.setItem('crixy_portal_db', JSON.stringify(db));
  }

  private async fetchTable(table: string): Promise<any[]> {
    if (typeof window === 'undefined') return [];
    
    let localDB = this.getLocalDB();
    if (!localDB) {
      localDB = {};
    }
    
    if (!localDB[table]) {
      try {
        const response = await fetch(`/api/db?table=${table}`);
        if (response.ok) {
          const res = await response.json();
          localDB[table] = res.data || [];
          this.saveLocalDB(localDB);
        }
      } catch (e) {
        console.error(`Failed to fetch initial seed for ${table}`, e);
      }
    }
    
    return localDB[table] || [];
  }

  from(table: string) {
    const fetchTable = () => this.fetchTable(table);

    return {
      select: (columns: string = '*') => {
        const basePromise = fetchTable().then(data => ({ data, error: null }));

        const selectMethods = {
          order: (col: string, { ascending = true } = {}) => {
            const orderPromise = fetchTable().then(data => {
              const sorted = [...data];
              sorted.sort((a: any, b: any) => {
                if (a[col] < b[col]) return ascending ? -1 : 1;
                if (a[col] > b[col]) return ascending ? 1 : -1;
                return 0;
              });
              return { data: sorted, error: null };
            });
            return makeChainPromise(orderPromise);
          },
          eq: (col: string, val: any) => {
            const eqPromise = fetchTable().then(data => {
              const filtered = data.filter((r: any) => r[col] === val);
              return { data: filtered, error: null };
            });

            const eqMethods = {
              single: () => {
                const singlePromise = eqPromise.then(res => ({
                  data: res.data[0] || null,
                  error: res.data[0] ? null : { message: 'Not found' }
                }));
                return makeChainPromise(singlePromise);
              }
            };

            return makeChainPromise(eqPromise, eqMethods);
          }
        };

        return makeChainPromise(basePromise, selectMethods);
      },
      insert: (values: any) => {
        if (typeof window === 'undefined') {
          return makeChainPromise(Promise.resolve({ data: [], error: null }));
        }

        const insertPromise = (async () => {
          const localDB = this.getLocalDB() || {};
          const currentTableData = localDB[table] || [];
          const valArray = Array.isArray(values) ? values : [values];
          
          const newRecords = valArray.map((value: any) => {
            const id = value.id || `${table.substring(0, 3)}-${Math.random().toString(36).slice(2, 11)}`;
            return {
              ...value,
              id,
              created_at: value.created_at || new Date().toISOString(),
              updated_at: new Date().toISOString()
            };
          });
          
          localDB[table] = [...currentTableData, ...newRecords];
          this.saveLocalDB(localDB);
          return { data: newRecords, error: null };
        })();

        const insertMethods = {
          select: () => {
            const selectMethods = {
              single: () => {
                const singlePromise = insertPromise.then(res => ({
                  data: res.data[0] || null,
                  error: null
                }));
                return makeChainPromise(singlePromise);
              }
            };
            return makeChainPromise(insertPromise, selectMethods);
          }
        };

        return makeChainPromise(insertPromise, insertMethods);
      },
      update: (values: any) => {
        return {
          eq: (col: string, val: any) => {
            const updatePromise = (async () => {
              const localDB = this.getLocalDB() || {};
              const currentTableData = localDB[table] || [];
              
              const updatedRecords: any[] = [];
              const newTableData = currentTableData.map((record: any) => {
                if (record[col] === val) {
                  const updated = { ...record, ...values, updated_at: new Date().toISOString() };
                  updatedRecords.push(updated);
                  return updated;
                }
                return record;
              });
              
              localDB[table] = newTableData;
              this.saveLocalDB(localDB);
              return { data: updatedRecords, error: null };
            })();
            return makeChainPromise(updatePromise);
          }
        };
      },
      delete: () => {
        return {
          eq: (col: string, val: any) => {
            const deletePromise = (async () => {
              const localDB = this.getLocalDB() || {};
              const currentTableData = localDB[table] || [];
              
              const newTableData = currentTableData.filter((record: any) => record[col] !== val);
              localDB[table] = newTableData;
              this.saveLocalDB(localDB);
              return { data: null, error: null };
            })();
            return makeChainPromise(deletePromise);
          }
        };
      }
    };
  }

  async seedMockData() {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem('crixy_portal_db');
      await fetch('/api/db?action=seed', { method: 'POST' });
    } catch (e) {
      console.error(e);
    }
  }

  async clearAllData() {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem('crixy_portal_db');
      await fetch('/api/db?action=clear', { method: 'POST' });
    } catch (e) {
      console.error(e);
    }
  }
}

const isSupabaseConfigured = supabaseUrl && supabaseAnonKey && supabaseUrl !== 'your_supabase_project_url';

class FirebaseDB {
  private db = getFirestore(firebaseApp!);
  private fallback = new ServerFileDB();

  private async fetchRawTable(table: string) {
    const snapshot = await getDocs(collection(this.db, table));
    return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
  }

  private async fetchTable(table: string) {
    try {
      const records = await this.fetchRawTable(table);

      if (table === 'quotes') {
        const [clients, quoteItems] = await Promise.all([
          this.fetchRawTable('clients'),
          this.fetchRawTable('quote_items')
        ]);

        return records.map((quote: any) => ({
          ...quote,
          client: clients.find((client: any) => client.id === quote.client_id) || quote.client || null,
          items: quoteItems.filter((item: any) => item.quote_id === quote.id)
        }));
      }

      return records;
    } catch {
      const fallbackResult = await this.fallback.from(table).select();
      return fallbackResult.data || [];
    }
  }

  from(table: string) {
    const fetchTable = () => this.fetchTable(table);
    const writeRecords = async (values: any) => {
      const valArray = Array.isArray(values) ? values : [values];
      const saved: any[] = [];

      try {
        for (const value of valArray) {
          const id = value.id || `${table.substring(0, 3)}-${Math.random().toString(36).slice(2, 11)}`;
          const record = {
            ...value,
            id,
            updated_at: new Date().toISOString(),
            created_at: value.created_at || new Date().toISOString()
          };
          await setDoc(doc(this.db, table, id), record, { merge: true });
          saved.push(record);
        }

        return { data: saved, error: null };
      } catch {
        return await this.fallback.from(table).insert(values);
      }
    };

    return {
      select: () => {
        const basePromise = fetchTable().then(data => ({ data, error: null }));

        const selectMethods = {
          order: (col: string, { ascending = true } = {}) => {
            const orderPromise = fetchTable().then(data => {
              data.sort((a: any, b: any) => {
                if (a[col] < b[col]) return ascending ? -1 : 1;
                if (a[col] > b[col]) return ascending ? 1 : -1;
                return 0;
              });
              return { data, error: null };
            });
            return makeChainPromise(orderPromise);
          },
          eq: (col: string, val: any) => {
            const eqPromise = fetchTable().then(data => ({
              data: data.filter((r: any) => r[col] === val),
              error: null
            }));

            return makeChainPromise(eqPromise, {
              single: () => makeChainPromise(eqPromise.then(res => ({
                data: res.data[0] || null,
                error: res.data[0] ? null : { message: 'Not found' }
              })))
            });
          }
        };

        return makeChainPromise(basePromise, selectMethods);
      },
      insert: (values: any) => {
        const insertPromise = writeRecords(values);
        return makeChainPromise(insertPromise, {
          select: () => makeChainPromise(insertPromise, {
            single: () => makeChainPromise(insertPromise.then(res => ({ data: res.data[0] || null, error: null })))
          })
        });
      },
      update: (values: any) => ({
        eq: (col: string, val: any) => makeChainPromise((async () => {
          try {
            const data = await this.fetchRawTable(table);
            const matches = data.filter((r: any) => r[col] === val);
            if (!matches.length) return { data: [], error: null };
            return writeRecords(matches.map((record: any) => ({ ...record, ...values })));
          } catch {
            return await this.fallback.from(table).update(values).eq(col, val);
          }
        })())
      }),
      delete: () => ({
        eq: (col: string, val: any) => makeChainPromise((async () => {
          try {
            const snapshot = await getDocs(collection(this.db, table));
            const matches = snapshot.docs
              .map((item) => ({ id: item.id, ...item.data() }))
              .filter((record: any) => record[col] === val);

            for (const record of matches) {
              await deleteDoc(doc(this.db, table, record.id));
            }

            return { data: null, error: null };
          } catch {
            return await this.fallback.from(table).delete().eq(col, val);
          }
        })())
      })
    };
  }

  async seedMockData() {
    await this.fallback.seedMockData();
  }

  async clearAllData() {
    await this.fallback.clearAllData();
  }
}

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : isFirebaseConfigured
    ? (new FirebaseDB() as any)
    : (new ServerFileDB() as any);

export const dbType = isSupabaseConfigured
  ? 'Supabase Database'
  : isFirebaseConfigured
    ? 'Firebase Cloud Firestore'
    : 'Persistent File-Backed Database (db.json)';
export const isMock = !isSupabaseConfigured && !isFirebaseConfigured;
export const mockDB = isMock ? (supabase as any) : null;
export const isFirebase = isFirebaseConfigured && !isSupabaseConfigured;
