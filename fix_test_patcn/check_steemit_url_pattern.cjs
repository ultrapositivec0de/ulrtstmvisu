// Check how steemitimages responses look or how URLs are constructed
const crypto = require('crypto');

// Steemit images upload endpoint:
// POST https://steemitimages.com/{username}/{signature}
// Payload: FormData with "file"
// Response format:
// {"url": "https://cdn.steemitimages.com/DQm.../filename.png"} 
// or {"url": "https://steemitimages.com/DQm.../filename.png"}
// Wait! Let's check what hash is used:
// Steemit images uses IPFS multihash (Base58 encoded sha2-256 with 0x12 0x20 prefix, e.g. "Qm..." or "DQm...")
// or sha1? Let's check existing URLs in the codebase or sample posts!
