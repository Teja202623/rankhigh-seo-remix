// app/graphql/schema.queries.ts

/**
 * GraphQL queries for fetching data needed for schema markup generation
 */

/**
 * Fetches product data for generating Product schema
 * Includes all required fields: title, description, images, price, variants, etc.
 */
export const GET_PRODUCT_FOR_SCHEMA = `
  query getProductForSchema($id: ID!) {
    product(id: $id) {
      id
      title
      description
      vendor
      handle
      productType
      priceRangeV2 {
        minVariantPrice {
          amount
          currencyCode
        }
      }
      images(first: 5) {
        edges {
          node {
            url
            altText
          }
        }
      }
      variants(first: 1) {
        edges {
          node {
            id
            sku
            availableForSale
            price
          }
        }
      }
    }
  }
`;

/**
 * Fetches multiple products for schema generation (used in product selector)
 * Limited query for listing purposes
 */
export const GET_PRODUCTS_LIST = `
  query getProductsList($first: Int!, $after: String, $query: String) {
    products(first: $first, after: $after, query: $query) {
      edges {
        node {
          id
          title
          handle
          vendor
          images(first: 1) {
            edges {
              node {
                url
              }
            }
          }
          priceRangeV2 {
            minVariantPrice {
              amount
              currencyCode
            }
          }
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

/**
 * Fetches shop information for generating Organization schema
 * Includes store name, domain, contact email
 */
export const GET_SHOP_INFO = `
  query getShopInfo {
    shop {
      name
      primaryDomain {
        url
      }
      contactEmail
      myshopifyDomain
      billingAddress {
        address1
        city
        province
        zip
        country
        phone
      }
    }
  }
`;

/**
 * Fetches shop metafields for additional organization data
 * Can be used to store social media links, logo URL, etc.
 */
export const GET_SHOP_METAFIELDS = `
  query getShopMetafields($namespace: String!) {
    shop {
      metafields(first: 10, namespace: $namespace) {
        edges {
          node {
            key
            value
            type
          }
        }
      }
    }
  }
`;

/**
 * Fetches a single product by handle (useful for breadcrumb generation)
 */
export const GET_PRODUCT_BY_HANDLE = `
  query getProductByHandle($handle: String!) {
    productByHandle(handle: $handle) {
      id
      title
      handle
    }
  }
`;

/**
 * Fetches collection information (for breadcrumb generation)
 */
export const GET_COLLECTION_BY_HANDLE = `
  query getCollectionByHandle($handle: String!) {
    collectionByHandle(handle: $handle) {
      id
      title
      handle
    }
  }
`;

/**
 * Fetches article information (for breadcrumb generation)
 */
export const GET_ARTICLE_BY_HANDLE = `
  query getArticleByHandle($blogHandle: String!, $articleHandle: String!) {
    blog(handle: $blogHandle) {
      id
      title
      articleByHandle(handle: $articleHandle) {
        id
        title
        handle
      }
    }
  }
`;

/**
 * Fetches page information
 */
export const GET_PAGE_BY_HANDLE = `
  query getPageByHandle($handle: String!) {
    pageByHandle(handle: $handle) {
      id
      title
      handle
    }
  }
`;

/**
 * Count total products (for FREE tier limit checking)
 */
export const COUNT_PRODUCTS = `
  query countProducts {
    products(first: 1) {
      pageInfo {
        hasNextPage
      }
    }
  }
`;

/**
 * Search products for product selector
 */
export const SEARCH_PRODUCTS = `
  query searchProducts($query: String!, $first: Int!) {
    products(first: $first, query: $query) {
      edges {
        node {
          id
          title
          handle
          featuredImage {
            url
            altText
          }
          priceRangeV2 {
            minVariantPrice {
              amount
              currencyCode
            }
          }
        }
      }
    }
  }
`;

/**
 * Fetch collections list (for future enhancements)
 */
export const GET_COLLECTIONS_LIST = `
  query getCollectionsList($first: Int!, $after: String) {
    collections(first: $first, after: $after) {
      edges {
        node {
          id
          title
          handle
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;
