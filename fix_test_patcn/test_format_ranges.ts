import { getAllFormatRangesInLine } from '../src/utils/formatUtils';

const lineWithUrl = 'Check out [this link](https://steemit.com/test_post_title) for details.';
console.log('Format ranges in line with URL:');
console.log(getAllFormatRangesInLine(lineWithUrl));

const lineWithHtml = '<div class="phishy">This is *important* text</div>';
console.log('Format ranges in line with HTML:');
console.log(getAllFormatRangesInLine(lineWithHtml));
