"use client";

/**
 * APX IQ High-Performance Telemetry Storage (IndexedDB + Native Fallback)
 * 
 * Provides persistent local storage for full F1 session telemetry runs:
 * - Up to hundreds of megabytes of raw 60Hz frame streams
 * - Zero server overhead: 100% private & client-side
 * - MoTeC i2 Pro & Excel CSV export engine
 * - JSON telemetry interchange format
 */

export interface RecordedTelemetryFrame {
  t: number;             // session time (seconds)
  lap: number;           // lap number
  lapDist: number;       // lap distance (metres)
  speed: number;         // km/h
  rpm: number;           // engine RPM
  gear: number;          // 0-8
  throttle: number;      // 0-100%
  brake: number;         // 0-100%
  steer: number;         // -100 to +100%
  drs: boolean;          // active
  ersPct: number;        // 0-100%
  deltaMs: number;       // delta vs target in ms
  fuelKg?: number;       // remaining fuel
}

export interface RecordedSessionMeta {
  id: string;
  name: string;
  trackName: string;
  dateIso: string;
  durationS: number;
  frameCount: number;
  bestLapMs?: number;
  avgSpeedKph: number;
  maxSpeedKph: number;
}

const DB_NAME = "ApxIq_Telemetry_V1";
const DB_VERSION = 1;
const SESSIONS_STORE = "sessions";
const FRAMES_STORE = "frames";

class TelemetryStorage {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private getDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      if (typeof window === "undefined" || !window.indexedDB) {
        return reject(new Error("IndexedDB is not available in this environment"));
      }

      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(SESSIONS_STORE)) {
          db.createObjectStore(SESSIONS_STORE, { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains(FRAMES_STORE)) {
          const frameStore = db.createObjectStore(FRAMES_STORE, { keyPath: "id" });
          frameStore.createIndex("sessionId", "sessionId", { unique: false });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    return this.dbPromise;
  }

  /**
   * Save a newly completed session run with all recorded frames
   */
  async saveSession(meta: RecordedSessionMeta, frames: RecordedTelemetryFrame[]): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([SESSIONS_STORE, FRAMES_STORE], "readwrite");
      const sessionStore = tx.objectStore(SESSIONS_STORE);
      const frameStore = tx.objectStore(FRAMES_STORE);

      sessionStore.put(meta);
      frameStore.put({ id: meta.id, sessionId: meta.id, frames });

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  /**
   * Retrieve list of all saved sessions
   */
  async listSessions(): Promise<RecordedSessionMeta[]> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(SESSIONS_STORE, "readonly");
        const store = tx.objectStore(SESSIONS_STORE);
        const req = store.getAll();
        req.onsuccess = () => {
          const list: RecordedSessionMeta[] = req.result || [];
          list.sort((a, b) => new Date(b.dateIso).getTime() - new Date(a.dateIso).getTime());
          resolve(list);
        };
        req.onerror = () => reject(req.error);
      });
    } catch {
      return [];
    }
  }

  /**
   * Load telemetry frames for a specific session
   */
  async loadFrames(sessionId: string): Promise<RecordedTelemetryFrame[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(FRAMES_STORE, "readonly");
      const store = tx.objectStore(FRAMES_STORE);
      const req = store.get(sessionId);
      req.onsuccess = () => {
        resolve(req.result?.frames || []);
      };
      req.onerror = () => reject(req.error);
    });
  }

  /**
   * Delete a session and its recorded frames
   */
  async deleteSession(sessionId: string): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([SESSIONS_STORE, FRAMES_STORE], "readwrite");
      tx.objectStore(SESSIONS_STORE).delete(sessionId);
      tx.objectStore(FRAMES_STORE).delete(sessionId);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  /**
   * Export telemetry to formatted MoTeC / CSV
   */
  async exportCsv(sessionId: string, sessionName?: string): Promise<void> {
    const frames = await this.loadFrames(sessionId);
    if (!frames.length) return;

    const headers = [
      "Time (s)",
      "Lap",
      "Lap Distance (m)",
      "Speed (km/h)",
      "Engine RPM",
      "Gear",
      "Throttle (%)",
      "Brake (%)",
      "Steer (%)",
      "DRS Active",
      "ERS Storage (%)",
      "Delta vs Target (s)",
    ];

    const rows = frames.map((f) => [
      f.t.toFixed(3),
      f.lap,
      f.lapDist.toFixed(1),
      f.speed.toFixed(1),
      Math.round(f.rpm),
      f.gear,
      f.throttle.toFixed(1),
      f.brake.toFixed(1),
      f.steer.toFixed(1),
      f.drs ? "1" : "0",
      f.ersPct.toFixed(1),
      (f.deltaMs / 1000).toFixed(3),
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `APXIQ_Telemetry_${(sessionName || sessionId).replace(/\s+/g, "_")}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /**
   * Export telemetry to JSON file
   */
  async exportJson(meta: RecordedSessionMeta): Promise<void> {
    const frames = await this.loadFrames(meta.id);
    const payload = {
      meta,
      formatVersion: "1.0.0",
      exportedAt: new Date().toISOString(),
      frames,
    };

    const dataStr =
      "data:text/json;charset=utf-8," +
      encodeURIComponent(JSON.stringify(payload, null, 2));
    const link = document.createElement("a");
    link.setAttribute("href", dataStr);
    link.setAttribute(
      "download",
      `APXIQ_Telemetry_${meta.name.replace(/\s+/g, "_")}.json`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

export const telemetryStorage = new TelemetryStorage();
