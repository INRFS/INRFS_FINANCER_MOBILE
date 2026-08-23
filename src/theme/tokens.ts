export const colors = {
  cyan: "#10AFE9",
  cyanSoft: "#E5F7FD",
  green: "#7BD000",
  greenSoft: "#DCFCE7",
  yellow: "#FDBA06",
  yellowSoft: "#FEF9C3",
  orange: "#FF790B",
  orangeSoft: "#FFEDD5",
  pink: "#ED069C",
  purple: "#7D1FE8",
  purpleSoft: "#F3E8FF",
  dark: "#0B192C",
  background: "#F4F7FB",
  surfaceSoft: "#F8FAFD",
  border: "#DDE5EE",
  muted: "#64748B",
  subtle: "#94A3B8",
  error: "#FF4A4F",
  errorSoft: "#FEE2E2",
  white: "#FFFFFF",
  black: "#000000",
} as const;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32 } as const;
export const radii = { sm: 8, md: 10, lg: 14, xl: 18, xxl: 24, pill: 999 } as const;

export const fonts = {
  regular: "Inter_400Regular",
  medium: "Inter_500Medium",
  semibold: "Inter_600SemiBold",
  bold: "Inter_700Bold",
  extrabold: "Inter_800ExtraBold",
} as const;

export const shadows = {
  card: {
    shadowColor: "#173B62",
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 4,
  },
  modal: {
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.16,
    shadowRadius: 24,
    elevation: 12,
  },
} as const;
