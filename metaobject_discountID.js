// note it should apply for the form in discount function. 
export const loader = async ({ request }) => {
  const { admin } = await authenticate.admin(request);

  const res = await admin.graphql(`
    {
      metaobjects(type: "app_discount_config", first: 50) {
        nodes {
          id
          fields {
            key
            value
          }
        }
      }
    }
  `);

  const nodes = (await res.json()).data.metaobjects.nodes;

  const discountConfig = nodes.map((node) => {
    const item = { id: node.id };
    node.fields.forEach((f) => {
      item[f.key] =
        f.key === "product_ids" ? JSON.parse(f.value) : f.value;
    });
    return item;
  });

  return { discountConfig };
};

export const action = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  const formData = await request.formData();

  const intent = formData.get("intent");

  const quantity = formData.get("quantity");
  const percentage = formData.get("percentage");
  const message = formData.get("message");
  const productIds = formData.get("product")
    ? JSON.parse(formData.get("product")).map((p) => p.id)
    : [];

  const discountId = formData.get("discountId");
  const metaobjectId = formData.get("metaobjectId");

  const metafieldConfig = {
    quantity,
    percentage,
    message,
    productIds,
  };

  /* ================= CREATE ================= */
  if (intent === "create") {
    // 1️⃣ Create Discount
    const res = await admin.graphql(
      `#graphql
      mutation CreateDiscount($input: DiscountAutomaticAppInput!) {
        discountAutomaticAppCreate(automaticAppDiscount: $input) {
          automaticAppDiscount { discountId }
          userErrors { message }
        }
      }`,
      {
        variables: {
          input: {
            title: `Discount ${Date.now()}`,
            functionHandle: "discount-function",
            startsAt: new Date().toISOString(),
            metafields: [
              {
                namespace: "custom",
                key: "function-configuration",
                type: "json",
                value: JSON.stringify(metafieldConfig),
              },
            ],
          },
        },
      }
    );

    const json = await res.json();
    const createdDiscountId =
      json.data.discountAutomaticAppCreate.automaticAppDiscount.discountId;

    // 2️⃣ Create Metaobject
    await admin.graphql(
      `#graphql
      mutation CreateMetaobject($metaobject: MetaobjectCreateInput!) {
        metaobjectCreate(metaobject: $metaobject) {
          metaobject { id }
          userErrors { message }
        }
      }`,
      {
        variables: {
          metaobject: {
            type: "app_discount_config",
            fields: [
              { key: "discount_id", value: createdDiscountId },
              { key: "quantity", value: quantity },
              { key: "percentage", value: percentage },
              { key: "message", value: message },
              { key: "product_ids", value: JSON.stringify(productIds) },
            ],
          },
        },
      }
    );

    return { ok: true };
  }

  /* ================= UPDATE ================= */
  if (intent === "update") {
    // 1️⃣ Update Discount Function Metafield
    await admin.graphql(
      `#graphql
      mutation UpdateFunctionConfig($id: ID!, $value: String!) {
        metafieldsSet(metafields: [{
          ownerId: $id
          namespace: "custom"
          key: "function-configuration"
          type: "json"
          value: $value
        }]) {
          userErrors { message }
        }
      }`,
      {
        variables: {
          id: discountId,
          value: JSON.stringify(metafieldConfig),
        },
      }
    );

    // 2️⃣ Update Metaobject
    await admin.graphql(
      `#graphql
      mutation UpdateMetaobject($id: ID!, $fields: [MetaobjectFieldInput!]!) {
        metaobjectUpdate(id: $id, fields: $fields) {
          metaobject { id }
          userErrors { message }
        }
      }`,
      {
        variables: {
          id: metaobjectId,
          fields: [
            { key: "quantity", value: quantity },
            { key: "percentage", value: percentage },
            { key: "message", value: message },
            { key: "product_ids", value: JSON.stringify(productIds) },
          ],
        },
      }
    );

    return { ok: true };
  }

  /* ================= DELETE ================= */
  if (intent === "delete") {
    // 1️⃣ Delete Discount
    await admin.graphql(
      `#graphql
      mutation DeleteDiscount($id: ID!) {
        discountAutomaticDelete(id: $id) {
          deletedAutomaticDiscountId
          userErrors { message }
        }
      }`,
      { variables: { id: discountId } }
    );

    // 2️⃣ Delete Metaobject
    await admin.graphql(
      `#graphql
      mutation DeleteMetaobject($id: ID!) {
        metaobjectDelete(id: $id) {
          deletedId
          userErrors { message }
        }
      }`,
      { variables: { id: metaobjectId } }
    );

    return { ok: true };
  }

  throw new Error("Invalid intent");
};


/*
replace two things : 

item.id           // Metaobject ID
item.discount_id  // Shopify Discount ID

*/
// for edit and delete buttons
fetcher.submit({
  intent: "update",
  metaobjectId: selectedDiscount.id,
  discountId: selectedDiscount.discount_id,
  quantity: editQuantity,
  percentage: editPercentage,
  message: editMessage,
  product: JSON.stringify(editProducts),
});



fetcher.submit({
  intent: "delete",
  metaobjectId: selectedDiscount.id,
  discountId: selectedDiscount.discount_id,
});
