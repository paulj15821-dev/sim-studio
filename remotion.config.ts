import { Config } from "@remotion/cli/config";

// WebGL im Headless-Browser:
//  - Cloud/Linux ohne GPU (Claude Code im Browser): "swangle" (Software, langsam aber zuverlässig)
//  - Mac/PC mit GPU: GL=angle setzen, z. B. `GL=angle npm run render -- Aufzug`
Config.setChromiumOpenGlRenderer((process.env.GL as any) || "swangle");
Config.setVideoImageFormat("jpeg");
Config.setJpegQuality(92);
Config.setCodec("h264");
Config.setCrf(18);
Config.setPixelFormat("yuv420p");
Config.setOverwriteOutput(true);
