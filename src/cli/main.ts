import { Command } from "commander";

const program = new Command();

program
  .name("agents")
  .description("Agent tooling for the agents repository")
  .version("0.1.0");

program.parseAsync(process.argv).catch((error: unknown) => {
  if (error instanceof Error) {
    console.error(`error: ${error.message}`);
  } else {
    console.error(`error: ${String(error)}`);
  }
  process.exit(1);
});
