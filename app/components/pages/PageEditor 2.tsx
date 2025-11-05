import { useState, useEffect } from 'react';
import {
  Page,
  Layout,
  Card,
  TextField,
  Button,
  Text,
  BlockStack,
  InlineStack,
  Banner,
} from '@shopify/polaris';
import { useParams, useNavigate } from '@remix-run/react';
import SERPPreview from '~/components/common/SERPPreview';

// TODO: Refactor to use Remix loader/action
export default function PageEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [metaTitle, setMetaTitle] = useState('');
  const [metaDescription, setMetaDescription] = useState('');

  // Stub data - replace with Remix loader
  const isLoading = false;
  const page: any = null; // TODO: Replace with real data from Remix loader

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!page) {
    return <div>Page not found</div>;
  }

  const titleLength = metaTitle.length;
  const descriptionLength = metaDescription.length;

  // TODO: Implement save mutation in Remix action
  const handleSave = () => {
    console.log('Save changes', { metaTitle, metaDescription });
  };

  return (
    <Page
      title={`Edit: ${page.title || page.handle}`}
      backAction={{ onAction: () => navigate('/pages') }}
      primaryAction={{
        content: 'Save Changes',
        onAction: handleSave,
        loading: false,
      }}
    >
      <Layout>
        <Layout.Section>
          <BlockStack gap="500">
            {/* Page Info */}
            <Card>
              <BlockStack gap="300">
                <Text as="h2" variant="headingMd">
                  Page Information
                </Text>
                <Text as="p" variant="bodyMd">
                  <strong>URL:</strong> {page.url}
                </Text>
                <Text as="p" variant="bodyMd">
                  <strong>Type:</strong> {page.type}
                </Text>
              </BlockStack>
            </Card>

            {/* Meta Tags Editor */}
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">
                  Meta Tags
                </Text>

                <TextField
                  label="Meta Title"
                  value={metaTitle}
                  onChange={setMetaTitle}
                  autoComplete="off"
                  helpText={
                    <InlineStack gap="100" align="space-between">
                      <Text as="span" variant="bodySm">
                        {titleLength < 50
                          ? 'Too short'
                          : titleLength > 60
                          ? 'Too long'
                          : 'Optimal'}
                      </Text>
                      <Text
                        as="span"
                        variant="bodySm"
                        tone={titleLength > 60 ? 'critical' : undefined}
                      >
                        {titleLength} / 60 characters
                      </Text>
                    </InlineStack>
                  }
                />

                <TextField
                  label="Meta Description"
                  value={metaDescription}
                  onChange={setMetaDescription}
                  multiline={3}
                  autoComplete="off"
                  helpText={
                    <InlineStack gap="100" align="space-between">
                      <Text as="span" variant="bodySm">
                        {descriptionLength < 140
                          ? 'Too short'
                          : descriptionLength > 160
                          ? 'Too long'
                          : 'Optimal'}
                      </Text>
                      <Text
                        as="span"
                        variant="bodySm"
                        tone={descriptionLength > 160 ? 'critical' : undefined}
                      >
                        {descriptionLength} / 160 characters
                      </Text>
                    </InlineStack>
                  }
                />
              </BlockStack>
            </Card>

            {/* SERP Preview */}
            <SERPPreview
              data={{
                title: metaTitle || page.title || 'Untitled',
                description: metaDescription || 'No meta description provided',
                url: page.url,
                siteName: 'Your Store',
              }}
            />

            {/* TODO: Add success/error banners when Remix action is implemented */}
          </BlockStack>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
