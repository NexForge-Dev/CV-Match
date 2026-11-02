"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Alert } from "@/components/ui";
import { useI18n } from "@/lib/i18n/client";
import { TURNSTILE_SCRIPT_URL, canSubmitWithCaptcha, captchaOptions, turnstileLanguage, turnstileSiteKey } from "@/lib/captcha";

type TurnstileApi = {
  render: (el: HTMLElement, options: Record<string, unknown>) => string;
  reset: (id: string) => void;
  remove: (id: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const SITE_KEY = turnstileSiteKey(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY);

let loading: Promise<TurnstileApi> | null = null;

function loadTurnstile(): Promise<TurnstileApi> {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (!loading) {
    loading = new Promise<TurnstileApi>((resolve, reject) => {
      const script = document.createElement("script");
      script.src = TURNSTILE_SCRIPT_URL;
      script.async = true;
      script.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error("turnstile_missing")));
      script.onerror = () => reject(new Error("turnstile_load_failed"));
      document.head.appendChild(script);
    }).catch((err) => {
      loading = null; // allow a retry on the next mount
      throw err;
    });
  }
  return loading;
}

function TurnstileWidget({ siteKey, onToken, resetSignal }: { siteKey: string; onToken: (token: string | null) => void; resetSignal: number }) {
  const { t, locale } = useI18n();
  const container = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadTurnstile()
      .then((ts) => {
        if (cancelled || !container.current) return;
        widgetId.current = ts.render(container.current, {
          sitekey: siteKey,
          language: turnstileLanguage(locale),
          callback: (token: string) => onToken(token),
          // Tokens are single-use and expire after 5 minutes: clear them so the submit button waits for a new one.
          "expired-callback": () => onToken(null),
          "timeout-callback": () => onToken(null),
          "error-callback": () => onToken(null),
        });
      })
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
      if (widgetId.current) window.turnstile?.remove(widgetId.current);
      widgetId.current = null;
      onToken(null);
    };
  }, [siteKey, locale, onToken]);

  useEffect(() => {
    if (resetSignal > 0 && widgetId.current) window.turnstile?.reset(widgetId.current);
  }, [resetSignal]);

  return (
    <div>
      <div ref={container} className="min-h-[65px]" />
      {failed && <Alert tone="warn">{t.auth.captchaUnavailable}</Alert>}
    </div>
  );
}

/**
 * Optional captcha for the auth forms. Without NEXT_PUBLIC_TURNSTILE_SITE_KEY it renders nothing,
 * `ready` is always true and `options` is empty, so the forms behave exactly as without captcha.
 * Call `reset()` after every submit that did not leave the page: a token can be verified only once.
 */
export function useCaptcha() {
  const [token, setToken] = useState<string | null>(null);
  const [resetSignal, setResetSignal] = useState(0);
  const onToken = useCallback((value: string | null) => setToken(value), []);
  const reset = useCallback(() => {
    setToken(null);
    setResetSignal((n) => n + 1);
  }, []);
  return {
    enabled: Boolean(SITE_KEY),
    ready: canSubmitWithCaptcha(SITE_KEY, token),
    options: captchaOptions(SITE_KEY ? token : null),
    reset,
    widget: SITE_KEY ? <TurnstileWidget siteKey={SITE_KEY} onToken={onToken} resetSignal={resetSignal} /> : null,
  };
}
