/** قراءة الإعدادات — مصدر الحقيقة الوحيد للمتجر والخادم */
import { db, schema as s } from "./db";
import { eq } from "drizzle-orm";

export async function getSettings() {
  const [row] = await db.select().from(s.settings).where(eq(s.settings.id, 1));
  if (!row) throw new Error("settings row missing — شغّل npm run seed");
  return row;
}

export async function getInternalSettings() {
  const [row] = await db.select().from(s.settingsInternal).where(eq(s.settingsInternal.id, 1));
  if (!row) throw new Error("settings_internal missing — شغّل npm run seed");
  return row;
}

export async function getActiveBoxGifts() {
  return db.select().from(s.boxGifts).where(eq(s.boxGifts.active, true)).orderBy(s.boxGifts.sort);
}

export async function getJourneyLevels() {
  return db.select().from(s.journeyLevels).orderBy(s.journeyLevels.level);
}
