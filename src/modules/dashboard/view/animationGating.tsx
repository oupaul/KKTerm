import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

const DashboardAnimationActiveContext = createContext(true);

export function useDashboardAnimationActive(): boolean {
  return useContext(DashboardAnimationActiveContext);
}

function isDocumentVisible(): boolean {
  if (typeof document === "undefined") return true;
  return !document.hidden;
}

function isWindowFocused(): boolean {
  if (typeof document === "undefined") return true;
  return document.hasFocus();
}

export function useEnvironmentVisible(): boolean {
  const [visible, setVisible] = useState<boolean>(() => isDocumentVisible() && isWindowFocused());

  useEffect(() => {
    function sync() {
      setVisible(isDocumentVisible() && isWindowFocused());
    }
    document.addEventListener("visibilitychange", sync);
    window.addEventListener("focus", sync);
    window.addEventListener("blur", sync);
    return () => {
      document.removeEventListener("visibilitychange", sync);
      window.removeEventListener("focus", sync);
      window.removeEventListener("blur", sync);
    };
  }, []);

  return visible;
}

export function DashboardAnimationGate({
  active,
  children,
}: {
  active: boolean;
  children: ReactNode;
}) {
  const environmentVisible = useEnvironmentVisible();
  return (
    <DashboardAnimationActiveContext.Provider value={active && environmentVisible}>
      {children}
    </DashboardAnimationActiveContext.Provider>
  );
}
