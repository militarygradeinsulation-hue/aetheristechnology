import { defineMcp } from "@lovable.dev/mcp-js";
import echoTool from "./tools/echo";

export default defineMcp({
  name: "aetheris-mcp",
  title: "Aetheris / Business Forensics MCP",
  version: "0.1.0",
  instructions:
    "Agent integrations for the Aetheris / Business Forensics app. Use `echo` to verify connectivity. More tools will be exposed as they are enabled.",
  tools: [echoTool],
});
