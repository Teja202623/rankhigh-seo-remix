// app/routes/app.seo.schema.tsx

import { useState, useCallback } from 'react';
import type { LoaderFunctionArgs, ActionFunctionArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
import { useLoaderData, useSubmit, useNavigation } from '@remix-run/react';
import {
  Page,
  Layout,
  Card,
  BlockStack,
  Text,
  Button,
  InlineStack,
  Banner,
  Select,
  TextField,
  Badge,
  DataTable,
  Link,
  Box,
  Divider,
  Checkbox,
  EmptyState,
  SkeletonBodyText,
  SkeletonDisplayText
} from '@shopify/polaris';
import {
  ExternalIcon,
  DeleteIcon,
  ViewIcon
} from '@shopify/polaris-icons';
import { authenticate } from '~/shopify.server';
import prisma from '~/db.server';
import { SchemaPreview } from '~/components/schema/SchemaPreview';
import { generateProductSchema } from '~/services/schema/productSchema.server';
import { generateOrganizationSchema } from '~/services/schema/organizationSchema.server';
import { generateExampleBreadcrumbSchema } from '~/services/schema/breadcrumbSchema.server';
import {
  validateProductSchema,
  validateOrganizationSchema,
  validateBreadcrumbSchema
} from '~/services/schema/schemaValidator.server';
import type {
  ProductSchema,
  OrganizationSchema,
  BreadcrumbSchema,
  ShopifyProduct,
  ShopInfo,
  ValidationResult
} from '~/types/schema';
import {
  GET_PRODUCTS_LIST,
  GET_PRODUCT_FOR_SCHEMA,
  GET_SHOP_INFO
} from '~/graphql/schema.queries';

interface LoaderData {
  products: Array<{
    id: string;
    title: string;
    handle: string;
  }>;
  shopInfo: ShopInfo;
  activeSchemas: Array<{
    id: string;
    type: string;
    pageId: string | null;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
    schema: any;
  }>;
  schemaCount: {
    product: number;
    organization: number;
    breadcrumb: number;
  };
  limits: {
    maxProductSchemas: number;
    canCreateOrganization: boolean;
    canCreateBreadcrumb: boolean;
  };
  exampleBreadcrumb: BreadcrumbSchema;
  breadcrumbValidation: ValidationResult;
}

/**
 * Loader: Fetches data needed for the schema management page
 */
export async function loader({ request }: LoaderFunctionArgs) {
  const { admin, session } = await authenticate.admin(request);

  // Fetch products list (limit to 10 for FREE tier)
  const productsResponse = await admin.graphql(GET_PRODUCTS_LIST, {
    variables: {
      first: 10
    }
  });

  const productsData = await productsResponse.json();
  const products = productsData.data?.products?.edges.map((edge: any) => ({
    id: edge.node.id,
    title: edge.node.title,
    handle: edge.node.handle
  })) || [];

  // Fetch shop info
  const shopResponse = await admin.graphql(GET_SHOP_INFO);
  const shopData = await shopResponse.json();
  const shopInfo: ShopInfo = {
    name: shopData.data?.shop?.name || '',
    primaryDomain: {
      url: shopData.data?.shop?.primaryDomain?.url || ''
    },
    contactEmail: shopData.data?.shop?.contactEmail || '',
    myshopifyDomain: shopData.data?.shop?.myshopifyDomain || ''
  };

  // Fetch active schemas from database
  const activeSchemasRaw = await prisma.schemaMarkup.findMany({
    where: {
      storeId: session.shop
    },
    orderBy: {
      updatedAt: 'desc'
    }
  });

  // Convert Date objects to strings for JSON serialization
  const activeSchemas = activeSchemasRaw.map(schema => ({
    id: schema.id,
    type: schema.type,
    pageId: schema.pageId,
    isActive: schema.isActive,
    createdAt: schema.createdAt.toISOString(),
    updatedAt: schema.updatedAt.toISOString(),
    schema: schema.schema
  }));

  // Count schemas by type
  const schemaCount = {
    product: activeSchemas.filter(s => s.type === 'PRODUCT').length,
    organization: activeSchemas.filter(s => s.type === 'ORGANIZATION').length,
    breadcrumb: activeSchemas.filter(s => s.type === 'BREADCRUMB').length
  };

  // Define FREE tier limits
  const limits = {
    maxProductSchemas: 50,
    canCreateOrganization: schemaCount.organization < 1,
    canCreateBreadcrumb: true // Always true, auto-generated
  };

  // Generate example breadcrumb schema for preview
  const exampleBreadcrumb = generateExampleBreadcrumbSchema(shopInfo.myshopifyDomain);
  const breadcrumbValidation = validateBreadcrumbSchema(exampleBreadcrumb);

  return json<LoaderData>({
    products,
    shopInfo,
    activeSchemas,
    schemaCount,
    limits,
    exampleBreadcrumb,
    breadcrumbValidation
  });
}

/**
 * Action: Handles schema creation, update, and deletion
 */
export async function action({ request }: ActionFunctionArgs) {
  const { admin, session } = await authenticate.admin(request);
  const formData = await request.formData();
  const action = formData.get('action');

  try {
    if (action === 'generateProduct') {
      const productId = formData.get('productId') as string;

      // Fetch full product data
      const productResponse = await admin.graphql(GET_PRODUCT_FOR_SCHEMA, {
        variables: { id: productId }
      });

      const productData = await productResponse.json();
      const product: ShopifyProduct = productData.data?.product;

      if (!product) {
        return json({ success: false, error: 'Product not found' }, { status: 404 });
      }

      // Generate schema
      const schema = generateProductSchema(product, session.shop);

      // Validate schema
      const validation = validateProductSchema(schema);

      return json({
        success: true,
        schema,
        validation,
        productTitle: product.title
      });
    }

    if (action === 'generateOrganization') {
      // Fetch shop info
      const shopResponse = await admin.graphql(GET_SHOP_INFO);
      const shopData = await shopResponse.json();

      const shopInfo: ShopInfo = {
        name: shopData.data?.shop?.name || '',
        primaryDomain: {
          url: shopData.data?.shop?.primaryDomain?.url || ''
        },
        contactEmail: shopData.data?.shop?.contactEmail || '',
        myshopifyDomain: shopData.data?.shop?.myshopifyDomain || ''
      };

      // Generate schema
      const schema = generateOrganizationSchema(shopInfo);

      // Validate schema
      const validation = validateOrganizationSchema(schema);

      return json({
        success: true,
        schema,
        validation
      });
    }

    if (action === 'saveProductSchema') {
      const productId = formData.get('productId') as string;
      const schemaJson = formData.get('schema') as string;

      const schema = JSON.parse(schemaJson);

      // Save to database
      await prisma.schemaMarkup.create({
        data: {
          storeId: session.shop,
          pageId: productId,
          type: 'PRODUCT',
          schema: schema,
          isActive: true
        }
      });

      return json({ success: true, message: 'Product schema saved successfully' });
    }

    if (action === 'saveOrganizationSchema') {
      const schemaJson = formData.get('schema') as string;
      const schema = JSON.parse(schemaJson);

      // Check if organization schema already exists
      const existing = await prisma.schemaMarkup.findFirst({
        where: {
          storeId: session.shop,
          type: 'ORGANIZATION'
        }
      });

      if (existing) {
        // Update existing
        await prisma.schemaMarkup.update({
          where: { id: existing.id },
          data: {
            schema: schema,
            updatedAt: new Date()
          }
        });
      } else {
        // Create new
        await prisma.schemaMarkup.create({
          data: {
            storeId: session.shop,
            type: 'ORGANIZATION',
            schema: schema,
            isActive: true
          }
        });
      }

      return json({ success: true, message: 'Organization schema saved successfully' });
    }

    if (action === 'deleteSchema') {
      const schemaId = formData.get('schemaId') as string;

      await prisma.schemaMarkup.delete({
        where: { id: schemaId }
      });

      return json({ success: true, message: 'Schema deleted successfully' });
    }

    if (action === 'toggleSchema') {
      const schemaId = formData.get('schemaId') as string;
      const isActive = formData.get('isActive') === 'true';

      await prisma.schemaMarkup.update({
        where: { id: schemaId },
        data: { isActive: !isActive }
      });

      return json({ success: true, message: 'Schema status updated' });
    }

    return json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Schema action error:', error);
    return json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * Schema Management Page Component
 */
export default function SchemaManagementPage() {
  const loaderData = useLoaderData<LoaderData>();
  const submit = useSubmit();
  const navigation = useNavigation();

  // State
  const [selectedProductId, setSelectedProductId] = useState('');
  const [generatedProductSchema, setGeneratedProductSchema] = useState<ProductSchema | null>(null);
  const [productValidation, setProductValidation] = useState<ValidationResult | null>(null);
  const [generatedOrgSchema, setGeneratedOrgSchema] = useState<OrganizationSchema | null>(null);
  const [orgValidation, setOrgValidation] = useState<ValidationResult | null>(null);
  const [breadcrumbEnabled, setBreadcrumbEnabled] = useState(true);
  const [selectedSchemaForView, setSelectedSchemaForView] = useState<string | null>(null);

  const isLoading = navigation.state !== 'idle';

  // Product options for select
  const productOptions = [
    { label: 'Select a product', value: '' },
    ...loaderData.products.map(p => ({
      label: p.title,
      value: p.id
    }))
  ];

  // Generate product schema
  const handleGenerateProductSchema = useCallback(async () => {
    if (!selectedProductId) return;

    const formData = new FormData();
    formData.append('action', 'generateProduct');
    formData.append('productId', selectedProductId);

    submit(formData, { method: 'post' });
  }, [selectedProductId, submit]);

  // Generate organization schema
  const handleGenerateOrgSchema = useCallback(async () => {
    const formData = new FormData();
    formData.append('action', 'generateOrganization');

    submit(formData, { method: 'post' });
  }, [submit]);

  // Save product schema
  const handleSaveProductSchema = useCallback(() => {
    if (!generatedProductSchema) return;

    const formData = new FormData();
    formData.append('action', 'saveProductSchema');
    formData.append('productId', selectedProductId);
    formData.append('schema', JSON.stringify(generatedProductSchema));

    submit(formData, { method: 'post' });
  }, [generatedProductSchema, selectedProductId, submit]);

  // Save organization schema
  const handleSaveOrgSchema = useCallback(() => {
    if (!generatedOrgSchema) return;

    const formData = new FormData();
    formData.append('action', 'saveOrganizationSchema');
    formData.append('schema', JSON.stringify(generatedOrgSchema));

    submit(formData, { method: 'post' });
  }, [generatedOrgSchema, submit]);

  // Delete schema
  const handleDeleteSchema = useCallback((schemaId: string) => {
    if (!confirm('Are you sure you want to delete this schema?')) return;

    const formData = new FormData();
    formData.append('action', 'deleteSchema');
    formData.append('schemaId', schemaId);

    submit(formData, { method: 'post' });
  }, [submit]);

  // Toggle schema active status
  const handleToggleSchema = useCallback((schemaId: string, isActive: boolean) => {
    const formData = new FormData();
    formData.append('action', 'toggleSchema');
    formData.append('schemaId', schemaId);
    formData.append('isActive', String(isActive));

    submit(formData, { method: 'post' });
  }, [submit]);

  // Active schemas table data
  const activeSchemaRows = loaderData.activeSchemas.map(schema => {
    const schemaObj = schema.schema as any;
    const resourceName = schemaObj.name || schemaObj['@type'] || 'N/A';

    return [
      <Badge key="type" tone="info">{schema.type}</Badge>,
      resourceName,
      <Badge key="status" tone={schema.isActive ? 'success' : 'info'}>
        {schema.isActive ? 'Active' : 'Inactive'}
      </Badge>,
      new Date(schema.updatedAt).toLocaleDateString(),
      <InlineStack key="actions" gap="200">
        <Button
          size="slim"
          icon={ViewIcon}
          onClick={() => setSelectedSchemaForView(schema.id)}
        >
          View
        </Button>
        <Button
          size="slim"
          variant="plain"
          tone="critical"
          icon={DeleteIcon}
          onClick={() => handleDeleteSchema(schema.id)}
        >
          Delete
        </Button>
      </InlineStack>
    ];
  });

  return (
    <Page
      title="Schema Markup Generator"
      subtitle="Generate and manage structured data (JSON-LD) for better SEO"
      backAction={{ content: 'SEO Tools', url: '/app/seo' }}
    >
      <Layout>
        {/* Overview Section */}
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text variant="headingMd" as="h2">
                What is Schema Markup?
              </Text>
              <Text as="p">
                Schema markup (JSON-LD) is structured data that helps search engines understand your content better.
                It can enhance your search results with rich snippets, improve click-through rates, and boost SEO performance.
              </Text>

              <InlineStack gap="300">
                <Button
                  url="https://search.google.com/test/rich-results"
                  target="_blank"
                  icon={ExternalIcon}
                >
                  Google Rich Results Test
                </Button>
                <Button
                  url="https://schema.org"
                  target="_blank"
                  icon={ExternalIcon}
                  variant="plain"
                >
                  Schema.org Documentation
                </Button>
              </InlineStack>

              <Banner tone="info">
                <Text as="p">
                  <strong>FREE Tier Limits:</strong> Up to 50 product schemas, 1 organization schema,
                  and unlimited auto-generated breadcrumb schemas.
                </Text>
              </Banner>
            </BlockStack>
          </Card>
        </Layout.Section>

        {/* Product Schema Section */}
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <InlineStack align="space-between" blockAlign="center">
                <BlockStack gap="200">
                  <Text variant="headingMd" as="h2">
                    Product Schema
                  </Text>
                  <Text as="p" tone="subdued">
                    Generate rich product snippets for search results
                  </Text>
                </BlockStack>
                <Text as="span" variant="bodyMd">
                  {loaderData.schemaCount.product} / {loaderData.limits.maxProductSchemas}
                </Text>
              </InlineStack>

              <Divider />

              <BlockStack gap="300">
                <Select
                  label="Select Product"
                  options={productOptions}
                  value={selectedProductId}
                  onChange={setSelectedProductId}
                  disabled={isLoading}
                />

                <Button
                  variant="primary"
                  onClick={handleGenerateProductSchema}
                  disabled={!selectedProductId || isLoading}
                  loading={isLoading}
                >
                  Generate Product Schema
                </Button>
              </BlockStack>

              {generatedProductSchema && (
                <BlockStack gap="400">
                  <Divider />
                  <SchemaPreview
                    schema={generatedProductSchema}
                    schemaType="PRODUCT"
                    validation={productValidation || undefined}
                  />

                  {productValidation?.isValid && (
                    <Button
                      variant="primary"
                      onClick={handleSaveProductSchema}
                      disabled={isLoading || loaderData.schemaCount.product >= loaderData.limits.maxProductSchemas}
                    >
                      Apply to Product
                    </Button>
                  )}
                </BlockStack>
              )}
            </BlockStack>
          </Card>
        </Layout.Section>

        {/* Organization Schema Section */}
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <InlineStack align="space-between" blockAlign="center">
                <BlockStack gap="200">
                  <Text variant="headingMd" as="h2">
                    Organization Schema
                  </Text>
                  <Text as="p" tone="subdued">
                    Auto-generated from your store settings
                  </Text>
                </BlockStack>
                <Badge tone={loaderData.schemaCount.organization > 0 ? 'success' : 'info'}>
                  {loaderData.schemaCount.organization > 0 ? 'Active' : 'Not Created'}
                </Badge>
              </InlineStack>

              <Divider />

              <Button
                variant="primary"
                onClick={handleGenerateOrgSchema}
                disabled={isLoading}
                loading={isLoading}
              >
                {loaderData.schemaCount.organization > 0 ? 'Regenerate' : 'Generate'} Organization Schema
              </Button>

              {generatedOrgSchema && (
                <BlockStack gap="400">
                  <Divider />
                  <SchemaPreview
                    schema={generatedOrgSchema}
                    schemaType="ORGANIZATION"
                    validation={orgValidation || undefined}
                  />

                  {orgValidation?.isValid && (
                    <Button
                      variant="primary"
                      onClick={handleSaveOrgSchema}
                      disabled={isLoading}
                    >
                      Save Organization Schema
                    </Button>
                  )}
                </BlockStack>
              )}
            </BlockStack>
          </Card>
        </Layout.Section>

        {/* Breadcrumb Schema Section */}
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <InlineStack align="space-between" blockAlign="center">
                <BlockStack gap="200">
                  <Text variant="headingMd" as="h2">
                    Breadcrumb Schema
                  </Text>
                  <Text as="p" tone="subdued">
                    Auto-generated for all pages based on URL structure
                  </Text>
                </BlockStack>
                <Checkbox
                  label="Enabled"
                  checked={breadcrumbEnabled}
                  onChange={setBreadcrumbEnabled}
                />
              </InlineStack>

              <Divider />

              <Banner tone="info">
                Breadcrumb schemas are automatically generated for product, collection, page, and article pages.
                No manual configuration needed.
              </Banner>

              <BlockStack gap="200">
                <Text variant="headingSm" as="h3">
                  Preview Example (Product Page)
                </Text>
                <SchemaPreview
                  schema={loaderData.exampleBreadcrumb}
                  schemaType="BREADCRUMB"
                  validation={loaderData.breadcrumbValidation}
                />
              </BlockStack>
            </BlockStack>
          </Card>
        </Layout.Section>

        {/* Active Schemas Table */}
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text variant="headingMd" as="h2">
                Active Schemas
              </Text>

              <Divider />

              {loaderData.activeSchemas.length === 0 ? (
                <EmptyState
                  heading="No schemas created yet"
                  image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                >
                  <Text as="p">
                    Generate your first schema using the tools above to improve your store's SEO.
                  </Text>
                </EmptyState>
              ) : (
                <DataTable
                  columnContentTypes={['text', 'text', 'text', 'text', 'text']}
                  headings={['Type', 'Resource', 'Status', 'Last Updated', 'Actions']}
                  rows={activeSchemaRows}
                />
              )}
            </BlockStack>
          </Card>
        </Layout.Section>

        {/* Implementation Instructions */}
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text variant="headingMd" as="h2">
                Implementation Guide
              </Text>

              <Divider />

              <BlockStack gap="300">
                <Text variant="headingSm" as="h3">
                  How Schemas Are Injected
                </Text>
                <Text as="p">
                  Generated schemas are automatically injected into your theme's pages using Shopify app blocks or theme extensions.
                  The schemas appear in the page's <code>&lt;head&gt;</code> section as JSON-LD.
                </Text>

                <Text variant="headingSm" as="h3">
                  Testing Your Schemas
                </Text>
                <Text as="p">
                  After saving a schema:
                </Text>
                <Box paddingInlineStart="400">
                  <ol>
                    <li>Copy the generated JSON-LD</li>
                    <li>Visit Google's Rich Results Test</li>
                    <li>Paste the JSON-LD or enter your page URL</li>
                    <li>Review any errors or warnings</li>
                    <li>Fix issues and regenerate if needed</li>
                  </ol>
                </Box>

                <Text variant="headingSm" as="h3">
                  Best Practices
                </Text>
                <Box paddingInlineStart="400">
                  <ul>
                    <li>Keep product descriptions between 50-200 characters</li>
                    <li>Use high-quality images (at least 800x800px)</li>
                    <li>Ensure all URLs are absolute and use HTTPS</li>
                    <li>Include accurate pricing and availability</li>
                    <li>Test schemas before deploying to production</li>
                    <li>Update schemas when product information changes</li>
                  </ul>
                </Box>
              </BlockStack>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
