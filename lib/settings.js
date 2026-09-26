import { connectDB } from "./mongodb";
import { Setting } from "./models";

const DEFAULTS = { siteName: "Book Knowledge", tagline: "Notes & Images for Sants" };

export async function getSettings() {
  try {
    await connectDB();
    const doc = await Setting.findOne().lean();
    if (!doc) return DEFAULTS;
    return {
      siteName: doc.siteName || DEFAULTS.siteName,
      tagline: doc.tagline || DEFAULTS.tagline,
    };
  } catch {
    return DEFAULTS;
  }
}
