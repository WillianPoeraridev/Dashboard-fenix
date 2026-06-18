import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    rules: {
      // Padrão idiomático de fetch-on-mount e sync de state com searchParams.
      // Regra nova/agressiva do Next 16; mantida como aviso, não erro.
      "react-hooks/set-state-in-effect": "warn",
    },
  },
]);

export default eslintConfig;
