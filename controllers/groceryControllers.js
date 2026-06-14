const groceryAgent = require("../agent/groceryAgent");

const {
  HumanMessage,
} = require("@langchain/core/messages");

exports.generateRecipe = async (
  req,
  res
) => {
  try {
    const { query } = req.body;

    if (!query) {
      return res.status(400).json({
        success: false,
        message: "Query is required",
      });
    }

    const result =
      await groceryAgent.invoke({
        messages: [
          new HumanMessage(query),
        ],
      });

    const response =
      result.messages[
        result.messages.length - 1
      ];

    return res.status(200).json({
      success: true,
      data: JSON.parse(
        response.content
      ),
    });
  } catch (error) {
    console.log(error);

    return res.status(500).json({
      success: false,
      message:
        "Failed to generate recipe",
    });
  }
};