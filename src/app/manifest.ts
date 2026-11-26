import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SumCraft - Maths Games",
    short_name: "SumCraft",
    description: "Fun, interactive maths missions for curious minds aged 8 to 14.",
    start_url: "/",
    display: "standalone",
    background_color: "#E8F4FF",
    theme_color: "#7B5CFF",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
