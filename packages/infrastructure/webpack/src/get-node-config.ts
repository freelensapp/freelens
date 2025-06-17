import ForkTsCheckerPlugin from "fork-ts-checker-webpack-plugin";
import nodeExternals from "webpack-node-externals";
import { MakePeerDependenciesExternalPlugin } from "./plugins/make-peer-dependencies-external";
import { ProtectFromImportingNonDependencies } from "./plugins/protect-from-importing-non-dependencies";

import type { Configuration } from "webpack";

export type Paths = {
  entrypointFilePath: string;
  outputDirectory: string;
};

export const getNodeConfig = ({ entrypointFilePath, outputDirectory }: Paths): Configuration => ({
  name: entrypointFilePath,
  entry: { index: entrypointFilePath },
  target: "node",
  mode: "production",

  performance: {
    maxEntrypointSize: 500000,
    hints: "error",
  },

  resolve: {
    extensions: [".ts", ".tsx", ".js"],
  },

  plugins: [
    new MakePeerDependenciesExternalPlugin(),
    new ProtectFromImportingNonDependencies(),

    new ForkTsCheckerPlugin({
      typescript: {
        mode: "write-dts",

        configOverwrite: {
          include: [entrypointFilePath],

          compilerOptions: {
            declaration: true,
            declarationDir: outputDirectory,
          },
        },
      },
    }),
  ],

  output: {
    path: outputDirectory,

    filename: (pathData) => (pathData.chunk?.name === "index" ? "index.js" : `${pathData.chunk?.name}/index.js`),

    library: {
      type: "commonjs2",
    },
  },

  optimization: {
    minimize: false,
  },

  externalsPresets: { node: true },

  externals: [nodeExternals({ modulesFromFile: true })],

  node: {
    __dirname: true,
    __filename: true,
  },

  module: {
    rules: [
      {
        test: /\.ts(x)?$/,
        loader: "ts-loader",
      },
    ],
  },
});
