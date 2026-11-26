import { describe, expect, it } from "vitest";
import { detectInstallMode, isIOSDevice } from "./install";

const IPHONE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";
const IPAD_DESKTOP_MODE =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15";
const ANDROID =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36";

describe("isIOSDevice", () => {
  it("spots iPhones and iPads, including iPads that claim to be a Mac", () => {
    expect(isIOSDevice(IPHONE, 5)).toBe(true);
    expect(isIOSDevice(IPAD_DESKTOP_MODE, 5)).toBe(true);
  });

  it("does not mistake a real Mac or an Android phone for iOS", () => {
    expect(isIOSDevice(IPAD_DESKTOP_MODE, 0)).toBe(false);
    expect(isIOSDevice(ANDROID, 5)).toBe(false);
  });
});

describe("detectInstallMode", () => {
  const base = { standalone: false, hasInstallEvent: false, userAgent: ANDROID, maxTouchPoints: 5 };

  it("offers nothing once installed", () => {
    expect(detectInstallMode({ ...base, standalone: true, hasInstallEvent: true })).toBe("installed");
  });

  it("uses the browser's install sheet when it has offered one", () => {
    expect(detectInstallMode({ ...base, hasInstallEvent: true })).toBe("native");
  });

  it("explains Add to Home Screen on iOS", () => {
    expect(detectInstallMode({ ...base, userAgent: IPHONE })).toBe("ios");
  });

  it("falls back to pointing at the browser menu", () => {
    expect(detectInstallMode(base)).toBe("manual");
  });
});
