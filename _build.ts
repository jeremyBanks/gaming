#!/usr/bin/env -S deno run --allow-run --allow-read --allow-write
/** Rebuilds generated files. */
import { brotli, Sha3d256 } from "./deps.ts";

const main = async () => {
  if (new URL(import.meta.url).protocol === "file:") {
    // Start in the same directory as this script.
    Deno.chdir(new URL(".", import.meta.url).pathname);
  } else {
    console.error("_build.ts can only be run locally (from a file: URL).");
    Deno.exit(1);
  }

  Deno.chdir("chrome");

  await Deno.mkdir("_generated", { recursive: true });

  for (
    const cmd of [
      ["rustup", "--version"],
      ["cargo", "--version"],
      ["rustc", "--version"],
      ["cargo", "fmt"],
    ]
  ) {
    if (!await run(...cmd)) {
      console.log(`
  Suggestion:
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
  `);
      Deno.exit(1);
    }
  }

  if (
    !await run(
      "wasm-pack",
      "build",
      // TODO: switch to new "deno" target in next version of wasm-pack.
      "--target=web",
      "--out-dir=target/wasm_pkg",
    )
  ) {
    console.log(`
  Suggestion:
    rustup target add wasm32-unknown-unknown
    curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh
  `);
    throw Deno.exit(1);
  }

  if (
    !await run(
      "cargo",
      "build",
      "--release",
      "--bin",
      "windows",
      "--target=x86_64-pc-windows-gnu",
    )
  ) {
    console.log(`
  Suggestion:
    sudo apt install gcc-mingw-w64-x86-64
    rustup toolchain install stable-x86_64-pc-windows-gnu
    rustup target add x86_64-pc-windows-gnu
  `);
    throw Deno.exit(1);
  }

  await Deno.writeTextFile(
    "./_generated/crypto_bindings.js",
    `// deno-lint-ignore-file\n${await Deno.readTextFile(
      "./target/wasm_pkg/crypto.js",
    )}`,
  );

  await inlineBytes(
    "./_generated/crypto.wasm.js",
    await Deno.readFile("./target/wasm_pkg/crypto_bg.wasm"),
    "application/wasm",
  );

  await inlineBytes(
    "./_generated/windows.exe.js",
    await Deno.readFile("./target/x86_64-pc-windows-gnu/release/windows.exe"),
    "application/vnd.microsoft.portable-executable",
  );

  Deno.chdir("..");

  await run("deno", "fmt");

  const usage = (new TextDecoder()).decode(
    await Deno.run({
      cmd: ["deno", "run", "--quiet", "./mod.ts"],
      stderr: "piped",
      env: {
        "NO_COLOR": "NO_COLOR",
      },
    }).stderrOutput(),
  ).replace(/\n\n$/, "\n");

  const readme = `\
# [deno-stadia](https://deno.land/x/stadia)

An Unofficial CLI tool and Deno TypeScript library for interacting with your
Google Stadia account.

**⚠️ Until its 1.0 release, this tool is incomplete and unsupported. Features
may not be implemented, or may not function as described. Come back later. ⚠️**

To use this tool you'll need to install [Deno, a secure runtime for TypeScript
and JavaScript](https://deno.land/). On Linux, you may do so by running:

\`\`\`
$ curl -fsSL https://deno.land/x/install/install.sh | sh
\`\`\`

You may run the latest release of this tool directly from Deno's module hosting:

\`\`\`
$ deno run --allow-all "https://deno.land/x/stadia/mod.ts"
\`\`\`

You may install this tool as a local \`stadia\` command:

\`\`\`
$ sudo deno install --reload --allow-all --force --root "/usr/local" "https://deno.land/x/stadia/mod.ts"

$ stadia
\`\`\`

\`\`\`
${usage}
\`\`\`

## Disclaimer

deno-stadia is an unofficial fan project and is not affiliated with Google. The
name "Stadia" is a trademark of Google LLC, and is used here for informational
purposes, not to imply affiliation or endorsement.

## License

Copyright Jeremy Banks and
[contributors](https://github.com/jeremyBanks/deno-stadia/graphs/contributors).

Licensed under either of

 * [Apache License, Version 2.0](http://www.apache.org/licenses/LICENSE-2.0)
 * [MIT license](http://opensource.org/licenses/MIT)

at your option.

### Contribution

Unless you explicitly state otherwise, any contribution intentionally submitted
for inclusion in the work by you, as defined in the Apache-2.0 license, shall be
dual licensed as above, without any additional terms or conditions.
`;

  await Deno.writeTextFile("./README.md", readme);

  if (
    !await run("deno", "cache", "--lock-write", "--lock=lock.json", "./mod.ts")
  ) {
    console.log("failed to generate lock file");
    throw Deno.exit(1);
  }
};

/** Runs a command, logging any error, returning a boolean indicating success. */
const run = async (...cmd: string[]) => {
  console.info(cmd);

  let result;
  try {
    result = await Deno.run({ cmd }).status();
  } catch (error) {
    console.error(cmd, "failed with:", error);
    return false;
  }

  if (!result.success) {
    return false;
  } else {
    return true;
  }
};

/** Writes a Uint8Array to an importable JS file. */
const inlineBytes = async (
  path: string | URL,
  bytes: Uint8Array,
  type = "application/octet-stream",
) => {
  const originalBytes = bytes;
  const compressedAndUgly = originalBytes.length > 131_072;

  if (compressedAndUgly) {
    bytes = brotli.compress(
      originalBytes,
      undefined,
      9,
    );
  }

  const bytesPerLine = !compressedAndUgly ? 16 : (80 / 4);

  const lines = [];

  const hash = new Sha3d256().update(originalBytes).toString("hex");
  const size = originalBytes.length.toString().padStart(
    Math.ceil(originalBytes.length.toString().length / 3) * 3,
  ).replace(/...\B/g, "$&_").trim();

  if (!compressedAndUgly) {
    lines.push(`\
// @generated deno-fmt-ignore-file
export const
  size = ${size},
  type = ${JSON.stringify(type)},
  hash = ${JSON.stringify(hash)};
export default new Uint8Array
([/*****************************************************************************
*  OFFSET  *  0x0 0x1 0x2 0x3 0x4 0x5 0x6 0x7 0x8 0x9 0xA 0xB 0xC 0xD 0xE 0xF  *
********************************************************************************`);
  } else {
    lines.push(`\
// @generated deno-fmt-ignore-file
import { brotli } from "../../deps.ts";
export const
  size = ${size},
  type = ${JSON.stringify(type)},
  hash = ${JSON.stringify(hash)};
export default brotli.decompress(new Uint8Array([`);
  }
  for (let offset = 0; offset < bytes.length; offset += bytesPerLine) {
    const formattedOffset = `0x${
      offset.toString(16).toUpperCase().padStart(6, "0")
    }`;

    const encodedBytes = [...bytes.slice(offset, offset + bytesPerLine)].map(
      (b) => `${b.toString().padStart(3)},`,
    ).join("");

    if (!compressedAndUgly) {
      lines.push(`* ${formattedOffset} */ ${encodedBytes.padEnd(64)}/*`);
    } else {
      lines.push(encodedBytes);
    }
  }

  if (!compressedAndUgly) {
    lines.push(`\
********************************************************************************
*  OFFSET  *  0x0 0x1 0x2 0x3 0x4 0x5 0x6 0x7 0x8 0x9 0xA 0xB 0xC 0xD 0xE 0xF  *
****************************************************************************/]);`);
  } else {
    if (lines[lines.length - 1].length <= 76) {
      lines.push(lines.pop()!.padEnd(76) + `]));\n`);
    } else {
      lines.push(`]));\n`);
    }
  }
  await Deno.writeTextFile(path, lines.join("\n"));
};

await main();
