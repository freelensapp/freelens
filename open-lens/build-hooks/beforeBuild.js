const archMap = {
    "amd64": "x86_64",
    "arm64": "aarch64",
}

module.exports = async (buildContext) => {
    if (process.arch === "x64" && process.platform === "linux") {
        if (buildContext.arch in archMap) {
            process.env.CC = `${archMap[buildContext.arch]}-linux-gnu-gcc`
            process.env.CXX = `${archMap[buildContext.arch]}-linux-gnu-g++`
        } else {
            process.env.CC = "gcc"
            process.env.CXX = "g++"
        }
    }
    return true
}
