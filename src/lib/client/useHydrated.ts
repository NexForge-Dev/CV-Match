import { useSyncExternalStore } from "react";

const subscribe = () => () => undefined;

/** False in the server HTML and until React takes over: a form submitted before that would be a native GET. */
export function useHydrated() {
  return useSyncExternalStore(subscribe, () => true, () => false);
}
