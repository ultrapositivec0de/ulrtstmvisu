import { isOffsetInTechnicalZone } from './test_syntax_zones';

const tableMd = `Here is text before

| Header 1 | Header 2 |
| --- | --- |
| Cell 1 | Cell 2 |

Here is text after`;

console.log('Testing table separator offset detection:');
const sepOffset = tableMd.indexOf('| --- |') + 2;
console.log('sepOffset:', sepOffset, isOffsetInTechnicalZone(tableMd, sepOffset));

const cellOffset = tableMd.indexOf('Cell 1') + 2;
console.log('cellOffset:', cellOffset, isOffsetInTechnicalZone(tableMd, cellOffset));

const htmlMd = `<div class="phishy">
Some text
</div>`;

const htmlTagOffset = htmlMd.indexOf('class=') + 2;
console.log('htmlTagOffset:', htmlTagOffset, isOffsetInTechnicalZone(htmlMd, htmlTagOffset));
const htmlTextOffset = htmlMd.indexOf('Some');
console.log('htmlTextOffset:', htmlTextOffset, isOffsetInTechnicalZone(htmlMd, htmlTextOffset));
