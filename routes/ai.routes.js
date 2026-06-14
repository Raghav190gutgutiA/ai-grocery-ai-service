const express = require("express");

const router = express.Router();

const {
  generateRecipe,
} = require("../controllers/groceryControllers");

router.post(
  "/recipe",
  generateRecipe
);

module.exports = router;