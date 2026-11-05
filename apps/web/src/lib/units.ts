const POUNDS_PER_KILOGRAM = 2.2046226218;

export function toKilograms(weight: number, unit: "lb" | "kg") {
  const kilograms = unit === "kg" ? weight : weight / POUNDS_PER_KILOGRAM;
  return Math.round(kilograms * 1000) / 1000;
}

export function fromKilograms(weightKg: number, unit: "lb" | "kg") {
  const value = unit === "kg" ? weightKg : weightKg * POUNDS_PER_KILOGRAM;
  return Math.round(value * 10) / 10;
}
