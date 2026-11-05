import { useLayoutEffect, useRef, useState } from "react";

/** The value in the page, which a person or a password manager may have filled in before React arrived. */
export function fieldValue(id: string): string {
  return (document.getElementById(id) as HTMLInputElement | null)?.value ?? "";
}

/**
 * False in the server HTML and until React takes over: a form submitted before that would be a native GET.
 *
 * Text typed before hydration exists only in the DOM. Hydration leaves it there, but the first re-render writes
 * the controlled value (still "") back and erases it, and this flag is such a re-render. `adopt` copies the DOM
 * into state first, in the same commit, so a controlled field never renders over what was typed.
 */
export function useHydrated(adopt?: () => void) {
  const [hydrated, setHydrated] = useState(false);
  const adoptOnce = useRef(adopt);
  useLayoutEffect(() => {
    adoptOnce.current?.();
    setHydrated(true);
  }, []);
  return hydrated;
}
