export interface McpTemplate {
  id: string;
  label: string;
  labelEn: string;
  type: "stdio" | "sse" | "http";
  command?: string;
  args: string[];
  env: Record<string, string>;
  url?: string;
  headers: Record<string, string>;
  description: string;
  descriptionEn: string;
}

export const MCP_TEMPLATES: McpTemplate[] = [
  {
    id: "filesystem",
    label: "Filesystem",
    labelEn: "Filesystem",
    type: "stdio",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/allowed/dir"],
    env: {},
    headers: {},
    description: "文件系统读写操作（需替换目录路径）",
    descriptionEn: "Filesystem read/write (replace directory path)",
  },
  {
    id: "github",
    label: "GitHub",
    labelEn: "GitHub",
    type: "stdio",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-github"],
    env: { GITHUB_PERSONAL_ACCESS_TOKEN: "" },
    headers: {},
    description: "GitHub 仓库操作、Issues、PR 管理",
    descriptionEn: "GitHub repository, issues, PR management",
  },
  {
    id: "postgres",
    label: "PostgreSQL",
    labelEn: "PostgreSQL",
    type: "stdio",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-postgres"],
    env: { DATABASE_URL: "" },
    headers: {},
    description: "PostgreSQL 数据库查询与管理",
    descriptionEn: "PostgreSQL database query and management",
  },
  {
    id: "slack",
    label: "Slack",
    labelEn: "Slack",
    type: "stdio",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-slack"],
    env: { SLACK_BOT_TOKEN: "" },
    headers: {},
    description: "Slack 消息发送与频道管理",
    descriptionEn: "Slack message and channel management",
  },
  {
    id: "brave-search",
    label: "Brave Search",
    labelEn: "Brave Search",
    type: "stdio",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-brave-search"],
    env: { BRAVE_API_KEY: "" },
    headers: {},
    description: "Brave 搜索引擎集成",
    descriptionEn: "Brave search engine integration",
  },
  {
    id: "memory",
    label: "Memory",
    labelEn: "Memory",
    type: "stdio",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-memory"],
    env: {},
    headers: {},
    description: "知识图谱记忆系统",
    descriptionEn: "Knowledge graph memory system",
  },
  {
    id: "puppeteer",
    label: "Puppeteer",
    labelEn: "Puppeteer",
    type: "stdio",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-puppeteer"],
    env: {},
    headers: {},
    description: "浏览器自动化与网页抓取",
    descriptionEn: "Browser automation and web scraping",
  },
  {
    id: "fetch",
    label: "Fetch",
    labelEn: "Fetch",
    type: "stdio",
    command: "uvx",
    args: ["mcp-server-fetch"],
    env: {},
    headers: {},
    description: "网页内容抓取与解析",
    descriptionEn: "Web content fetching and parsing",
  },
  {
    id: "custom-stdio",
    label: "自定义 stdio",
    labelEn: "Custom stdio",
    type: "stdio",
    command: "",
    args: [],
    env: {},
    headers: {},
    description: "",
    descriptionEn: "",
  },
  {
    id: "custom-sse",
    label: "自定义 SSE",
    labelEn: "Custom SSE",
    type: "sse",
    url: "http://localhost:8000/sse",
    headers: {},
    args: [],
    env: {},
    description: "",
    descriptionEn: "",
  },
  {
    id: "custom-http",
    label: "自定义 HTTP",
    labelEn: "Custom HTTP",
    type: "http",
    url: "https://api.example.com/mcp",
    headers: {},
    args: [],
    env: {},
    description: "",
    descriptionEn: "",
  },
];

export function getMcpTemplateById(id: string): McpTemplate | undefined {
  return MCP_TEMPLATES.find((t) => t.id === id);
}
