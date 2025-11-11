import { json, type LoaderFunctionArgs, type ActionFunctionArgs, redirect } from "@remix-run/node";
import { useLoaderData, Form, useNavigate, useActionData } from "@remix-run/react";
import { authenticate } from "../shopify.server";
import prisma from "~/db.server";
import { Page, Layout, Card, BlockStack, Text, TextField, Button, Banner, InlineStack } from "@shopify/polaris";
import { useState } from "react";

interface LoaderData {
  storeId: string;
}

interface ActionData {
  error?: string;
  success?: boolean;
  auditId?: string;
}

export async function loader({ request }: LoaderFunctionArgs) {
  const { session } = await authenticate.admin(request);

  const store = await prisma.store.findUnique({
    where: { shopUrl: session.shop },
  });

  if (!store) {
    throw new Response("Store not found", { status: 404 });
  }

  return json<LoaderData>({
    storeId: store.id,
  });
}

export async function action({ request }: ActionFunctionArgs) {
  console.log("[AUDIT ACTION] Method:", request.method);

  if (request.method !== "POST") {
    console.log("[AUDIT ACTION] Wrong method, returning 405");
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const { session } = await authenticate.admin(request);
    console.log("[AUDIT ACTION] Authenticated for shop:", session.shop);

    const formData = await request.formData();
    const url = formData.get("url") as string;
    console.log("[AUDIT ACTION] Form data received. URL:", url);

    if (!url || url.trim() === "") {
      console.log("[AUDIT ACTION] URL is empty");
      return json<ActionData>(
        { error: "URL is required" },
        { status: 400 }
      );
    }

    // Validate URL format
    try {
      new URL(url);
      console.log("[AUDIT ACTION] URL format valid");
    } catch (e) {
      console.log("[AUDIT ACTION] URL format invalid:", e);
      return json<ActionData>(
        { error: "Invalid URL format" },
        { status: 400 }
      );
    }

    const store = await prisma.store.findUnique({
      where: { shopUrl: session.shop },
    });
    console.log("[AUDIT ACTION] Store lookup result:", store?.id);

    if (!store) {
      console.log("[AUDIT ACTION] Store not found");
      throw new Response("Store not found", { status: 404 });
    }

    console.log("[AUDIT ACTION] Creating audit with storeId:", store.id);

    // Create audit record
    const audit = await prisma.audit.create({
      data: {
        storeId: store.id,
        url,
        status: "PENDING",
        progress: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    console.log("[AUDIT ACTION] Audit created successfully:", audit.id);

    // Redirect to progress page
    return redirect(`/app/audits/${audit.id}`);
  } catch (error) {
    console.error("[AUDIT ACTION] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[AUDIT ACTION] Error message:", errorMessage);
    return json<ActionData>(
      {
        error: `Failed to create audit: ${errorMessage}`,
      },
      { status: 500 }
    );
  }
}

export default function AuditsPage() {
  const { storeId } = useLoaderData<LoaderData>();
  const actionData = useActionData<ActionData>();
  const navigate = useNavigate();
  const [url, setUrl] = useState("");

  return (
    <Page
      title="Run SEO Audit"
      backAction={{ onAction: () => navigate("/app") }}
    >
      <Layout>
        <Layout.Section>
          <BlockStack gap="500">
            {/* Error Banner */}
            {actionData?.error && (
              <Banner tone="critical">
                <Text as="p">{actionData.error}</Text>
              </Banner>
            )}

            {/* Audit Form */}
            <Card>
              <Form method="post" action="/app/audits">
                <BlockStack gap="400">
                  <Text as="h2" variant="headingMd">
                    Start New Audit
                  </Text>

                  <TextField
                    name="url"
                    label="Website URL"
                    placeholder="https://example.com"
                    value={url}
                    onChange={setUrl}
                    helpText="Enter the full URL of the page to audit"
                    autoComplete="off"
                  />

                  <InlineStack gap="300">
                    <Button
                      variant="primary"
                      submit
                      disabled={!url}
                    >
                      Run Audit
                    </Button>
                    <Button
                      onClick={() => navigate("/app")}
                    >
                      Cancel
                    </Button>
                  </InlineStack>
                </BlockStack>
              </Form>
            </Card>

            {/* Info Card */}
            <Card>
              <BlockStack gap="200">
                <Text as="h3" variant="headingSm">
                  What gets audited?
                </Text>
                <BlockStack gap="100">
                  <Text as="p" variant="bodySm">
                    ✓ SEO metadata (title, description, keywords)
                  </Text>
                  <Text as="p" variant="bodySm">
                    ✓ Technical SEO (SSL, robots.txt, sitemap)
                  </Text>
                  <Text as="p" variant="bodySm">
                    ✓ Performance metrics (page speed, mobile-friendliness)
                  </Text>
                  <Text as="p" variant="bodySm">
                    ✓ Content quality (headings, links, structure)
                  </Text>
                  <Text as="p" variant="bodySm">
                    ✓ Accessibility (alt tags, ARIA labels)
                  </Text>
                </BlockStack>
              </BlockStack>
            </Card>
          </BlockStack>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
