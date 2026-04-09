import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "512px",
          height: "512px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background:
            "linear-gradient(135deg, #1473ff 0%, #1e8fff 55%, #20d7ff 100%)",
          color: "#ffffff",
          fontSize: 220,
          fontWeight: 900,
          borderRadius: 120,
          letterSpacing: "-12px",
        }}
      >
        AA
      </div>
    ),
    {
      width: 512,
      height: 512,
    }
  );
}