/**
 * encrypt.js  —  run with Node.js to bake encrypted poems into index.html
 *
 * Usage:
 *   node encrypt.js
 *   → prompts for a password
 *   → reads all .txt files from ./poems/
 *   → writes encrypted payload into index.html
 *
 * Poem file format  (poems/01-title.txt):
 *   First line  = poem title
 *   Blank line  = separates title from body
 *   Rest        = poem lines  (blank line between stanzas)
 *
 * Security:
 *   AES-GCM 256-bit, key derived via PBKDF2 (200 000 iterations, SHA-256)
 *   Random salt + IV per encryption run
 *   Ciphertext is base64 in index.html — unreadable without the password
 */

const crypto  = require('crypto');
const fs      = require('fs');
const path    = require('path');
const readline = require('readline');

const POEMS_DIR  = path.join(__dirname, 'poems');
const INDEX_FILE = path.join(__dirname, 'index.html');
const ITERATIONS = 200000;

/* ── ask for password in terminal ── */
function askPassword(){
  return new Promise(function(resolve){
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    // hide input
    const stdin = process.openStdin();
    process.stdout.write('Password: ');
    process.stdin.setRawMode(true);
    let pw = '';
    process.stdin.resume();
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', function(ch){
      ch = ch + '';
      if(ch === '\n' || ch === '\r' || ch === '\u0004'){
        process.stdin.setRawMode(false);
        process.stdout.write('\n');
        rl.close();
        resolve(pw);
      } else if(ch === '\u0003'){
        process.exit();
      } else if(ch === '\u007f'){
        pw = pw.slice(0,-1);
      } else {
        pw += ch;
      }
    });
  });
}

/* ── parse a poem txt file ── */
function parsePoemFile(filepath){
  const raw   = fs.readFileSync(filepath, 'utf8').replace(/\r\n/g,'\n').replace(/\r/g,'\n');
  const lines = raw.split('\n');
  const title = lines[0].trim();
  // body starts after first blank line
  let bodyStart = 1;
  while(bodyStart < lines.length && lines[bodyStart].trim() === '') bodyStart++;
  const body  = lines.slice(bodyStart);
  // remove trailing blanks
  while(body.length && body[body.length-1].trim()==='') body.pop();
  return { title, lines: body };
}

/* ── encrypt ── */
async function encrypt(plaintext, password){
  const salt = crypto.randomBytes(16);
  const iv   = crypto.randomBytes(12);

  const keyMaterial = await crypto.webcrypto.subtle.importKey(
    'raw', Buffer.from(password, 'utf8'), 'PBKDF2', false, ['deriveKey']
  );
  const key = await crypto.webcrypto.subtle.deriveKey(
    { name:'PBKDF2', salt, iterations: ITERATIONS, hash:'SHA-256' },
    keyMaterial,
    { name:'AES-GCM', length:256 },
    false, ['encrypt']
  );
  const ct = await crypto.webcrypto.subtle.encrypt(
    { name:'AES-GCM', iv },
    key,
    Buffer.from(plaintext, 'utf8')
  );

  // pack: salt(16) + iv(12) + ciphertext
  const packed = Buffer.concat([salt, iv, Buffer.from(ct)]);
  return packed.toString('base64');
}

/* ── main ── */
(async function(){
  // read poems
  const files = fs.readdirSync(POEMS_DIR)
    .filter(f => f.endsWith('.txt'))
    .sort();

  if(files.length === 0){
    console.error('No .txt files found in ./poems/');
    process.exit(1);
  }

  const poems = files.map(f => parsePoemFile(path.join(POEMS_DIR, f)));
  console.log('Found '+poems.length+' poem(s): '+poems.map(p=>p.title).join(', '));

  const password = await askPassword();
  if(!password){ console.error('Password cannot be empty.'); process.exit(1); }

  const plaintext  = JSON.stringify(poems);
  const ciphertext = await encrypt(plaintext, password);

  // inject into index.html
  let html = fs.readFileSync(INDEX_FILE, 'utf8');
  const marker = /\/\* ✦ENCRYPTED_POEMS✦ \*\/[\s\S]*?\/\* ✦END✦ \*\//;
  const replacement = '/* ✦ENCRYPTED_POEMS✦ */\n  var ENCRYPTED = "'+ciphertext+'";\n  /* ✦END✦ */';

  if(!marker.test(html)){
    console.error('Marker not found in index.html — make sure you are using the correct index.html.');
    process.exit(1);
  }

  html = html.replace(marker, replacement);
  fs.writeFileSync(INDEX_FILE, html);
  console.log('✓ Encrypted '+poems.length+' poem(s) into index.html with your password.');
  console.log('  Share index.html freely — nobody can read the poems without the password.');
})();
