import { data } from "react-router";
import type { LoaderFunctionArgs } from "react-router";
import { useLoaderData, useFetcher } from "react-router";
import {
  Page,
  Card,
  TextField,
  Button,
  Banner,
  InlineStack,
  BlockStack,
  Text,
} from "@shopify/polaris";
import { useState, useEffect } from "react";
import { authenticate } from "../shopify.server";
import { getAnnouncementHistory } from "../mongodb.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const { admin, session } = await authenticate.admin(request);

  // Get current metafield value
  const response = await admin.graphql(`
    query GetAnnouncement {
      shop {
        metafield(namespace: "my_app", key: "announcement") {
          id
          value
        }
      }
    }
  `);

  const responseData = await response.json();
  const currentValue = responseData.data?.shop?.metafield?.value || "";

  const shop = session?.shop || "";
  const history = await getAnnouncementHistory(shop);

  return data({ currentValue, history });
}

export default function AppIndex() {
  const { currentValue, history } = useLoaderData<typeof loader>();
  const [announcement, setAnnouncement] = useState(currentValue || "");
  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const fetcher = useFetcher();

  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data) {
      const fetcherData = fetcher.data as { success?: boolean; error?: string };
      if (fetcherData.success) {
        setShowSuccess(true);
        setShowError(false);
        setTimeout(() => setShowSuccess(false), 3000);
      } else {
        setShowError(true);
        setErrorMessage(fetcherData.error || "Failed to save announcement");
        setTimeout(() => setShowError(false), 3000);
      }
    }
  }, [fetcher.state, fetcher.data]);

  const handleSave = () => {
    if (!announcement.trim()) {
      setShowError(true);
      setErrorMessage("Please enter announcement text");
      setTimeout(() => setShowError(false), 3000);
      return;
    }

    fetcher.submit(
      { text: announcement },
      { method: "POST", action: "/api/save-announcement" }
    );
  };

  return (
    <Page title="Announcement Manager">
      <BlockStack gap="400">
        <Card>
          <BlockStack gap="400">
            <Text variant="headingLg" as="h2">
              Store Announcement
            </Text>
            <Text variant="bodyMd" as="p" tone="subdued">
              This announcement will appear on every page of your online store.
            </Text>

            {showSuccess && (
              <Banner tone="success">Announcement saved successfully!</Banner>
            )}

            {showError && <Banner tone="critical">{errorMessage}</Banner>}

            <TextField
              label="Announcement Text"
              value={announcement}
              onChange={setAnnouncement}
              placeholder="e.g., Sale 50% Off - Limited Time!"
              autoComplete="off"
              disabled={fetcher.state === "submitting"}
            />

            <InlineStack gap="200">
              <Button
                variant="primary"
                onClick={handleSave}
                loading={fetcher.state === "submitting"}
                disabled={
                  fetcher.state === "submitting" || !announcement.trim()
                }
              >
                {fetcher.state === "submitting"
                  ? "Saving..."
                  : "Save Announcement"}
              </Button>
            </InlineStack>
          </BlockStack>
        </Card>

        {history && history.length > 0 && (
          <Card>
            <BlockStack gap="300">
              <Text variant="headingMd" as="h3">
                History
              </Text>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #ccc" }}>
                    <th style={{ textAlign: "left", padding: "8px" }}>Text</th>
                    <th style={{ textAlign: "left", padding: "8px" }}>
                      Timestamp
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((item: any, index: number) => (
                    <tr key={index} style={{ borderBottom: "1px solid #eee" }}>
                      <td style={{ padding: "8px" }}>{item.text}</td>
                      <td style={{ padding: "8px" }}>
                        {new Date(item.timestamp).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </BlockStack>
          </Card>
        )}
      </BlockStack>
    </Page>
  );
}
