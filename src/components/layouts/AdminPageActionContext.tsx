import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

const AdminPageActionContext = createContext<{
  action: ReactNode;
  setAction: (action: ReactNode) => void;
}>({ action: null, setAction: () => {} });

export function AdminPageActionProvider({ children }: { children: ReactNode }) {
  const [action, setAction] = useState<ReactNode>(null);
  return <AdminPageActionContext.Provider value={{ action, setAction }}>{children}</AdminPageActionContext.Provider>;
}

export function useAdminPageAction(action: ReactNode) {
  const { setAction } = useContext(AdminPageActionContext);
  useEffect(() => {
    setAction(action);
    return () => setAction(null);
  }, [action, setAction]);
}

export function useAdminPageActionValue() {
  return useContext(AdminPageActionContext).action;
}
