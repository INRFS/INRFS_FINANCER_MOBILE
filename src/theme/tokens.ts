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
  background: "#F7F9FC",
  border: "#E1E7ED",
  muted: "#64748B",
  subtle: "#94A3B8",
  error: "#FF4A4F",
  errorSoft: "#FEE2E2",
  white: "#FFFFFF",
  black: "#000000",
} as const;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32 } as const;
export const radii = { sm: 6, md: 8, lg: 12, xl: 16, xxl: 20, pill: 999 } as const;

export const fonts = {
  regular: "Inter_400Regular",
  medium: "Inter_500Medium",
  semibold: "Inter_600SemiBold",
  bold: "Inter_700Bold",
  extrabold: "Inter_800ExtraBold",
} as const;

export const shadows = {
  card: {
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  modal: {
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.16,
    shadowRadius: 24,
    elevation: 12,
  },
} as const;
