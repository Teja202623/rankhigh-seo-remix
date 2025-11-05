import { useState } from 'react';
import { Page, Card, Button, Text, BlockStack, ProgressBar } from '@shopify/polaris';
import { useNavigate } from '@remix-run/react';

export default function WizardPage() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      title: 'Welcome to RankHigh SEO',
      description: 'Let\'s get your store optimized for search engines in 5 easy steps.',
      action: () => setCurrentStep(1),
    },
    {
      title: 'Connect Google Search Console',
      description: 'Link your Google Search Console to track your search performance.',
      action: () => setCurrentStep(2),
    },
    {
      title: 'Generate Sitemap',
      description: 'Create and submit your XML sitemap to help search engines discover your pages.',
      action: () => setCurrentStep(3),
    },
    {
      title: 'Enable Analytics',
      description: 'Set up Google Tag Manager and Google Analytics 4 for tracking.',
      action: () => setCurrentStep(4),
    },
    {
      title: 'Run First Audit',
      description: 'Scan your store to identify SEO issues and quick wins.',
      action: () => setCurrentStep(5),
    },
    {
      title: 'Complete Setup',
      description: 'You\'re all set! Let\'s start optimizing your store.',
      action: () => navigate('/'),
    },
  ];

  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <Page title="Getting Started" backAction={{ onAction: () => navigate('/') }}>
      <Card>
        <BlockStack gap="400">
          <ProgressBar progress={progress} size="small" />

          <Text as="h2" variant="headingLg">
            {steps[currentStep].title}
          </Text>

          <Text as="p" variant="bodyMd">
            {steps[currentStep].description}
          </Text>

          <Button
            variant="primary"
            onClick={steps[currentStep].action}
          >
            {currentStep === steps.length - 1 ? 'Complete Setup' : 'Continue'}
          </Button>

          {currentStep > 0 && (
            <Button onClick={() => setCurrentStep(currentStep - 1)}>
              Back
            </Button>
          )}
        </BlockStack>
      </Card>
    </Page>
  );
}
