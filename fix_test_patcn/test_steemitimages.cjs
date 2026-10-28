async function testWithAt() {
  const gifBase64 = 'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
  const imgBuffer = Buffer.from(gifBase64, 'base64');
  const blob = new Blob([imgBuffer], { type: 'image/gif' });
  const formData = new FormData();
  formData.append('file', blob, 'test.gif');

  const res = await fetch('https://steemitimages.com/@testuser/1f485414618a5fe8142dfe3db8eef211ec9ce2000f0ea544486ed490f11265852277de411d64e8c0929236b9558a8b39428eb9664b6125c7bfdb262d0edd9cdd8a', {
    method: 'POST',
    body: formData
  });

  console.log('Status with @username:', res.status, res.statusText);
  const text = await res.text();
  console.log('Response with @username:', text);
}

testWithAt();
