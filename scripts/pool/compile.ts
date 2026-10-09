import * as fs from "fs";
import * as path from "path";

// Function to find imports in node_modules or local contracts directory
function findImports(importPath: string) {
  try {
    let resolvedPath = "";
    if (importPath.startsWith("@openzeppelin/")) {
      resolvedPath = path.resolve(__dirname, "../../node_modules", importPath);
    } else if (importPath.startsWith("./") || importPath.startsWith("../")) {
      resolvedPath = path.resolve(__dirname, "../../contracts/pool", importPath);
    } else {
      resolvedPath = path.resolve(__dirname, "../../contracts", importPath);
    }

    if (fs.existsSync(resolvedPath)) {
      return { contents: fs.readFileSync(resolvedPath, "utf-8") };
    }
    return { error: `File not found: ${importPath} (resolved: ${resolvedPath})` };
  } catch (e: any) {
    return { error: e.message };
  }
}

export function compileContracts() {
  const solc = require("solc");
  console.log(`[Compile] Compiling contracts with solc ${solc.version()}...`);

  const poolDir = path.resolve(__dirname, "../../contracts/pool");
  const contractFiles = ["IPool.sol", "MockUSDC.sol", "PoolVault.sol", "CircleFactory.sol", "StubPool.sol"];

  const sources: Record<string, { content: string }> = {};
  for (const file of contractFiles) {
    const filePath = path.join(poolDir, file);
    if (fs.existsSync(filePath)) {
      sources[file] = { content: fs.readFileSync(filePath, "utf-8") };
    }
  }

  const input = {
    language: "Solidity",
    sources,
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      },
      outputSelection: {
        "*": {
          "*": ["abi", "evm.bytecode", "evm.deployedBytecode"]
        }
      }
    }
  };

  const output = JSON.parse(solc.compile(JSON.stringify(input), { import: findImports }));

  let hasErrors = false;
  if (output.errors) {
    for (const error of output.errors) {
      if (error.severity === "error") {
        console.error(`[Compile Error] ${error.formattedMessage}`);
        hasErrors = true;
      } else {
        console.warn(`[Compile Warning] ${error.formattedMessage}`);
      }
    }
  }

  if (hasErrors) {
    throw new Error("Compilation failed with errors.");
  }

  const outDir = path.resolve(__dirname, "../../contracts/artifacts");
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const artifacts: Record<string, { abi: any; bytecode: string }> = {};

  for (const [sourceFile, contracts] of Object.entries(output.contracts as Record<string, any>)) {
    for (const [contractName, contractData] of Object.entries(contracts as Record<string, any>)) {
      const artifact = {
        contractName,
        sourceFile,
        abi: contractData.abi,
        bytecode: `0x${contractData.evm.bytecode.object}`,
        deployedBytecode: `0x${contractData.evm.deployedBytecode.object}`
      };
      artifacts[contractName] = artifact;
      fs.writeFileSync(path.join(outDir, `${contractName}.json`), JSON.stringify(artifact, null, 2));
    }
  }

  console.log(`[Compile] Successfully compiled ${Object.keys(artifacts).length} artifacts to ${outDir}`);
  return artifacts;
}

if (require.main === module) {
  try {
    compileContracts();
  } catch (e: any) {
    console.error(e.message);
    process.exit(1);
  }
}
