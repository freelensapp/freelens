/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import ForkTsCheckerPlugin from "fork-ts-checker-webpack-plugin";
import path from "path";
import nodeExternals from "webpack-node-externals";
import { iconsAndImagesWebpackRules } from "./renderer";
import { buildDir, isDevelopment } from "./vars";

import type webpack from "webpack";

const webpackLensMain = (): webpack.Configuration => {
  return {
    name: "freelens-app-main",
    context: __dirname,
    target: "electron-main",
    mode: isDevelopment ? "development" : "production",
    devtool: isDevelopment ? "cheap-module-source-map" : "source-map",
    cache: isDevelopment ? { type: "filesystem" } : false,
    entry: {
      main: path.resolve(__dirname, "..", "src", "main", "library.ts"),
    },
    output: {
      library: {
        type: "commonjs2",
      },
      path: path.resolve(buildDir, "library"),
    },
    optimization: {
      minimize: false,
    },
    resolve: {
      extensions: [".json", ".js", ".ts", ".tsx"],
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
          test: (modulePath) => modulePath.endsWith(".ts") && !modulePath.endsWith(".test.ts"),
          exclude: /node_modules/,
          use: {
            loader: "ts-loader",
            options: {
              transpileOnly: true,
              compilerOptions: {
                sourceMap: false,
              },
            },
          },
        },
        {
          test: /\.(yaml|yml)$/,
          type: "asset/source",
        },
        ...iconsAndImagesWebpackRules(),
      ],
    },
    plugins: [
      new ForkTsCheckerPlugin({
        typescript: {
          mode: "write-dts",
          configOverwrite: {
            compilerOptions: {
              declaration: true,
            },
          },
        },
      }),
    ],
  };
};

export default webpackLensMain;
