import { Outlet, useLoaderData } from "react-router";
import { AppProvider } from "@shopify/shopify-app-react-router/react";
import { AppProvider as PolarisAppProvider } from "@shopify/polaris";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import polarisTranslations from "@shopify/polaris/locales/en.json";
import polarisStyles from "@shopify/polaris/build/esm/styles.css?url";
import type { LoaderFunctionArgs } from "react-router";

export const links = () => [{ rel: "stylesheet", href: polarisStyles }];

export async function loader({ request }: LoaderFunctionArgs) {
  await authenticate.admin(request);
  return { apiKey: process.env.SHOPIFY_API_KEY || "" };
}

export default function App() {
  const { apiKey } = useLoaderData<typeof loader>();

  return (
    // Shopify provider: App Bridge + Polaris web components (s-page, s-button, ...)
    <AppProvider embedded apiKey={apiKey}>
      {/* Polaris React provider: supplies the i18n context that <Page>, <Card>, etc. require */}
      <PolarisAppProvider i18n={polarisTranslations}>
        <nav style={{ padding: "16px", borderBottom: "1px solid #ddd" }}>
          <a href="/app" style={{ marginRight: "16px" }}>
            Home
          </a>
          <a href="/app/additional">Additional Page</a>
        </nav>
        <div style={{ padding: "24px" }}>
          <Outlet />
        </div>
      </PolarisAppProvider>
    </AppProvider>
  );
}

export { boundary };
