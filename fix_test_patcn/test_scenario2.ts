import { marked } from 'marked';

async function testMultiple() {
  const MARKER_START = '\uE000';
  const md = `**іва**
**іва**
**іва**
**іва**

алдфіоваж ** лді${MARKER_START}воа жфідвлоа`;

  // Test marked with various settings
  const parsed = await marked.parse(md, { breaks: true, gfm: true });
  console.log("Parsed result:\n", parsed);
}

testMultiple();
