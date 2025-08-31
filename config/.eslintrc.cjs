module.exports = {
  env: { browser: true, es2022: true },
  extends: ["eslint:recommended"],
  plugins: ["security"],
  rules: {
    "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
    "no-undef": "error",
    "no-implied-eval": "error",
    "no-alert": "off",
    "security/detect-eval-with-expression": "error",
    "security/detect-new-buffer": "error",
    "no-restricted-syntax": [
      "warn",
      {
        selector: "MemberExpression[object.name='Element'][property.name='innerHTML']",
        message: "Evita usar innerHTML con datos no sanitizados."
      }
    ]
  }
};
