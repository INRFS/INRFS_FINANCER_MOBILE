export type RootStackParamList = {
  PortalSelection: undefined;
  FinancerLogin: undefined;
  FinancerRegister: undefined;
  FinancerOtp: { mobile: string; challengeId: string; registering?: boolean; admin?: boolean };
  FinancerWelcome: undefined;
  FinancerApp: undefined;
  AdminLogin: undefined;
  AdminApp: undefined;
};

export type Accent = "cyan" | "green" | "yellow" | "orange" | "pink" | "purple" | "error";
export type Status = "Active" | "Paid" | "Success" | "Closed" | "Due" | "Overdue" | "Pending" | "Upcoming" | "Rescheduled" | "Trial" | "Suspended" | "Inactive" | "Partially Paid" | "Resolved" | "Open";
