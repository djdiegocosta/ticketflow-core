const KEY = "ticketflow-last-org";

export function setLastVisitedOrg(orgId: string): void {
  try {
    window.localStorage.setItem(KEY, orgId);
  } catch {
    // Ignora erros de localStorage (ex: em modo anônimo)
  }
}

export function getLastVisitedOrg(): string | null {
  try {
    return window.localStorage.getItem(KEY);
  } catch {
    return null;
  }
}
