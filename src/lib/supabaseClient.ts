import { createClient } from '@supabase/supabase-js';
import { collection, deleteDoc, doc, getDocs, getFirestore, setDoc } from 'firebase/firestore';
import { firebaseApp, isFirebaseConfigured } from './firebaseClient';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const portalTables = ['clients', 'vendors', 'supplier_agreements', 'products', 'freight_presets', 'quotes', 'quote_items', 'blogs', 'leads', 'inquiries', 'inquiry_quotations', 'inquiry_follow_ups', 'inquiry_attachments', 'activities', 'freight_rate_history', 'invoices', 'shipments', 'document_checklists', 'tasks', 'message_templates', 'app_users', 'activity_logs', 'team_messages', 'accounting_transactions'] as const;
const errorMessage = (error: unknown, fallback: string) => error instanceof Error ? error.message : fallback;
const localDbStorageKey = 'crixy_portal_db';
const maxLocalDbCacheBytes = 1_500_000;

const clearOversizedLocalDbCache = () => {
  if (typeof window === 'undefined') return;
  try {
    const cached = localStorage.getItem(localDbStorageKey);
    if (cached && cached.length > maxLocalDbCacheBytes) {
      localStorage.removeItem(localDbStorageKey);
    }
  } catch {
    localStorage.removeItem(localDbStorageKey);
  }
};

clearOversizedLocalDbCache();

const cleanUndefined = (obj: any): any => {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  const clean: any = Array.isArray(obj) ? [] : {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const val = obj[key];
      if (val !== undefined) {
        clean[key] = cleanUndefined(val);
      }
    }
  }
  return clean;
};

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

let onDatabaseMutationCallback: (() => void) | null = null;
export function setDatabaseMutationCallback(cb: () => void) {
  onDatabaseMutationCallback = cb;
}

// Server API-backed database client to allow persistent state in Replit/Local workspaces.
class ServerFileDB {
  private memCache: Map<string, { data: any[]; time: number }> = new Map();
  private inFlight: Map<string, Promise<any[]>> = new Map();

  private getLocalDB() {
    if (typeof window === 'undefined') return null;
    try {
      const data = localStorage.getItem(localDbStorageKey);
      if (data && data.length > maxLocalDbCacheBytes) {
        localStorage.removeItem(localDbStorageKey);
        return null;
      }
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.warn('Ignoring an invalid local database cache:', error);
      localStorage.removeItem(localDbStorageKey);
      return null;
    }
  }

  private saveLocalDB(db: any) {
    if (typeof window === 'undefined') return;
    try {
      const serialized = JSON.stringify(db);
      if (serialized.length > maxLocalDbCacheBytes) {
        localStorage.removeItem(localDbStorageKey);
        return;
      }
      localStorage.setItem(localDbStorageKey, serialized);
    } catch (error) {
      console.warn('Could not update the local database cache:', error);
    }
  }

  private async saveServerRecords(table: string, records: any[]) {
    const response = await fetch(`/api/db?table=${encodeURIComponent(table)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-portal-actor-email': typeof window !== 'undefined' ? localStorage.getItem('crixy_actor_email') || '' : '',
        'x-portal-actor-name': typeof window !== 'undefined' ? localStorage.getItem('crixy_actor_name') || '' : ''
      },
      body: JSON.stringify(records)
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(result.error || `Could not save ${table}`);
    }

    this.memCache.delete(table);
    if (onDatabaseMutationCallback) onDatabaseMutationCallback();
    return result.data || records;
  }

  private async deleteServerRecord(table: string, id: string) {
    const response = await fetch(`/api/db?table=${encodeURIComponent(table)}&id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: {
        'x-portal-actor-email': typeof window !== 'undefined' ? localStorage.getItem('crixy_actor_email') || '' : '',
        'x-portal-actor-name': typeof window !== 'undefined' ? localStorage.getItem('crixy_actor_name') || '' : ''
      }
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(result.error || `Could not delete ${table}`);
    }

    this.memCache.delete(table);
    if (onDatabaseMutationCallback) onDatabaseMutationCallback();
  }

  private async fetchTable(table: string): Promise<any[]> {
    if (typeof window === 'undefined') return [];

    const cached = this.memCache.get(table);
    if (cached && Date.now() - cached.time < 15000) {
      return cached.data;
    }

    const inFlightPromise = this.inFlight.get(table);
    if (inFlightPromise) {
      return inFlightPromise;
    }

    const fetchPromise = (async () => {
      try {
        const response = await fetch(`/api/db?table=${encodeURIComponent(table)}`, {
          headers: {
            'x-portal-actor-email': typeof window !== 'undefined' ? localStorage.getItem('crixy_actor_email') || '' : '',
            'x-portal-actor-name': typeof window !== 'undefined' ? localStorage.getItem('crixy_actor_name') || '' : ''
          }
        });
        if (response.ok) {
          const res = await response.json();
          const records = res.data || [];
          this.memCache.set(table, { data: records, time: Date.now() });
          return records;
        }
        if (response.status === 401) {
          const localDB = this.getLocalDB() || {};
          return localDB[table] || [];
        }
        if (process.env.NODE_ENV === 'production') {
          const result = await response.json().catch(() => ({}));
          throw new Error(result.error || `Could not load ${table}`);
        }
      } catch (e) {
        console.error(`Failed to fetch saved data for ${table}`, e);
        if (process.env.NODE_ENV === 'production') throw e;
      } finally {
        this.inFlight.delete(table);
      }

      const localDB = this.getLocalDB() || {};
      const fallback = localDB[table] || [];
      this.memCache.set(table, { data: fallback, time: Date.now() });
      return fallback;
    })();

    this.inFlight.set(table, fetchPromise);
    return fetchPromise;
  }

  from(table: string) {
    const fetchTable = () => this.fetchTable(table);

    return {
      select: (columns: string = '*', options?: any) => {
        const createQueryChain = (currentPromise: Promise<any[]>) => {
          const chainMethods: any = {
            order: (col: string, { ascending = true } = {}) => {
              const nextPromise = currentPromise.then(data => {
                const sorted = [...data];
                sorted.sort((a: any, b: any) => {
                  if (a[col] < b[col]) return ascending ? -1 : 1;
                  if (a[col] > b[col]) return ascending ? 1 : -1;
                  return 0;
                });
                return sorted;
              });
              return createQueryChain(nextPromise);
            },
            eq: (col: string, val: any) => {
              const nextPromise = currentPromise.then(data => data.filter((r: any) => r[col] === val));
              return createQueryChain(nextPromise);
            },
            neq: (col: string, val: any) => {
              const nextPromise = currentPromise.then(data => data.filter((r: any) => r[col] !== val));
              return createQueryChain(nextPromise);
            },
            in: (col: string, valArray: any[]) => {
              const nextPromise = currentPromise.then(data => data.filter((r: any) => valArray.includes(r[col])));
              return createQueryChain(nextPromise);
            },
            limit: (count: number) => {
              const nextPromise = currentPromise.then(data => data.slice(0, count));
              return createQueryChain(nextPromise);
            },
            single: () => {
              const singlePromise = currentPromise.then(data => ({
                data: data[0] || null,
                error: data[0] ? null : { message: 'Not found' }
              }));
              return makeChainPromise(singlePromise);
            }
          };

          const resultPromise = currentPromise.then(data => ({
            data: options?.head ? [] : data,
            count: data.length,
            error: null
          }));
          return makeChainPromise(resultPromise, chainMethods);
        };

        return createQueryChain(fetchTable());
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

          try {
            const savedRecords = await this.saveServerRecords(table, newRecords);
            localDB[table] = [...currentTableData, ...savedRecords];
            this.saveLocalDB(localDB);
            return { data: savedRecords, error: null };
          } catch (error) {
            return { data: newRecords, error: { message: error instanceof Error ? error.message : `Could not save ${table}` } };
          }
        })();

        const insertMethods = {
          select: () => {
            const selectMethods = {
              single: () => {
                const singlePromise = insertPromise.then(res => ({
                  data: res.data ? res.data[0] : null,
                  error: res.error || null
                }));
                return makeChainPromise(singlePromise);
              }
            };
            return makeChainPromise(insertPromise, selectMethods);
          }
        };

        return makeChainPromise(insertPromise, insertMethods);
      },
      upsert: (values: any) => {
        if (typeof window === 'undefined') {
          return makeChainPromise(Promise.resolve({ data: [], error: null }));
        }

        const upsertPromise = (async () => {
          const localDB = this.getLocalDB() || {};
          const currentTableData = localDB[table] || [];
          const valArray = Array.isArray(values) ? values : [values];
          
          const recordsToUpsert = valArray.map((value: any) => {
            const id = value.id || `${table.substring(0, 3)}-${Math.random().toString(36).slice(2, 11)}`;
            return {
              ...value,
              id,
              created_at: value.created_at || new Date().toISOString(),
              updated_at: new Date().toISOString()
            };
          });

          const updatedTableData = [...currentTableData];
          recordsToUpsert.forEach((rec: any) => {
            const idx = updatedTableData.findIndex((r: any) => r.id === rec.id);
            if (idx > -1) updatedTableData[idx] = { ...updatedTableData[idx], ...rec };
            else updatedTableData.push(rec);
          });
          localDB[table] = updatedTableData;
          this.saveLocalDB(localDB);

          try {
            const savedRecords = await this.saveServerRecords(table, recordsToUpsert);
            return { data: savedRecords, error: null };
          } catch (error) {
            return { data: recordsToUpsert, error: { message: error instanceof Error ? error.message : `Could not save ${table}` } };
          }
        })();

        const upsertMethods = {
          select: () => {
            const selectMethods = {
              single: () => {
                const singlePromise = upsertPromise.then(res => ({
                  data: res.data ? res.data[0] : null,
                  error: res.error || null
                }));
                return makeChainPromise(singlePromise);
              }
            };
            return makeChainPromise(upsertPromise, selectMethods);
          }
        };

        return makeChainPromise(upsertPromise, upsertMethods);
      },
      update: (values: any) => {
        return {
          eq: (col: string, val: any) => {
            const updatePromise = (async () => {
              const localDB = this.getLocalDB() || {};
              const currentTableData = localDB[table] || [];
              
              let updatedRecords: any[] = [];
              const newTableData = currentTableData.map((record: any) => {
                if (record[col] === val) {
                  const updated = { ...record, ...values, updated_at: new Date().toISOString() };
                  updatedRecords.push(updated);
                  return updated;
                }
                return record;
              });

              if (updatedRecords.length === 0) {
                if (col === 'id') {
                  const recordToSave = { ...values, id: val, updated_at: new Date().toISOString() };
                  updatedRecords = [recordToSave];
                  newTableData.push(recordToSave);
                } else {
                  const serverRecords = await this.fetchTable(table);
                  const matching = serverRecords.filter((r: any) => r[col] === val);
                  updatedRecords = matching.map((r: any) => ({ ...r, ...values, updated_at: new Date().toISOString() }));
                }
              }
              
              localDB[table] = newTableData;
              this.saveLocalDB(localDB);

              try {
                if (updatedRecords.length > 0) {
                  const saved = await this.saveServerRecords(table, updatedRecords);
                  return { data: saved, error: null };
                }
                return { data: [], error: null };
              } catch (error) {
                return { data: updatedRecords, error: { message: error instanceof Error ? error.message : `Could not update ${table}` } };
              }
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
              
              const deletedRecords = currentTableData.filter((record: any) => record[col] === val);
              const newTableData = currentTableData.filter((record: any) => record[col] !== val);
              localDB[table] = newTableData;
              this.saveLocalDB(localDB);

              try {
                if (col === 'id') {
                  await this.deleteServerRecord(table, String(val));
                } else if (deletedRecords.length > 0) {
                  await Promise.all(deletedRecords.map((record: any) => this.deleteServerRecord(table, record.id)));
                } else {
                  const serverRecords = await this.fetchTable(table);
                  const matching = serverRecords.filter((r: any) => r[col] === val);
                  await Promise.all(matching.map((r: any) => this.deleteServerRecord(table, r.id)));
                }
              } catch (error) {
                return { data: null, error: { message: error instanceof Error ? error.message : `Could not delete ${table}` } };
              }

              return { data: null, error: null };
            })();
            return makeChainPromise(deletePromise);
          },
          in: (col: string, valArray: any[]) => {
            const deletePromise = (async () => {
              const localDB = this.getLocalDB() || {};
              const currentTableData = localDB[table] || [];
              
              const deletedRecords = currentTableData.filter((record: any) => valArray.includes(record[col]));
              const newTableData = currentTableData.filter((record: any) => !valArray.includes(record[col]));
              localDB[table] = newTableData;
              this.saveLocalDB(localDB);

              try {
                if (col === 'id') {
                  await Promise.all(valArray.map((id: any) => this.deleteServerRecord(table, String(id))));
                } else if (deletedRecords.length > 0) {
                  await Promise.all(deletedRecords.map((record: any) => this.deleteServerRecord(table, record.id)));
                } else {
                  const serverRecords = await this.fetchTable(table);
                  const matching = serverRecords.filter((r: any) => valArray.includes(r[col]));
                  await Promise.all(matching.map((r: any) => this.deleteServerRecord(table, r.id)));
                }
              } catch (error) {
                return { data: null, error: { message: error instanceof Error ? error.message : `Could not delete ${table}` } };
              }

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
      const response = await fetch('/api/db?action=seed', { method: 'POST' });
      if (!response.ok) throw new Error('Could not seed the local database.');
    } catch (e) {
      console.error(e);
      throw e;
    }
  }

  async clearAllData() {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem('crixy_portal_db');
      const response = await fetch('/api/db?action=clear', { method: 'POST' });
      if (!response.ok) throw new Error('Could not clear the local database.');
    } catch (e) {
      console.error(e);
      throw e;
    }
  }
}

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey && supabaseUrl !== 'your_supabase_project_url');

class FirebaseDB {
  private db = getFirestore(firebaseApp!);
  private tableCache = new Map<string, { data: any[]; timestamp: number }>();
  private inFlightRequests = new Map<string, Promise<any[]>>();
  private cacheTTL = 30_000; // 30 seconds TTL for fast client navigation

  private invalidateCache(table: string) {
    this.tableCache.delete(table);
    this.inFlightRequests.delete(table);
    if (table === 'quote_items' || table === 'clients') {
      this.tableCache.delete('quotes');
      this.inFlightRequests.delete('quotes');
    }
  }

  private async fetchRawTable(table: string): Promise<any[]> {
    const now = Date.now();
    const cached = this.tableCache.get(table);
    if (cached && now - cached.timestamp < this.cacheTTL) {
      return cached.data;
    }

    if (this.inFlightRequests.has(table)) {
      return this.inFlightRequests.get(table)!;
    }

    const request = (async () => {
      try {
        const snapshot = await getDocs(collection(this.db, table));
        const data = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
        this.tableCache.set(table, { data, timestamp: Date.now() });
        return data;
      } finally {
        this.inFlightRequests.delete(table);
      }
    })();

    this.inFlightRequests.set(table, request);
    return request;
  }

  private async fetchTable(table: string): Promise<any[]> {
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
    } catch (error) {
      throw new Error(errorMessage(error, `Could not load ${table} from Firebase.`));
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
          const cleanedRecord = cleanUndefined(record);
          await setDoc(doc(this.db, table, id), cleanedRecord, { merge: true });
          saved.push(record);
        }

        this.invalidateCache(table);
        return { data: saved, error: null };
      } catch (error) {
        return { data: [], error: { message: errorMessage(error, `Could not save ${table} to Firebase.`) } };
      }
    };

    return {
      select: () => {
        const fetchPromise = fetchTable();
        const basePromise = fetchPromise.then(data => ({ data, error: null }));

        const selectMethods = {
          order: (col: string, { ascending = true } = {}) => {
            const orderPromise = fetchPromise.then(data => {
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
            const eqPromise = fetchPromise.then(data => ({
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
            const res = await writeRecords(matches.map((record: any) => ({ ...record, ...values })));
            this.invalidateCache(table);
            return res;
          } catch (error) {
            return { data: [], error: { message: errorMessage(error, `Could not update ${table} in Firebase.`) } };
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

            this.invalidateCache(table);
            return { data: null, error: null };
          } catch (error) {
            return { data: null, error: { message: errorMessage(error, `Could not delete ${table} from Firebase.`) } };
          }
        })()),
        in: (col: string, valArray: any[]) => makeChainPromise((async () => {
          try {
            const snapshot = await getDocs(collection(this.db, table));
            const matches = snapshot.docs
              .map((item) => ({ id: item.id, ...item.data() }))
              .filter((record: any) => valArray.includes(record[col]));

            for (const record of matches) {
              await deleteDoc(doc(this.db, table, record.id));
            }

            this.invalidateCache(table);
            return { data: null, error: null };
          } catch (error) {
            return { data: null, error: { message: errorMessage(error, `Could not delete ${table} from Firebase.`) } };
          }
        })())
      })
    };
  }

  async seedMockData() {
    throw new Error('Demo seeding is only available in local database mode.');
  }

  async clearAllData() {
    for (const table of portalTables) {
      const snapshot = await getDocs(collection(this.db, table));
      for (let start = 0; start < snapshot.docs.length; start += 100) {
        await Promise.all(snapshot.docs.slice(start, start + 100).map((item) => deleteDoc(doc(this.db, table, item.id))));
      }
    }
    if (typeof window !== 'undefined') localStorage.removeItem('crixy_portal_db');
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
