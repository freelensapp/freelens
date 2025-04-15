import nodeExternals from "webpack-node-externals";
import { configForNode } from "./src/node-config";

export default {
  ...configForNode,
  externals: [nodeExternals({ modulesFromFile: true })],
};
