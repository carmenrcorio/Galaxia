const { getDefaultConfig } = require("expo/metro-config");

/**
 * SDK 52+ Metro already detects pnpm workspaces (Expo "Work with monorepos").
 * Do not restore the SDK 51 manual resolver block — it fights the default.
 */
module.exports = getDefaultConfig(__dirname);
