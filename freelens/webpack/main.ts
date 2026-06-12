import path from "path";
import nodeExternals from "webpack-node-externals";
import { iconsAndImagesWebpackRules } from "./renderer";
import { buildDir, isDevelopment, mainDir } from "./vars";

import type webpack from "webpack";

const main: webpack.Configuration = {
  name: "freelens-app-main",
  context: __dirname,
  target: "electron-main",
  mode: isDevelopment ? "development" : "production",
  devtool: isDevelopment ? "cheap-module-source-map" : "source-map",
  cache: isDevelopment ? { type: "filesystem" } : false,
  entry: {
    main: path.resolve(mainDir, "index.ts"),
  },
  output: {
    libraryTarget: "global",
    path: buildDir,
  },
  optimization: {
    minimize: false,
  },
  resolve: {
    extensions: [".json", ".js", ".ts"],
  },
  externals: [nodeExternals({ modulesFromFile: true })],
  module: {
    parser: {
      javascript: {
        commonjsMagicComments: true,
      },
    },
    rules: [
      {
        test: /\.node$/,
        use: "node-loader",
      },
      {
        test: /\.ts$/,
        loader: "ts-loader",
        options: {},
      },
      ...iconsAndImagesWebpackRules(),
    ],
  },
  plugins: [],
};

export default main;
