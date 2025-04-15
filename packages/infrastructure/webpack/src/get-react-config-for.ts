import MiniCssExtractPlugin from "mini-css-extract-plugin";
import type { Configuration } from "webpack";
import { type Paths, getNodeConfig } from "./get-node-config";

export const getReactConfigFor =
  ({ miniCssExtractPluginLoader = MiniCssExtractPlugin.loader } = {}) =>
  ({ entrypointFilePath, outputDirectory }: Paths): Configuration => {
    const nodeConfig = getNodeConfig({
      entrypointFilePath,
      outputDirectory,
    });

    return {
      ...nodeConfig,

      plugins: [
        ...nodeConfig.plugins!,

        new MiniCssExtractPlugin({
          filename: "[name].css",
        }),
      ],

      module: {
        ...nodeConfig.module,

        rules: [
          ...nodeConfig.module!.rules!,

          {
            test: /\.s?css$/,

            use: [
              miniCssExtractPluginLoader,

              {
                loader: "css-loader",

                options: {
                  sourceMap: false,

                  modules: {
                    auto: /\.module\./i, // https://github.com/webpack-contrib/css-loader#auto
                    mode: "local", // :local(.selector) by default
                    localIdentName: "[name]__[local]--[hash:base64:5]",
                  },
                },
              },

              {
                loader: "postcss-loader",
                options: {
                  sourceMap: false,
                  postcssOptions: {
                    plugins: ["tailwindcss"],
                  },
                },
              },

              {
                loader: "sass-loader",
                options: {
                  api: "modern",
                  sourceMap: false,
                },
              },
            ],
          },

          {
            test: /\.(ttf|eot|woff2?)$/,
            type: "asset/resource",
            generator: {
              filename: "fonts/[name][ext]",
            },
          },

          {
            test: /\.svg$/,
            type: "asset/source", // exports the source code of the asset, so we get XML
          },

          {
            test: /\.(jpg|png|ico)$/,
            type: "asset/resource",
            generator: {
              filename: "images/[name][ext]",
            },
          },
        ],
      },
    };
  };
