import { describe, expect, it } from "bun:test";
import { createAuthSnapshotStore } from "../src/lib/auth-snapshot-core";

/**
 * Protege a arquitetura de carregamento (docs/OTIMIZACAO-CARREGAMENTO.md):
 * papel + organização buscados em paralelo, sem duplicar consulta, com cache
 * curto e sem cachear falha.
 */
function makeStore(overrides: Partial<Parameters<typeof createAuthSnapshotStore>[0]> = {}) {
  const calls = { role: 0, org: 0 };
  let clock = 0;
  const store = createAuthSnapshotStore({
    fetchRole: async () => {
      calls.role += 1;
      return { data: "admin", error: null };
    },
    fetchOrganization: async () => {
      calls.org += 1;
      return { data: "org-1", error: null };
    },
    now: () => clock,
    sleep: async () => {},
    ...overrides,
  });
  return { store, calls, advance: (ms: number) => (clock += ms) };
}

describe("authSnapshot", () => {
  it("starts role and organization queries in parallel, not one after the other", async () => {
    const started: string[] = [];
    let releaseRole!: () => void;
    const roleGate = new Promise<void>((resolve) => (releaseRole = resolve));
    const { store } = makeStore({
      fetchRole: async () => {
        started.push("role");
        await roleGate;
        return { data: "admin", error: null };
      },
      fetchOrganization: async () => {
        started.push("org");
        return { data: "org-1", error: null };
      },
    });

    const pending = store.get("u1");
    await Promise.resolve();
    // A consulta de organização já começou mesmo com o papel ainda pendente.
    expect(started).toEqual(["role", "org"]);
    releaseRole();
    expect(await pending).toEqual({
      userId: "u1",
      role: "admin",
      organizationId: "org-1",
      hadError: false,
    });
  });

  it("joins simultaneous callers into a single round of queries", async () => {
    const { store, calls } = makeStore();
    await Promise.all([store.get("u1"), store.get("u1"), store.get("u1")]);
    expect(calls).toEqual({ role: 1, org: 1 });
  });

  it("reuses a fresh snapshot for the same user and refetches after the TTL", async () => {
    const { store, calls, advance } = makeStore({ ttlMs: 30_000 });
    await store.get("u1");
    advance(10_000);
    await store.get("u1");
    expect(calls).toEqual({ role: 1, org: 1 });
    advance(21_000);
    await store.get("u1");
    expect(calls).toEqual({ role: 2, org: 2 });
  });

  it("does not reuse the snapshot of another user", async () => {
    const { store, calls } = makeStore();
    await store.get("u1");
    await store.get("u2");
    expect(calls).toEqual({ role: 2, org: 2 });
  });

  it("force refetches even with a fresh snapshot", async () => {
    const { store, calls } = makeStore();
    await store.get("u1");
    await store.get("u1", { force: true });
    expect(calls).toEqual({ role: 2, org: 2 });
  });

  it('retries once on error and recovers without falling back to "cliente"', async () => {
    let attempts = 0;
    const { store } = makeStore({
      fetchRole: async () => {
        attempts += 1;
        return attempts === 1
          ? { data: null, error: new Error("jwt refreshing") }
          : { data: "admin", error: null };
      },
    });
    const snapshot = await store.get("u1");
    expect(attempts).toBe(2);
    expect(snapshot.role).toBe("admin");
    expect(snapshot.hadError).toBe(false);
  });

  it("never caches a snapshot that had an error", async () => {
    const { store, calls } = makeStore({
      fetchOrganization: async () => ({ data: null, error: new Error("down") }),
    });
    const first = await store.get("u1");
    expect(first.hadError).toBe(true);
    expect(first.organizationId).toBeNull();
    const callsAfterFirst = calls.role;
    await store.get("u1");
    expect(calls.role).toBe(callsAfterFirst + 1);
  });

  it('defaults to role "cliente" when the user has no role row', async () => {
    const { store } = makeStore({ fetchRole: async () => ({ data: null, error: null }) });
    expect((await store.get("u1")).role).toBe("cliente");
  });

  it("clear() drops the cache, the validation mark and late in-flight results", async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    const { store, calls } = makeStore({
      fetchRole: async () => {
        await gate;
        return { data: "admin", error: null };
      },
    });
    store.markValidated("u1");
    expect(store.isValidated("u1")).toBe(true);

    const inflight = store.get("u1");
    store.clear(); // logout no meio da consulta
    release();
    await inflight;

    expect(store.isValidated("u1")).toBe(false);
    // Resultado atrasado não repopulou o cache: a próxima chamada consulta de novo.
    await store.get("u1");
    expect(calls.org).toBe(2);
  });

  it("server validation mark expires with the TTL and is per user", () => {
    const { store, advance } = makeStore({ ttlMs: 30_000 });
    store.markValidated("u1");
    expect(store.isValidated("u1")).toBe(true);
    expect(store.isValidated("u2")).toBe(false);
    advance(30_001);
    expect(store.isValidated("u1")).toBe(false);
  });
});
