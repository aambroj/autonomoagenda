import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "192px",
          height: "192px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background:
            "linear-gradient(135deg, #1473ff 0%, #1e8fff 55%, #20d7ff 100%)",
          color: "#ffffff",
          fontSize: 82,
          fontWeight: 900,
          borderRadius: 44,
          letterSpacing: "-6px",
        }}
      >
        AA
      </div>
    ),
    {
      width: 192,
      height: 192,
    }
  );
}