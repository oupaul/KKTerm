import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
  type RefObject,
} from "react";

const DashboardAnimationActiveContext = createContext(true);

export function useDashboardAnimationActive(): boolean {
  return useContext(DashboardAnimationActiveContext);
}

function isDocumentVisible(): boolean {
  if (typeof document === "undefined") return true;
  return !document.hidden;
}

// Window-focus changes are intentionally ignored: backgrounds keep playing
// while the app is visible behind other OS windows. Only document visibility
// (which flips when the window is minimized or the page is hidden) pauses
// playback at the environment level.
export function useEnvironmentVisible(): boolean {
  const [visible, setVisible] = useState<boolean>(() => isDocumentVisible());

  useEffect(() => {
    function sync() {
      setVisible(isDocumentVisible());
    }
    document.addEventListener("visibilitychange", sync);
    return () => {
      document.removeEventListener("visibilitychange", sync);
    };
  }, []);

  return visible;
}

export function useElementOnScreen<T extends Element>(
  ref: RefObject<T | null>,
): boolean {
  const [onScreen, setOnScreen] = useState<boolean>(true);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    if (typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          setOnScreen(entry.isIntersecting);
        }
      },
      { threshold: 0 },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);

  return onScreen;
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
