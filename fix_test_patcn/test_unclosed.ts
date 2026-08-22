import { marked } from 'marked';

async function test() {
  const MARKER_START = '\uE000';
  const md = `**іва**
**іва**
**іва**
**іва**

алдфіоваж ** лді${MARKER_START}воа жфідвлоа`;

  const html = await marked.parse(md, { breaks: true, gfm: true });
  console.log("PARSED HTML:\n", html);
  console.log("Marker index in html:", html.indexOf(MARKER_START));
}

test();
