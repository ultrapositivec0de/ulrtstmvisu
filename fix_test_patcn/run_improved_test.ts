import { getAllFormatRangesInLine } from './test_improved_ranges';

console.log('--- Test 1: URL with underscores ---');
const line1 = 'Check [this link](https://steemit.com/test_post_title) for *real* details.';
console.log(getAllFormatRangesInLine(line1));

console.log('\n--- Test 2: HTML tag with attributes and class ---');
const line2 = '<div class="phishy_class_test">This is **bold** and _italic_ text</div>';
console.log(getAllFormatRangesInLine(line2));

console.log('\n--- Test 3: Inline code with asterisks ---');
const line3 = 'Code `a * b = c` and *italic* text';
console.log(getAllFormatRangesInLine(line3));
