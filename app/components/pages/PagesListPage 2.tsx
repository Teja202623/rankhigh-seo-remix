import { useState } from 'react';
import {
  Page,
  Layout,
  Card,
  IndexTable,
  Text,
  Badge,
  Button,
  TextField,
  InlineStack,
  useIndexResourceState,
} from '@shopify/polaris';
import { useNavigate } from '@remix-run/react';
import type { Page as PageType } from '~/types';

// TODO: Refactor to use Remix loader
export default function PagesListPage() {
  const navigate = useNavigate();
  const [searchValue, setSearchValue] = useState('');

  // Stub data - replace with Remix loader
  const isLoading = false;
  const pages: PageType[] = [];

  const resourceName = {
    singular: 'page',
    plural: 'pages',
  };

  const { selectedResources, allResourcesSelected, handleSelectionChange } =
    useIndexResourceState(pages as any);

  const rowMarkup = pages.map((page, index) => (
    <IndexTable.Row
      id={page.id}
      key={page.id}
      selected={selectedResources.includes(page.id)}
      position={index}
    >
      <IndexTable.Cell>
        <Text variant="bodyMd" fontWeight="bold" as="span">
          {page.title || page.handle}
        </Text>
      </IndexTable.Cell>
      <IndexTable.Cell>
        <Badge>{page.type}</Badge>
      </IndexTable.Cell>
      <IndexTable.Cell>
        {page.metaTitle ? (
          <Text as="span" tone="success">
            {page.metaTitle.substring(0, 50)}...
          </Text>
        ) : (
          <Text as="span" tone="critical">
            Missing
          </Text>
        )}
      </IndexTable.Cell>
      <IndexTable.Cell>
        {page.metaDescription ? (
          <Text as="span" tone="success">
            {page.metaDescription.substring(0, 50)}...
          </Text>
        ) : (
          <Text as="span" tone="critical">
            Missing
          </Text>
        )}
      </IndexTable.Cell>
      <IndexTable.Cell>
        <Button onClick={() => navigate(`/pages/${page.id}`)}>Edit</Button>
      </IndexTable.Cell>
    </IndexTable.Row>
  ));

  return (
    <Page
      title="Pages & Meta Tags"
      backAction={{ onAction: () => window.history.back() }}
    >
      <Layout>
        <Layout.Section>
          <Card padding="400">
            <InlineStack gap="300" align="space-between">
              <div style={{ flex: 1 }}>
                <TextField
                  label=""
                  value={searchValue}
                  onChange={setSearchValue}
                  placeholder="Search pages..."
                  autoComplete="off"
                  clearButton
                  onClearButtonClick={() => setSearchValue('')}
                />
              </div>
            </InlineStack>
          </Card>

          <Card padding="0">
            <IndexTable
              resourceName={resourceName}
              itemCount={pages.length}
              selectedItemsCount={
                allResourcesSelected ? 'All' : selectedResources.length
              }
              onSelectionChange={handleSelectionChange}
              headings={[
                { title: 'Title' },
                { title: 'Type' },
                { title: 'Meta Title' },
                { title: 'Meta Description' },
                { title: 'Actions' },
              ]}
              loading={isLoading}
            >
              {rowMarkup}
            </IndexTable>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
