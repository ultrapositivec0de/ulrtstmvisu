const { marked } = require('marked');

marked.use({ breaks: true, gfm: true });

const text = "- item 1\n- item 2\nLine below list";
console.log('--- TEST 1 ---');
console.log(marked.parse(text));

const text2 = "- item 1\n- item 2\n\nLine below list";
console.log('--- TEST 2 ---');
console.log(marked.parse(text2));
