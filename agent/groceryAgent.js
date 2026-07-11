require("dotenv").config();

const axios = require("axios");

const {
  ChatGoogleGenerativeAI,
} = require("@langchain/google-genai");

const {
  HumanMessage,
  SystemMessage,
} = require("@langchain/core/messages");

const {
  StateGraph,
  START,
  END,
} = require("@langchain/langgraph");

const model =
  new ChatGoogleGenerativeAI({
    model: "gemini-2.5-flash",
    apiKey: process.env.GOOGLE_API_KEY,
    temperature: 0.3,
  });

const GraphState = {
  messages: {
    value: (x, y) => y ?? x,
    default: () => [],
  },

  recipe: {
    value: (x, y) => y ?? x,
    default: () => null,
  },

  searchedProducts: {
    value: (x, y) => y ?? x,
    default: () => [],
  },

  cart: {
    value: (x, y) => y ?? x,
    default: () => [],
  },
};

async function generateRecipeNode(
  state
) {
  const response =
    await model.invoke([
      new SystemMessage(`
You are an AI Grocery Assistant.

Generate recipe from user request.

IMPORTANT RULES:

1. Return ONLY valid JSON.
2. Do not return markdown.
3. Do not return explanation.
4. Never return brands.
5. Never return package sizes.
6. Ingredient names should be generic.
7. Quantity should represent recipe requirement only.

Format:

{
  "title":"",
  "ingredients":[
    {
      "name":"",
      "quantity":0,
      "unit":""
    }
  ],
  "steps":[]
}

Example:

{
  "title":"Paneer Butter Masala",
  "ingredients":[
    {
      "name":"Paneer",
      "quantity":250,
      "unit":"g"
    },
    {
      "name":"Butter",
      "quantity":50,
      "unit":"g"
    }
  ],
  "steps":[
    "Cut paneer",
    "Cook gravy"
  ]
}
`),

      ...state.messages,
    ]);

  const cleaned =
    response.content
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

  let recipe;

  try {
    recipe = JSON.parse(cleaned);
  } catch (error) {
    throw new Error(
      `Invalid JSON received:\n${cleaned}`
    );
  }

  console.log(
    "\n========== RECIPE ==========\n"
  );

  console.log(
    JSON.stringify(recipe, null, 2)
  );

  return {
    recipe,
  };
}

async function searchProductsNode(
  state
) {
  try {
    const response =
      await axios.post(
        "https://ai-grocery-product-service.onrender.com/api/products/searchProductsForRecipe",
        {
          ingredients:
            state.recipe.ingredients,
        }
      );


    console.log(
      JSON.stringify(
        response.data.data,
        null,
        2
      )
    );

    return {
      searchedProducts:
        response.data.data,
    };
  } catch (error) {
    console.log(error);

    return {
      searchedProducts: [],
    };
  }
}

async function addToCartNode(
  state
) {
  const cart = [];

  for (const item of state.searchedProducts) {
    if (
      !item.products ||
      !item.products.length
    )
      continue;

    const product =
      item.products[0];
   console.log("checkProduct",product);
    cart.push({
      ingredient:
        item.ingredient,

      requiredQuantity:
        item.requiredQuantity,

      productId:
        product._id,

      productName:
        product.name,

      price:
        product.price,
	
	discountPercentage:product.discountPercentage,
	
	image:
            product.images?.[0]
              ?.url,
           userId:product?.userId,
 
	 userId:product?.userId,
      weight:
        product.weight,

      quantity: 1,
    });
  }

  console.log(
   "checkCart", JSON.stringify(cart, null, 2)
  );

  return {
    cart,
  };
}

async function finalNode(state) {
  return {
    messages: [
      {
        role: "assistant",

        content: JSON.stringify(
          {
            recipe:
              state.recipe,

            recommendedProducts:
              state.searchedProducts,

            cart:
              state.cart,
          },
          null,
          2
        ),
      },
    ],
  };
}

const workflow =
  new StateGraph({
    channels: GraphState,
  });

workflow.addNode(
  "generateRecipe",
  generateRecipeNode
);

workflow.addNode(
  "searchProducts",
  searchProductsNode
);

workflow.addNode(
  "addToCart",
  addToCartNode
);

workflow.addNode(
  "finalNode",
  finalNode
);

workflow.addEdge(
  START,
  "generateRecipe"
);

workflow.addEdge(
  "generateRecipe",
  "searchProducts"
);

workflow.addEdge(
  "searchProducts",
  "addToCart"
);

workflow.addEdge(
  "addToCart",
  "finalNode"
);

workflow.addEdge(
  "finalNode",
  END
);

const app =
  workflow.compile();

module.exports = app;