
/**
 * Calculates the volume of liquid in a horizontal cylinder.
 * 
 * @param radius Radius of the cylinder (mm)
 * @param length Length of the cylinder (mm)
 * @param liquidHeight Height of the liquid (mm)
 * @returns Volume in Liters
 */
export function calculateHorizontalTankVolume(
    radius: number,
    length: number,
    liquidHeight: number
): number {
    if (liquidHeight <= 0) return 0;
    if (liquidHeight >= 2 * radius) {
        // Full tank volume: π * r^2 * L
        const volumeCubicMm = Math.PI * Math.pow(radius, 2) * length;
        return volumeCubicMm / 1000000; // Convert to Liters
    }

    // Formula for partial volume of a horizontal cylinder:
    // V = L * (R^2 * cos^-1((R-h)/R) - (R-h) * sqrt(2Rh - h^2))
    // where h is liquid height, R is radius, L is length.

    // Ensure arccos argument is clamped between -1 and 1 just in case of floating point errors
    const h = liquidHeight;
    const R = radius;
    const term1 = (R - h) / R;
    const clampedTerm1 = Math.max(-1, Math.min(1, term1));

    const segmentArea =
        Math.pow(R, 2) * Math.acos(clampedTerm1) -
        (R - h) * Math.sqrt(2 * R * h - Math.pow(h, 2));

    const volumeCubicMm = segmentArea * length;

    // Convert mm³ to Liters (1 Liter = 1,000,000 mm³)
    return Number((volumeCubicMm / 1000000).toFixed(2));
}

export const TANK_DIMENSIONS = {
    // 5000G Tank: 2438mm Diam, 5136mm Length
    "5000G": {
        radius: 2438 / 2,
        length: 5136
    },
    // 3000G Tank: 3000 Gallon Tank (Diameter 7.0 Feet approx 2133mm, 13.5 Feet approx 4115mm)
    // Precise values from chart header: Diameter 7.0 Feet, Length 13.5 Feet -> 2133mm, 4115mm (approx)
    // Let's use the explicit mm values if provided or convert carefully.
    // Chart says: Diameter 7.0 FEET = 2133 mm, Length 13.5 FEET = 4115 mm
    "3000G": {
        radius: 2133 / 2, // Diameter 2133mm
        length: 4115      // Length 4115mm
    }
};
