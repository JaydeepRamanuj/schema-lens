import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  docsSidebar: [
    {
      type: 'category',
      label: 'Getting Started',
      items: ['intro', 'getting-started'],
    },
    {
      type: 'category',
      label: 'MCP Server',
      items: ['mcp-server'],
    },
    {
      type: 'category',
      label: 'Agent Skills',
      items: ['skills'],
    },
    {
      type: 'category',
      label: 'CLI Reference',
      items: ['commands', 'configuration', 'output-formats'],
    },
    {
      type: 'category',
      label: 'Architecture',
      items: ['snapshot-freshness', 'schema-data-model'],
    }
  ],
};

export default sidebars;
