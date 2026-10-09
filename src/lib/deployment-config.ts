export const deploymentConfig = {
  name: process.env.NEXT_PUBLIC_DEPLOYMENT_NAME || "Learning Dashboard",
  logoUrl: process.env.NEXT_PUBLIC_DEPLOYMENT_LOGO_URL || "",
  primaryColor: process.env.NEXT_PUBLIC_DEPLOYMENT_PRIMARY_COLOR || "#e8a33d",
  dashboardUrl: process.env.NEXT_PUBLIC_DEPLOYMENT_DASHBOARD_URL || "",
};
