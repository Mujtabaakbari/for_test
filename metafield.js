
import { authenticate } from "../shopify.server";

import MainPage from "../components/main-page";

export const loader = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  // check if metaobject definition "Bundles" exists
    const checkDefinitionQuery = `#graphql
        query {
          metaobjectDefinitions(first:20) {
            edges {
              node {
                id
                type
              }
            }
          }
        }
      `;
    const checkResponse = await admin.graphql(checkDefinitionQuery);
    const checkData = await checkResponse.json();
    const alreadyExist = checkData.data.metaobjectDefinitions.edges.some(
        (edge) => edge.node.type === "bundle_definition" );

    if(!alreadyExist) {
      //check only if any metaobject exists .
        const createDefinitionMutation = `#graphql
        mutation CreateContentDefinition {
          metaobjectDefinitionCreate(
            definition: {
              name: "bundle_definition"
              type: "bundle_definition"
              fieldDefinitions: [
                { name: "Name", key: "name", type: "single_line_text_field" }
                { name: "Data", key: "data", type: "json" }
                { name: "Create_at", key: "create_at", type: "date_time" }
              ]
              capabilities: {
                publishable: { enabled: true }
              }
            }
          ) {
            metaobjectDefinition { id type }
            userErrors { field message }
          }
        }
      `;

    const r = await admin.graphql(createDefinitionMutation);
    console.log(r,"metaobject definition created successfull.");
  }

  const getMetaobjects = `#graphql
    query {
      metaobjects(type: "bundle_definition", first: 20) {
        edges {
          node {
            id
            handle
            type
            fields {
              key
              value
            }
          }
        }
      }
    }
  `;

  const metaobjectResponse =  await admin.graphql(getMetaobjects);
  const metaobjectJson = await metaobjectResponse.json();
  const metaobects = metaobjectJson?.data?.metaobjects?.edges?.map( (e)=> e.node) || [];

  return {metaobects};
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

  console.log("product id ==========> :", productIds);

  console.log(" ==========> ");

  console.log(name);
  console.log(data);
  console.log(actionType);
  console.log(createAt);

  console.log("==========> ");

  const fieldsArray = [
    { key: "name", value: name },
    { key: "data", value: JSON.stringify(data) },
    { key: "created_at", value: new Date().toISOString() },
  ].filter((f) => f.value !== undefined && f.value !== null);

  // CREATE: Create a new metaobject

      if (actionType === "create") {
        const createResponse = await admin.graphql(
      `#graphql
      mutation CreateMetaobject($fields: [MetaobjectFieldInput!]!) {
        metaobjectCreate(metaobject: {
          type: "bundle_definition"
          fields: $fields
        }) {
          metaobject { id }
          userErrors { field message code }
        }
      }
      `,
      {
        variables: {
          fields: fieldsArray,
        },
      }
    );


    const createData = await createResponse.json();
    const createPayload = createData.data.metaobjectCreate;
    const metaobject = createPayload.metaobject;
    const bundleMetaobjectId = metaobject.id;
    console.log("==============================");
    console.log(bundleMetaobjectId);
    console.log("==============================");

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

