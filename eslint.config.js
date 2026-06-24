import js from "@eslint/js";

import prettierConfig from "eslint-config-prettier";
import eslintPluginImport from "eslint-plugin-import";
import reactPlugin from "eslint-plugin-react";
import reactRefresh from "eslint-plugin-react-refresh";
import globals from "globals";

import reactHooks from "eslint-plugin-react-hooks";

import tseslint from "typescript-eslint";

export default [
  {
    ignores: [
      "dist",
      "*.config.*",
      "vitest.setup.*",
      ".lefthook/**/*",
      "node_modules/**/*",
      "**/*.d.ts",
      "lint-staged.mjs",
      ".*.yml",
      "README.md",
    ],
  },

  js.configs.recommended, // Базовая конфигурация ESLint
  ...tseslint.configs.recommended, // Конфигурация TypeScript
  prettierConfig, // Отключаем правила ESLint, которые конфликтуют с Prettier
  // отключить правило для barrel-файлов
  {
    files: ["**/index.{ts,tsx}"],
    rules: {
      "react-refresh/only-export-components": "off",
    },
  },
  {
    files: ["**/*.{ts,tsx}"],
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
      react: reactPlugin,
      import: eslintPluginImport,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      /** Выключение ошибки мемоизация из за недостатка параметров зависимостей хуков, так как это же уже подсвечивается через react-hooks/exhaustive-deps */
      "react-hooks/preserve-manual-memoization": ["off"],
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "react-hooks/refs": ["warn"],
      // Импорт
      "no-restricted-imports": ["error", { patterns: [{ group: ["**/../../*"] }] }], // Запрещает глубокую вложенность (2+ уровня ../)
      "import/no-duplicates": "error", // Запрещает дублирующиеся импорты из одного модуля
      "import/named": "off", // Проверяет, что импортируемое имя существует в экспорте модуля
      "import/namespace": "off", // Проверяет доступ к свойствам namespace импортов
      "import/default": "off", // Проверяет что default import существует
      "import/no-named-as-default": "off", // Запрещает импорт default export под именем, которое совпадает с named export
      "import/no-named-as-default-member": "error", // Запрещает обращение к default export как к named export

      // TypeScript
      "@typescript-eslint/no-explicit-any": "error", // Запрещает использование any в типах
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
        },
      ], // Предупреждает о неиспользуемых переменных
      "@typescript-eslint/ban-ts-comment": "warn", // Ограничивает использование комментариев `@ts-ignore` и подобных
      "@typescript-eslint/no-empty-interface": "error", // Предупреждает об использовании пустых интерфейсов
      "@typescript-eslint/prefer-as-const": "warn", // Рекомендует использовать as const для литералов
      "@typescript-eslint/no-unsafe-assignment": "error", // Запрещает небезопасные присваивания
      "@typescript-eslint/no-unsafe-member-access": "error", // Запрещает небезопасный доступ к свойствам

      // React
      "react/jsx-key": "error", // Проверяет наличие ключей в элементах списка
      "react/no-unknown-property": "warn", // Предупреждает о неизвестных свойствах в JSX
      "react/prop-types": "off", // Отключим, есть ts
      "react/no-array-index-key": "warn", // Предупреждает об использовании индекса массива в качестве key
      "react/jsx-no-useless-fragment": "error", // Запрещает о бесполезные фрагменты (<></> без необходимости)
      "react/jsx-curly-brace-presence": "error", // Предупреждает о лишних фигурных скобках в JSX
      "react/self-closing-comp": "warn", // Рекомендует использовать самозакрывающиеся теги для компонентов без детей
      "react/require-default-props": ["off"], // defaultProps не указаны
      "react/button-has-type": ["off"], // У кнопки не указан тип
      "react/no-children-prop": ["warn"], // Предупреждает об использовании пропса children
      "react/jsx-handler-names": "warn", // Имена обработчиков в формате `handle*`/`on*`

      // Общее
      "no-console": "error",
      "no-unused-expressions": "error",
      "no-else-return": "error", // Рекомендует избегать else после return
      "no-extra-boolean-cast": "error", // Предупреждает о лишних приведениях к boolean
      "no-multi-spaces": "error", // Запрещает множественные пробелы
      "no-trailing-spaces": "error", // Запрещает пробелы в конце строк
      "prefer-const": "error", // Рекомендует использовать const
      eqeqeq: "error", // Требует использования === и !== вместо == и !=
      "prefer-template": "error", // Рекомендует использовать шаблонные строки вместо конкатенации
      "spaced-comment": ["error"], // Пробелы в комментариях
      "no-nested-ternary": ["error"], // Вложенные тернарные операторы
      "no-plusplus": ["error"], // Использование ++ и --
      "no-useless-return": ["error"], // Бесполезные return
      "no-unsafe-optional-chaining": ["error"], // Небезопасный optional chaining
      "default-case": ["error"], // default в switch
      "no-prototype-builtins": ["error"], // Использование методов Object.prototype
      "no-confusing-arrow": ["error"], // Избыточно сложные стрелочные функции
      "no-lonely-if": ["error"], // Избежать изолированных условий "if
      "prefer-arrow-callback": ["error"], // Предпочитать стрелочные функции в колбэках
      "prefer-destructuring": ["error"], // Предпочитать деструктуризацию
      "dot-notation": "warn", // Требует `obj.key` вместо `obj["key"]` (если возможно)
      "no-implicit-coercion": "error", // Запрещает неявное приведение типов (`!!`, `+str`)
      "object-shorthand": "error", // Требует `{ key }` вместо `{ key: key }`
      "no-magic-numbers": [
        "warn",
        {
          ignore: [0, 1, -1], // Разрешает заданные числа в любом контексте
          ignoreDefaultValues: true, // Разрешает числа в пропсах по умолчанию
          ignoreArrayIndexes: true, // Разрешает числа в индексах массивов (arr[1])
          detectObjects: false, // Не проверяет числа в объектах
          enforceConst: false, // Разрешает числа без const (например, сразу в return)
          ignoreEnums: true, // Разрешает числа в enum
        },
      ],
      "max-params": ["warn", 3], // Максимум 3 параметра в функции
    },
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
        project: "tsconfig.app.json",
      },
    },
    settings: {
      react: {
        version: "detect",
      },
    },
  },
];
