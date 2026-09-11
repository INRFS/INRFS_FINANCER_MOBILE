export const colors = {
  cyan: "#009CD4",
  cyanDark: "#007A99",
  cyanSoft: "#E0F7FA",
  cyanSofter: "#F0FAFD",
  green: "#43A047",
  greenSoft: "#E8F5E9",
  yellow: "#FFB300",
  yellowSoft: "#FFF8E1",
  orange: "#FB8C00",
  orangeSoft: "#FFF3E0",
  pink: "#EC4899",
  purple: "#009CD4",
  purpleSoft: "#E0F7FA",
  dark: "#063238",
  background: "#EAF6FA",
  surface: "#FFFFFF",
  surfaceSoft: "#F4FAFC",
  border: "#D0EBF3",
  muted: "#607D8B",
  subtle: "#90A4AE",
  error: "#E53935",
  errorSoft: "#FFEBEE",
  white: "#FFFFFF",
  black: "#000000",
} as const;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32 } as const;
export const radii = { sm: 8, md: 12, lg: 16, xl: 20, xxl: 26, pill: 999 } as const;

export const fonts = {
  regular: "Inter_400Regular",
  medium: "Inter_500Medium",
  semibold: "Inter_600SemiBold",
  bold: "Inter_700Bold",
  extrabold: "Inter_800ExtraBold",
} as const;

export const shadows = {
  card: {
    shadowColor: "#0D5C75",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 3,
  },
  glow: {
    shadowColor: "#009CD4",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  modal: {
    shadowColor: "#063238",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 28,
    elevation: 12,
  },
} as const;
