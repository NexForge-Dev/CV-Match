"use client";

/** Last-resort boundary when the root layout itself fails (no providers available here). */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", display: "grid", placeItems: "center", minHeight: "100vh", margin: 0, textAlign: "center" }}>
        <div>
          <h1 style={{ fontSize: 22 }}>Something went wrong · Algo deu errado · Algo ha ido mal</h1>
          <button onClick={reset} style={{ marginTop: 16, padding: "8px 16px", borderRadius: 8, border: 0, background: "#1f4ad9", color: "#fff", cursor: "pointer" }}>
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
