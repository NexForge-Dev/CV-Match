import { ImageResponse } from "next/og";

export const alt = "CV Match";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: 80, background: "linear-gradient(135deg, #eef4ff 0%, #ffffff 60%)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ width: 88, height: 88, borderRadius: 20, background: "#1f4ad9", color: "#fff", fontSize: 40, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>CV</div>
          <div style={{ fontSize: 64, fontWeight: 700, color: "#0f172a", display: "flex" }}>
            CV <span style={{ color: "#1f4ad9", marginLeft: 16 }}>Match</span>
          </div>
        </div>
        <div style={{ marginTop: 40, fontSize: 40, color: "#334155", display: "flex" }}>Your CV, aligned with the right job · Seu currículo, alinhado à vaga certa · Tu CV, alineado con la oferta</div>
      </div>
    ),
    size,
  );
}
