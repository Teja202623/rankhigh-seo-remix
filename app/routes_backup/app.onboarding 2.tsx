import { useState, useEffect } from "react";
import { json, type LoaderFunctionArgs, type ActionFunctionArgs } from "@remix-run/node";
import { useLoaderData, useNavigate, Form } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  BlockStack,
  InlineStack,
  Button,
  Text,
  ProgressBar,
  TextField,
  Banner,
  List,
  Badge,
} from "@shopify/polaris";
import { authenticate } from "~/shopify.server";

/**
 * Onboarding Wizard Route
 *
 * 5-step onboarding flow:
 * 1. Welcome - Introduction to RankHigh SEO
 * 2. Google Search Console - Instructions to connect GSC
 * 3. Sitemap - Generate and download XML sitemap
 * 4. GTM/GA4 Setup - Manual setup instructions
 * 5. First Audit - Trigger first SEO audit
 */

export async function loader({ request }: LoaderFunctionArgs) {
  const { session } = await authenticate.admin(request);

  return json({
    shopUrl: session.shop,
  });
}

export async function action({ request }: ActionFunctionArgs) {
  await authenticate.admin(request);

  const formData = await request.formData();
  const step = formData.get("step");
  const action = formData.get("action");

  // Handle different actions
  if (action === "complete") {
    // Mark onboarding as complete (store in localStorage on client)
    return json({ success: true, redirect: "/app" });
  }

  return json({ success: true });
}

export default function Onboarding() {
  const { shopUrl } = useLoaderData<typeof loader>();
  const navigate = useNavigate();

  // Track current step (1-5)
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 5;
  const progress = (currentStep / totalSteps) * 100;

  // Form state
  const [gtmId, setGtmId] = useState("");
  const [ga4Id, setGa4Id] = useState("");

  // Load saved progress from localStorage
  useEffect(() => {
    const savedStep = localStorage.getItem("rankhigh_onboarding_step");
    if (savedStep) {
      setCurrentStep(parseInt(savedStep, 10));
    }
  }, []);

  // Save progress to localStorage
  const saveProgress = (step: number) => {
    localStorage.setItem("rankhigh_onboarding_step", step.toString());
  };

  const goToNextStep = () => {
    const nextStep = Math.min(currentStep + 1, totalSteps);
    setCurrentStep(nextStep);
    saveProgress(nextStep);
  };

  const goToPreviousStep = () => {
    const prevStep = Math.max(currentStep - 1, 1);
    setCurrentStep(prevStep);
    saveProgress(prevStep);
  };

  const skipWizard = () => {
    localStorage.setItem("rankhigh_onboarding_completed", "true");
    navigate("/app");
  };

  const completeWizard = () => {
    localStorage.setItem("rankhigh_onboarding_completed", "true");
    localStorage.removeItem("rankhigh_onboarding_step");
    navigate("/app");
  };

  // Step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingLg">
                🎉 Welcome to RankHigh SEO!
              </Text>
              <Text as="p" variant="bodyMd">
                Thank you for installing RankHigh SEO. We'll help you optimize your Shopify store for search engines in just a few simple steps.
              </Text>

              <BlockStack gap="200">
                <Text as="h3" variant="headingMd">
                  What you'll get:
                </Text>
                <List type="bullet">
                  <List.Item>Comprehensive SEO audit of your store</List.Item>
                  <List.Item>Automated meta tag optimization</List.Item>
                  <List.Item>Image ALT text management</List.Item>
                  <List.Item>XML sitemap generation</List.Item>
                  <List.Item>Google Search Console integration</List.Item>
                  <List.Item>Real-time SEO score tracking</List.Item>
                </List>
              </BlockStack>

              <Banner>
                <Text as="p" variant="bodyMd">
                  This quick setup wizard will take less than 5 minutes. You can skip any step and come back later.
                </Text>
              </Banner>

              <InlineStack gap="300">
                <Button variant="primary" onClick={goToNextStep}>
                  Get Started
                </Button>
                <Button onClick={skipWizard}>
                  Skip for Now
                </Button>
              </InlineStack>
            </BlockStack>
          </Card>
        );

      case 2:
        return (
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingLg">
                📊 Connect Google Search Console
              </Text>
              <Text as="p" variant="bodyMd">
                Google Search Console provides valuable insights about how Google sees your store and which keywords drive traffic.
              </Text>

              <Banner tone="info">
                <BlockStack gap="200">
                  <Text as="p" variant="bodyMd" fontWeight="bold">
                    Coming Soon: One-Click Connection
                  </Text>
                  <Text as="p" variant="bodyMd">
                    OAuth integration is being finalized. For now, you can manually set up Google Search Console by following these steps:
                  </Text>
                </BlockStack>
              </Banner>

              <BlockStack gap="200">
                <Text as="h3" variant="headingMd">
                  Manual Setup Steps:
                </Text>
                <List type="number">
                  <List.Item>Visit <a href="https://search.google.com/search-console" target="_blank" rel="noopener noreferrer">Google Search Console</a></List.Item>
                  <List.Item>Add your property: {shopUrl}</List.Item>
                  <List.Item>Verify ownership using the HTML tag method</List.Item>
                  <List.Item>Wait 24-48 hours for data to populate</List.Item>
                </List>
              </BlockStack>

              <InlineStack gap="300">
                <Button variant="primary" onClick={goToNextStep}>
                  Continue
                </Button>
                <Button onClick={goToPreviousStep}>
                  Back
                </Button>
                <Button onClick={skipWizard}>
                  Skip for Now
                </Button>
              </InlineStack>
            </BlockStack>
          </Card>
        );

      case 3:
        return (
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingLg">
                🗺️ Generate XML Sitemap
              </Text>
              <Text as="p" variant="bodyMd">
                An XML sitemap helps search engines discover and index all your important pages.
              </Text>

              <Banner tone="success">
                <Text as="p" variant="bodyMd">
                  Your sitemap will include all products, collections, pages, and blog posts from your store.
                </Text>
              </Banner>

              <BlockStack gap="200">
                <Text as="h3" variant="headingMd">
                  What's Next:
                </Text>
                <List type="number">
                  <List.Item>We'll generate your sitemap automatically</List.Item>
                  <List.Item>Submit it to Google Search Console at: <code>{shopUrl}/sitemap.xml</code></List.Item>
                  <List.Item>Sitemap will update automatically when you add/change products</List.Item>
                </List>
              </BlockStack>

              <Card background="bg-surface-secondary">
                <BlockStack gap="200">
                  <Text as="p" variant="bodySm" tone="subdued">
                    Sitemap URL:
                  </Text>
                  <Text as="p" variant="bodyMd" fontWeight="bold">
                    https://{shopUrl}/sitemap.xml
                  </Text>
                  <Badge tone="info">Auto-Generated</Badge>
                </BlockStack>
              </Card>

              <InlineStack gap="300">
                <Button variant="primary" onClick={goToNextStep}>
                  Continue
                </Button>
                <Button onClick={goToPreviousStep}>
                  Back
                </Button>
                <Button onClick={skipWizard}>
                  Skip for Now
                </Button>
              </InlineStack>
            </BlockStack>
          </Card>
        );

      case 4:
        return (
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingLg">
                📈 Set Up Google Analytics
              </Text>
              <Text as="p" variant="bodyMd">
                Track your SEO performance and measure the impact of optimizations with Google Analytics 4 and Google Tag Manager.
              </Text>

              <BlockStack gap="300">
                <TextField
                  label="Google Tag Manager ID (optional)"
                  value={gtmId}
                  onChange={setGtmId}
                  placeholder="GTM-XXXXXXX"
                  helpText="Find this in your Google Tag Manager account"
                  autoComplete="off"
                />

                <TextField
                  label="Google Analytics 4 Measurement ID (optional)"
                  value={ga4Id}
                  onChange={setGa4Id}
                  placeholder="G-XXXXXXXXXX"
                  helpText="Find this in your GA4 property settings"
                  autoComplete="off"
                />
              </BlockStack>

              <Banner tone="info">
                <Text as="p" variant="bodyMd">
                  Don't have these IDs yet? No problem! You can add them later in Settings. We'll help you set up tracking when you're ready.
                </Text>
              </Banner>

              <InlineStack gap="300">
                <Button
                  variant="primary"
                  onClick={() => {
                    // Save GTM/GA4 IDs if provided (we'll implement save later)
                    if (gtmId || ga4Id) {
                      console.log("Saving tracking IDs:", { gtmId, ga4Id });
                    }
                    goToNextStep();
                  }}
                >
                  Continue
                </Button>
                <Button onClick={goToPreviousStep}>
                  Back
                </Button>
                <Button onClick={skipWizard}>
                  Skip for Now
                </Button>
              </InlineStack>
            </BlockStack>
          </Card>
        );

      case 5:
        return (
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingLg">
                🔍 Run Your First SEO Audit
              </Text>
              <Text as="p" variant="bodyMd">
                Let's analyze your store and identify SEO opportunities. This will check for common issues like missing meta tags, broken links, and optimization opportunities.
              </Text>

              <Banner tone="success">
                <BlockStack gap="200">
                  <Text as="p" variant="bodyMd" fontWeight="bold">
                    You're almost done!
                  </Text>
                  <Text as="p" variant="bodyMd">
                    Click "Run First Audit" to scan your store. The audit typically takes 2-3 minutes to complete.
                  </Text>
                </BlockStack>
              </Banner>

              <BlockStack gap="200">
                <Text as="h3" variant="headingMd">
                  What we'll check:
                </Text>
                <List type="bullet">
                  <List.Item>Missing or duplicate meta titles</List.Item>
                  <List.Item>Missing meta descriptions</List.Item>
                  <List.Item>Images without ALT text</List.Item>
                  <List.Item>Broken internal links</List.Item>
                  <List.Item>HTTPS/SSL issues</List.Item>
                  <List.Item>Indexing directives (robots tags)</List.Item>
                </List>
              </BlockStack>

              <InlineStack gap="300">
                <Button
                  variant="primary"
                  onClick={() => {
                    // TODO: Trigger audit in next phase
                    completeWizard();
                  }}
                >
                  Run First Audit & Complete Setup
                </Button>
                <Button onClick={goToPreviousStep}>
                  Back
                </Button>
                <Button onClick={skipWizard}>
                  Skip & Go to Dashboard
                </Button>
              </InlineStack>
            </BlockStack>
          </Card>
        );

      default:
        return null;
    }
  };

  return (
    <Page
      title="Welcome to RankHigh SEO"
      subtitle={`Let's set up your SEO foundation in 5 quick steps`}
      backAction={{ content: "Dashboard", url: "/app" }}
    >
      <Layout>
        <Layout.Section>
          <BlockStack gap="500">
            {/* Progress Bar */}
            <Card>
              <BlockStack gap="300">
                <InlineStack align="space-between">
                  <Text as="h3" variant="headingMd">
                    Step {currentStep} of {totalSteps}
                  </Text>
                  <Text as="p" variant="bodySm" tone="subdued">
                    {Math.round(progress)}% Complete
                  </Text>
                </InlineStack>
                <ProgressBar progress={progress} size="small" />
              </BlockStack>
            </Card>

            {/* Step Content */}
            {renderStepContent()}

            {/* Help Card */}
            <Card background="bg-surface-secondary">
              <BlockStack gap="200">
                <Text as="h3" variant="headingSm">
                  Need Help?
                </Text>
                <Text as="p" variant="bodySm">
                  Check out our <a href="https://docs.rankhighseo.com" target="_blank" rel="noopener noreferrer">documentation</a> or contact support at support@rankhighseo.com
                </Text>
              </BlockStack>
            </Card>
          </BlockStack>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
