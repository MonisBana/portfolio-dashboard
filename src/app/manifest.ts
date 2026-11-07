import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: "Portfolio Dashboard",
        short_name: "Portfolio",
        description: "Track your investments and manage your portfolio",
        start_url: "/dashboard",
        display: "standalone",
        background_color: "#07130F",
        theme_color: "#07130F",
        icons: [
            {
                src: "/brand/icon-512.png",
                sizes: "512x512",
                type: "image/png",
                purpose: "any",
            },
            {
                src: "/brand/icon.svg",
                sizes: "any",
                type: "image/svg+xml",
            },
        ],
    };
}
