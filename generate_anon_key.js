// Generate the correct anon key based on the service key pattern
function base64URLEncode(str) {
  return Buffer.from(str)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

// JWT Header (same as service key)
const header = {
  "alg": "HS256",
  "typ": "JWT"
};

// JWT Payload - change role to "anon"
const payload = {
  "iss": "supabase",
  "ref": "kwebsccgtmntljdrzwet",
  "role": "anon",  // This is the key difference
  "iat": 1757088878,
  "exp": 2072664878
};

const headerEncoded = base64URLEncode(JSON.stringify(header));
const payloadEncoded = base64URLEncode(JSON.stringify(payload));

console.log('Header:', JSON.stringify(header, null, 2));
console.log('Payload:', JSON.stringify(payload, null, 2));
console.log('\nEncoded Header:', headerEncoded);
console.log('Encoded Payload:', payloadEncoded);
console.log('\nPotential ANON_KEY (without signature):');
console.log(`${headerEncoded}.${payloadEncoded}.SIGNATURE_NEEDED`);
