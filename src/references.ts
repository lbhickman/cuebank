// Built-in reference panels a bank can show during tests.

import type { Bank, ReferenceKind, ReferenceSetting } from "./types";

export const REFERENCE_KINDS: { kind: ReferenceKind; label: string; description: string }[] = [
  { kind: "none", label: "None", description: "No reference panel during tests." },
  { kind: "labs", label: "Lab Values", description: "Common adult laboratory reference ranges (editable)." },
  { kind: "periodic", label: "Periodic Table", description: "All 118 elements with atomic numbers and masses." },
  { kind: "formulas", label: "Math Formulas", description: "Common geometry and algebra formulas." },
  { kind: "custom", label: "Custom", description: "Your own reference text, such as a formula sheet or key facts." },
];

/** Banks created before references existed used the lab values panel. */
export function referenceOf(bank: Bank): ReferenceSetting {
  return bank.reference || { kind: "labs" };
}

export function referenceTitle(ref: ReferenceSetting): string {
  if (ref.kind === "custom") return ref.title?.trim() || "Reference";
  return REFERENCE_KINDS.find((k) => k.kind === ref.kind)?.label || "Reference";
}

export interface Element {
  n: number;
  sym: string;
  name: string;
  mass: string;
  row: number; // 1–7 main table, 9 lanthanides, 10 actinides
  col: number; // 1–18
}

// number, symbol, name, standard atomic weight (mass number of the most stable isotope in brackets)
const RAW = `1 H Hydrogen 1.008|2 He Helium 4.003|3 Li Lithium 6.94|4 Be Beryllium 9.012|5 B Boron 10.81|6 C Carbon 12.01|7 N Nitrogen 14.01|8 O Oxygen 16.00|9 F Fluorine 19.00|10 Ne Neon 20.18|11 Na Sodium 22.99|12 Mg Magnesium 24.31|13 Al Aluminum 26.98|14 Si Silicon 28.09|15 P Phosphorus 30.97|16 S Sulfur 32.06|17 Cl Chlorine 35.45|18 Ar Argon 39.95|19 K Potassium 39.10|20 Ca Calcium 40.08|21 Sc Scandium 44.96|22 Ti Titanium 47.87|23 V Vanadium 50.94|24 Cr Chromium 52.00|25 Mn Manganese 54.94|26 Fe Iron 55.85|27 Co Cobalt 58.93|28 Ni Nickel 58.69|29 Cu Copper 63.55|30 Zn Zinc 65.38|31 Ga Gallium 69.72|32 Ge Germanium 72.63|33 As Arsenic 74.92|34 Se Selenium 78.97|35 Br Bromine 79.90|36 Kr Krypton 83.80|37 Rb Rubidium 85.47|38 Sr Strontium 87.62|39 Y Yttrium 88.91|40 Zr Zirconium 91.22|41 Nb Niobium 92.91|42 Mo Molybdenum 95.95|43 Tc Technetium [98]|44 Ru Ruthenium 101.07|45 Rh Rhodium 102.91|46 Pd Palladium 106.42|47 Ag Silver 107.87|48 Cd Cadmium 112.41|49 In Indium 114.82|50 Sn Tin 118.71|51 Sb Antimony 121.76|52 Te Tellurium 127.60|53 I Iodine 126.90|54 Xe Xenon 131.29|55 Cs Cesium 132.91|56 Ba Barium 137.33|57 La Lanthanum 138.91|58 Ce Cerium 140.12|59 Pr Praseodymium 140.91|60 Nd Neodymium 144.24|61 Pm Promethium [145]|62 Sm Samarium 150.36|63 Eu Europium 151.96|64 Gd Gadolinium 157.25|65 Tb Terbium 158.93|66 Dy Dysprosium 162.50|67 Ho Holmium 164.93|68 Er Erbium 167.26|69 Tm Thulium 168.93|70 Yb Ytterbium 173.05|71 Lu Lutetium 174.97|72 Hf Hafnium 178.49|73 Ta Tantalum 180.95|74 W Tungsten 183.84|75 Re Rhenium 186.21|76 Os Osmium 190.23|77 Ir Iridium 192.22|78 Pt Platinum 195.08|79 Au Gold 196.97|80 Hg Mercury 200.59|81 Tl Thallium 204.38|82 Pb Lead 207.2|83 Bi Bismuth 208.98|84 Po Polonium [209]|85 At Astatine [210]|86 Rn Radon [222]|87 Fr Francium [223]|88 Ra Radium [226]|89 Ac Actinium [227]|90 Th Thorium 232.04|91 Pa Protactinium 231.04|92 U Uranium 238.03|93 Np Neptunium [237]|94 Pu Plutonium [244]|95 Am Americium [243]|96 Cm Curium [247]|97 Bk Berkelium [247]|98 Cf Californium [251]|99 Es Einsteinium [252]|100 Fm Fermium [257]|101 Md Mendelevium [258]|102 No Nobelium [259]|103 Lr Lawrencium [266]|104 Rf Rutherfordium [267]|105 Db Dubnium [268]|106 Sg Seaborgium [269]|107 Bh Bohrium [270]|108 Hs Hassium [269]|109 Mt Meitnerium [278]|110 Ds Darmstadtium [281]|111 Rg Roentgenium [282]|112 Cn Copernicium [285]|113 Nh Nihonium [286]|114 Fl Flerovium [289]|115 Mc Moscovium [290]|116 Lv Livermorium [293]|117 Ts Tennessine [294]|118 Og Oganesson [294]`;

function position(n: number): { row: number; col: number } {
  if (n === 1) return { row: 1, col: 1 };
  if (n === 2) return { row: 1, col: 18 };
  const short = (start: number, row: number) => {
    const i = n - start; // 0..7
    return { row, col: i < 2 ? i + 1 : i + 11 };
  };
  if (n <= 10) return short(3, 2);
  if (n <= 18) return short(11, 3);
  if (n <= 36) return { row: 4, col: n - 18 };
  if (n <= 54) return { row: 5, col: n - 36 };
  const long = (start: number, row: number, fRow: number) => {
    const i = n - start; // 0..31
    if (i < 2) return { row, col: i + 1 };
    if (i < 17) return { row: fRow, col: i + 1 }; // f-block row, columns 3–17
    return { row, col: i - 13 };
  };
  if (n <= 86) return long(55, 6, 9);
  return long(87, 7, 10);
}

export const ELEMENTS: Element[] = RAW.split("|").map((s) => {
  const [num, sym, name, mass] = s.split(" ");
  const n = Number(num);
  return { n, sym, name, mass, ...position(n) };
});

export const MATH_FORMULAS = `### Geometry

| Shape | Formula |
|---|---|
| Rectangle area | $A = \\ell w$ |
| Triangle area | $A = \\tfrac{1}{2}bh$ |
| Circle area | $A = \\pi r^2$ |
| Circle circumference | $C = 2\\pi r$ |
| Rectangular box volume | $V = \\ell w h$ |
| Cylinder volume | $V = \\pi r^2 h$ |
| Sphere volume | $V = \\tfrac{4}{3}\\pi r^3$ |
| Cone volume | $V = \\tfrac{1}{3}\\pi r^2 h$ |
| Pyramid volume | $V = \\tfrac{1}{3}\\ell w h$ |

- Pythagorean theorem: $a^2 + b^2 = c^2$
- Special right triangles: $x,\\ x,\\ x\\sqrt{2}$ (45°–45°–90°) and $x,\\ x\\sqrt{3},\\ 2x$ (30°–60°–90°)
- The angles of a triangle add to 180°. A circle has 360°, or $2\\pi$ radians.

### Algebra

- Slope: $m = \\dfrac{y_2 - y_1}{x_2 - x_1}$
- Slope-intercept form: $y = mx + b$
- Quadratic formula: $x = \\dfrac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$
- Distance: $d = \\sqrt{(x_2 - x_1)^2 + (y_2 - y_1)^2}$
- Circle: $(x - h)^2 + (y - k)^2 = r^2$
- Exponents: $a^m a^n = a^{m+n}$, $(a^m)^n = a^{mn}$, $a^{-n} = \\dfrac{1}{a^n}$
`;
