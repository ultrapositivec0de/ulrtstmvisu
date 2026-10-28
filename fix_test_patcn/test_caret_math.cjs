// Test 1: Math simulation of lines and caretLineIndex
function testCaretIndex(startOffset, childNodes) {
  const lines = [[]];
  childNodes.forEach((child) => {
    if (child.type === 'br') {
      lines[lines.length - 1].push(child);
      lines.push([]);
    } else {
      lines[lines.length - 1].push(child);
    }
  });

  let caretLineIndex = -1;
  let count = 0;
  for (let i = 0; i < lines.length; i++) {
    count += lines[i].length;
    if (startOffset <= count) {
      caretLineIndex = i;
      break;
    }
  }
  return { linesCount: lines.length, linesLengths: lines.map(l => l.length), caretLineIndex };
}

// Case 1: <p>Text<br></p> -> cursor at offset 1 or 2
console.log('Case 1: offset 1 in [text, br]:', testCaretIndex(1, [{type: 'text'}, {type: 'br'}]));
console.log('Case 1: offset 2 in [text, br]:', testCaretIndex(2, [{type: 'text'}, {type: 'br'}]));

// Case 2: <p>Text<br><br></p> (blank line below text) -> cursor at offset 2 (after 1st br)
console.log('Case 2: offset 2 in [text, br, br]:', testCaretIndex(2, [{type: 'text'}, {type: 'br'}, {type: 'br'}]));
