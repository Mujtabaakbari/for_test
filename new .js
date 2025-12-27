
import { authenticate } from "../shopify.server";

import MainPage from "../components/main-page";


export const loader = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  const response = await admin.graphql(
    `#graphql
      mutation CreateBundleMetaobjectDefinition($definition: MetaobjectDefinitionCreateInput!) {
        metaobjectDefinitionCreate(definition: $definition) {
          metaobjectDefinition {
            id
            name
            type
          }
          userErrors {
            field
            message
            code
          }
        }
      }
    `,
    {
      variables: {
        definition: {
          name: "MyBundle",
          type: "MyBundle",
          fieldDefinitions: [
            { name: "name", key: "name", type: "single_line_text_field" },
            { name: "data", key: "data", type: "json" },
            { name: "created_at", key: "created_at", type: "date_time" },
          ],
        },
      },
    },
  );

  const data = await response.json();
  const payload = data?.data?.metaobjectDefinitionCreate;
  const userErrors = payload?.userErrors ?? [];

  if (userErrors.length > 0) {
    const alreadyExists = userErrors.some((e) => e.code === "ALREADY_EXISTS");

    if (!alreadyExists) {
      return { errors: userErrors };
    }
  }

  const metaobjectDefinition = payload?.metaobjectDefinition ?? null;
  const metaobjectDefinitionId = metaobjectDefinition?.id;

  let metafieldDefinition = null;
  let metafieldErrors = [];

  if (metaobjectDefinitionId) {
    const metafieldResponse = await admin.graphql(
      `#graphql
    mutation CreateBundleOfferMetafieldDefinition(
      $definition: MetafieldDefinitionInput!
    ) {
      metafieldDefinitionCreate(definition: $definition) {
        createdDefinition {
          id
          name
          namespace
          key
        }
        userErrors {
          field
          message
          code
        }
      }
    }
   `,
      {
        variables: {
          definition: {
            name: "Bundle",
            namespace: "custom",
            key: "bundle",
            description: "bundle metaobject related",
            type: "metaobject_reference",
            ownerType: "PRODUCT",

            validations: [
              {
                name: "metaobject_definition_id",
                value: metaobjectDefinitionId,
              },
            ],
          },
        },
      },
    );

    const metafieldJson = await metafieldResponse.json();
    const metafieldPayload =
      metafieldJson?.data?.metafieldDefinitionCreate ?? null;
    metafieldErrors = metafieldPayload?.userErrors ?? [];
    metafieldDefinition = metafieldPayload?.createdDefinition ?? null;
  }

  return {
    metafieldDefinition,
    metafieldErrors,
  };
};


export const action = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  const formData = await request.formData();

  // Form data extraction
  const name = formData.get("name");
  const data = JSON.parse(formData.get("data"));
  const actionType = formData.get("actionType");
  const createAt = formData.get("createdAt");
  const metaobjectId = formData.get("metaobjectId");
  const productID =
    data.resource && data.resource.length > 0
      ? data.resource.map((product) => product.id)
      : [];
  const productIds = productID[0];
  console.log("hhhhhhhhhhhhhhhhhhhhhhhhhh");
  console.log("Product IDs:", productIds);
  console.log("hhhhhhhhhhhhhhhhhhhhhhhhhh");

  console.log(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>");

  console.log(name);
  console.log(data);
  console.log(actionType);
  console.log(createAt);

  console.log(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>");

  const fieldsArr = [
    { key: "name", value: name },
    { key: "data", value: JSON.stringify(data) },
    { key: "created_at", value: new Date().toISOString() },
  ].filter((f) => f.value !== undefined && f.value !== null);

  // CREATE: Create a new metaobject
  if (actionType === "create") {
    const createResponse = await admin.graphql(
      `#graphql
      mutation {
        metaobjectCreate(metaobject: {
          type: "MyBundle",
          fields: [
            ${fieldsArr.map((f) => `{ key: "${f.key}", value: """${f.value}""" }`).join(",\n")}
          ]
        }) {
          metaobject {
            id
            type
            fields { key value }
          }
          userErrors { field message code }
        }
      }`,
    );

    const createData = await createResponse.json();
    const createPayload = createData.data.metaobjectCreate;
    const metaobject = createPayload.metaobject;
    const bundleMetaobjectId = metaobject.id;
    console.log("lllllllllllllllllllllllllllllll");
    console.log(bundleMetaobjectId);
    console.log("lllllllllllllllllllllllllllllll");

    if (createData.data.metaobjectCreate.userErrors.length > 0) {
      return { errors: createData.data.metaobjectCreate.userErrors };
    }

    const response = await admin.graphql(
      `#graphql
      mutation MetafieldsSet($metafields: [MetafieldsSetInput!]!) {
        metafieldsSet(metafields: $metafields) {
          metafields {
            key
            namespace
            value
            createdAt
            updatedAt
          }
          userErrors {
            field
            message
            code
          }
        }
      }
      `,
      {
        variables: {
          metafields: [
            {
              key: "bundle",
              namespace: "custom",
              ownerId: productIds,
              type: "metaobject_reference",
              value: bundleMetaobjectId,
            },
          ],
        },
      },
    );

    const Metadata = await response.json();
    const payload = Metadata?.data?.metafieldsSet;
    const metafields = payload?.metafields ?? [];
    const userErrors = payload?.userErrors ?? [];

    if (userErrors.length > 0) {
      return { errors: userErrors };
    }

    return { metafields, metaobject: metaobject };
  }

  return { error: "Invalid action type or missing metaobjectId" };
};

 import { useLoaderData } from "react-router";
export default function Bundles() {
   const loaderData = useLoaderData();

  return <MainPage data={loaderData} />

}
