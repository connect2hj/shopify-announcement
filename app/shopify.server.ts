import {
  ApiVersion,
  shopifyApp,
} from "@shopify/shopify-app-react-router/server";
import { PrismaSessionStorage } from "@shopify/shopify-app-session-storage-prisma";
import prisma from "./prisma.server";

const shopify = shopifyApp({
  apiKey: process.env.SHOPIFY_API_KEY!,
  apiSecretKey: process.env.SHOPIFY_API_SECRET!,
  appUrl: process.env.SHOPIFY_APP_URL!,
  apiVersion: ApiVersion.July26,
  auth: {
    path: "/auth",
  },
  webhooks: {
    path: "/webhooks",
  },
  sessionStorage: new PrismaSessionStorage(prisma),
});

export default shopify;
export const { authenticate, addDocumentResponseHeaders, login } = shopify;
