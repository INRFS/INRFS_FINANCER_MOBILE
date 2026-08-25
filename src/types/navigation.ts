import type { NavigatorScreenParams } from "@react-navigation/native";

export type FinancerDrawerParamList = {
  Dashboard: undefined;
  Customers: undefined;
  Loans: undefined;
  Payments: undefined;
  "Interest Schedule": undefined;
  "Due / Overdue": undefined;
  "Customer Ledger": undefined;
  Notifications: undefined;
  Reports: undefined;
  "Service Charge": undefined;
  Support: undefined;
  Settings: undefined;
};

export type RootStackParamList = {
  PortalSelection: undefined;
  FinancerLogin: undefined;
  FinancerRegister: undefined;
  FinancerOtp: { mobile: string; challengeId: string; registering?: boolean; admin?: boolean };
  FinancerWelcome: undefined;
  FinancerApp: NavigatorScreenParams<FinancerDrawerParamList> | undefined;
  AdminLogin: undefined;
  AdminApp: { section?: string; financerId?: string } | undefined;
  ResetPassword: { token?: string } | undefined;
  LegalNotice: { type: "privacy" | "terms" };
  PrivacyPolicy: undefined;
  TermsOfUse: undefined;
};

export type Accent = "cyan" | "green" | "yellow" | "orange" | "pink" | "purple" | "error";
export type Status = "Active" | "Paid" | "Success" | "Closed" | "Due" | "Overdue" | "Pending" | "Upcoming" | "Rescheduled" | "Trial" | "Suspended" | "Inactive" | "Partially Paid" | "Resolved" | "Open";
