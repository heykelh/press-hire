/**
 * Icônes pixel 10×10 des mécaniques d'arcade.
 * K = contour, A = couleur principale, B = ombre, W = reflet, R = rouge, Y = jaune.
 */
import type { Painter } from "../pixel/painter";
import { shade } from "../pixel/painter";

export type IconName =
  | "file" | "bug" | "coin" | "star" | "bomb" | "mail" | "chart" | "shield" | "fire" | "box"
  | "cloud" | "key" | "warning" | "heart" | "ticket" | "server" | "cart" | "clock" | "drop" | "bolt";

const I: Record<IconName, { rows: string[]; color: string }> = {
  file: { color: "#e8e8f0", rows: ["KKKKKK....", "KWWWWAK...", "KWAAAAAK..", "KWKKKKAK..", "KWAAAAAK..", "KWKKKKAK..", "KWAAAAAK..", "KWKKKAAK..", "KAAAAAAK..", "KKKKKKKK.."] },
  bug: { color: "#3ad46a", rows: ["..K....K..", "...K..K...", "..KKKKKK..", ".KAWAAWAK.", "KKAAAAAAKK", ".KABAABAK.", "KKAAAAAAKK", ".KABAABAK.", "..KAAAAK..", ".K.KKKK.K."] },
  coin: { color: "#ffd23a", rows: ["...KKKK...", "..KAAAAK..", ".KAWWAAAK.", "KAWAKKAABK", "KAWAKAAABK", "KAAAKAAABK", "KAAAKAAABK", ".KAAAAABK.", "..KBBBBK..", "...KKKK..."] },
  star: { color: "#ffd23a", rows: ["....KK....", "...KAAK...", "...KWAK...", "KKKKAAKKKK", "KAAAWAAAAK", ".KAAAAAAK.", "..KAAAAK..", ".KAAKKAAK.", ".KAK..KAK.", ".KK....KK."] },
  bomb: { color: "#3a3a4a", rows: ["......KYY.", ".....K..Y.", "...KKKK...", "..KAAAAK..", ".KAWAAAAK.", ".KWAAAAAK.", ".KAAAAAAK.", ".KAAAAABK.", "..KABBBK..", "...KKKK..."] },
  mail: { color: "#f4f1ff", rows: ["..........", "KKKKKKKKKK", "KAKAAAAKAK", "KAAKAAKAAK", "KAAAKKAAAK", "KAAAAAAAAK", "KAAAAAAAAK", "KBBBBBBBBK", "KKKKKKKKKK", ".........."] },
  chart: { color: "#3ad0ff", rows: ["K.........", "K......KK.", "K......KAK", "K...KK.KAK", "K...KAKKAK", "K.KKKAKKAK", "K.KAKAKKAK", "K.KAKAKKAK", "KKKKKKKKKK", ".........."] },
  shield: { color: "#3a8aff", rows: ["KKKKKKKKKK", "KAWWAAAAAK", "KAWAAAAABK", "KAAAAAAABK", "KAAAAAAABK", ".KAAAAABK.", ".KAAAAABK.", "..KAAABK..", "...KABK...", "....KK...."] },
  fire: { color: "#ff6a1a", rows: ["....K.....", "...KAK....", "...KAAK.K.", "..KAAAKKAK", ".KAAYAAAAK", ".KAYYYAAAK", "KAAYWYYAAK", "KAYYWWYYAK", ".KAYYYYAK.", "..KKKKKK.."] },
  box: { color: "#c8925a", rows: ["..........", ".KKKKKKKK.", "KAAAAAAAAK", "KKKKKKKKKK", "KAAAKKAAAK", "KAAAKKAAAK", "KAAAAAAAAK", "KBBBBBBBBK", "KKKKKKKKKK", ".........."] },
  cloud: { color: "#e8f4ff", rows: ["..........", "...KKKK...", "..KWWAAK..", ".KKWAAAKK.", "KAAAAAAAAK", "KWAAAAAAAK", "KAAAAAAABK", ".KBBBBBBK.", "..KKKKKK..", ".........."] },
  key: { color: "#ffd23a", rows: ["..KKKK....", ".KAWWAK...", ".KAKKAK...", ".KAKKAK...", ".KAAAAK...", "..KAAK....", "...KAK....", "...KAAK...", "...KAK....", "...KAAK..."] },
  warning: { color: "#ffd23a", rows: ["....KK....", "...KAAK...", "...KKKK...", "..KAKKAK..", "..KAKKAK..", ".KAAKKAAK.", ".KAAAAAAK.", "KAAAKKAAAK", "KAAAAAAAAK", "KKKKKKKKKK"] },
  heart: { color: "#ff4a6a", rows: [".KKK..KKK.", "KAWAKKAAAK", "KWAAAAAAAK", "KAAAAAAAAK", "KAAAAAAABK", ".KAAAAABK.", "..KAAABK..", "...KABK...", "....KK....", ".........."] },
  ticket: { color: "#ff9ad6", rows: ["..........", "KKKKKKKKKK", "KAAAAKAAAK", ".KAWAKAAK.", "..KAAAAK..", "..KAAAAK..", ".KAAAKAAK.", "KAAAAKAAAK", "KKKKKKKKKK", ".........."] },
  server: { color: "#6a7a9a", rows: ["KKKKKKKKKK", "KAAAAAAGAK", "KBBBBBBBBK", "KKKKKKKKKK", "KAAAAAAGAK", "KBBBBBBBBK", "KKKKKKKKKK", "KAAAAAARAK", "KBBBBBBBBK", "KKKKKKKKKK"] },
  cart: { color: "#9ad0ff", rows: ["KK........", ".K........", ".KKKKKKKKK", ".KAAAAAAAK", ".KAWAAAAAK", "..KAAAAAK.", "..KKKKKKK.", "...K...K..", "..KAK.KAK.", "...K...K.."] },
  clock: { color: "#f4f1ff", rows: ["..KKKKKK..", ".KAAAKAAK.", "KAAAAKAAAK", "KAAAAKAAAK", "KAAAAKKKAK", "KAAAAAAAAK", "KAAAAAAAAK", ".KAAAAAAK.", "..KKKKKK..", ".........."] },
  drop: { color: "#3ad0ff", rows: ["....KK....", "....KK....", "...KAAK...", "...KAAK...", "..KWAAAK..", ".KWAAAAAK.", ".KAAAAAAK.", ".KAAAAABK.", "..KABBBK..", "...KKKK..."] },
  bolt: { color: "#ffd23a", rows: ["....KKKK..", "...KAAK...", "...KAK....", "..KAAKKKK.", "..KAAAAAK.", ".KKKKAAK..", "....KAK...", "...KAK....", "...KK.....", "..K......."] },
};

export const ICON_SIZE = 10;

/** Dessine une icône ; `tint` remplace la couleur principale. */
export function drawIcon(p: Painter, name: string, x: number, y: number, tint?: string): void {
  const ic = I[(name in I ? name : "box") as IconName];
  const a = tint ?? ic.color;
  p.sprite(
    { rows: ic.rows, colors: { K: "#0b0b14", A: a, B: shade(a, -0.35), W: shade(a, 0.6), R: "#ff3a3a", Y: "#ffd23a", G: "#3ad46a" } },
    x,
    y,
  );
}
