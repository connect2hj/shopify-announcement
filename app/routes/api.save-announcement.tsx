import { data } from "react-router";
import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import { saveAnnouncement } from "../mongodb.server";

export async function action({ request }: ActionFunctionArgs) {
  try {
    const { admin, session } = await authenticate.admin(request);

    // Accept either JSON or form-encoded bodies. react-router's fetcher.submit
    // defaults to application/x-www-form-urlencoded, but this route was written
    // for JSON — handle both so the Save button works regardless.
    let text: string | undefined;
    const contentType = request.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const body = await request.json();
      text = body?.text;
    } else {
      const formData = await request.formData();
      text = formData.get("text")?.toString();
    }

    if (!text || text.trim().length === 0) {
      return data({ error: "Announcement text is required" }, { status: 400 });
    }

    // 1. Save to MongoDB
    const dbResult = await saveAnnouncement(session.shop, text.trim());

    // 2. Resolve this store's real Shop GID (do NOT hardcode it)
    const shopIdResponse = await admin.graphql(`#graphql
      query GetShopId {
        shop { id }
      }
    `);
    const shopIdData = await shopIdResponse.json();
    const ownerId = shopIdData.data?.shop?.id;

    if (!ownerId) {
      return data({ error: "Could not resolve shop ID" }, { status: 500 });
    }

    // 3. Save to Shopify Metafield using the resolved owner ID
    const graphqlResponse = await admin.graphql(
      `
      mutation UpdateShopMetafield($ownerId: ID!, $value: String!) {
        metafieldsSet(metafields: [
          {
            ownerId: $ownerId,
            namespace: "my_app",
            key: "announcement",
            value: $value,
            type: "single_line_text_field"
          }
        ]) {
          metafields {
            id
            value
            namespace
            key
          }
          userErrors {
            field
            message
          }
        }
      }
      `,
      {
        variables: {
          ownerId,
          value: text.trim(),
        },
      },
    );

    const graphqlData = await graphqlResponse.json();
    const errors = graphqlData.data?.metafieldsSet?.userErrors || [];

    if (errors.length > 0) {
      return data(
        { error: "Failed to update metafield", details: errors },
        { status: 500 },
      );
    }

    return data({
      success: true,
      message: "Announcement saved successfully!",
      result: {
        mongo: dbResult,
        shopify: graphqlData.data.metafieldsSet.metafields[0],
      },
    });
  } catch (error) {
    console.error("Error saving announcement:", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return data({ error: message }, { status: 500 });
  }
}
