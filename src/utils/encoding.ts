/**
 * DemoBlaze's front end Base64-encodes the UTF-8 password before sending it
 * (b64EncodeUnicode in index.js). The API client must do the same.
 */
export function encodePassword(password: string): string {
  return Buffer.from(password, 'utf8').toString('base64');
}

export function decodeBase64(value: string): string {
  return Buffer.from(value, 'base64').toString('utf8');
}
