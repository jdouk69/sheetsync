// Streaming, uncompressed ZIP32 archives. Files are handled one at a time;
// downloading never loads the entire receipt archive into Worker memory.
const enc = new TextEncoder();
const table = Uint32Array.from({length:256},(_,n)=>{for(let i=0;i<8;i++)n=n&1?0xedb88320^(n>>>1):n>>>1;return n>>>0;});
export function crcUpdate(crc,bytes){for(const byte of bytes)crc=table[(crc^byte)&255]^(crc>>>8);return crc>>>0;}
export function crc32(bytes){return (crcUpdate(0xffffffff,bytes)^0xffffffff)>>>0;}
function header(size){const bytes=new Uint8Array(size);return {bytes,v:new DataView(bytes.buffer)};}
async function* chunks(source){if(source instanceof Uint8Array){yield source;return;}const reader=source.getReader();try{while(true){const {done,value}=await reader.read();if(done)break;yield value;}}finally{reader.releaseLock();}}
export async function* zipEntries(entries){
 let offset=0;const directory=[];
 for(const entry of entries){
  const name=enc.encode(entry.name);if(name.length>65535||entry.size>0xffffffff)throw Error('Backup file is too large.');
  const start=offset;const h=header(30+name.length);h.v.setUint32(0,0x04034b50,true);h.v.setUint16(4,20,true);h.v.setUint16(6,0x808,true);h.v.setUint16(26,name.length,true);h.bytes.set(name,30);
  yield h.bytes;offset+=h.bytes.length;let size=0,crc=0xffffffff;
  for await(const bytes of chunks(await entry.open())){size+=bytes.length;crc=crcUpdate(crc,bytes);yield bytes;offset+=bytes.length;}
  if(size!==entry.size)throw Error('A backup file changed during download. Please try again.');
  crc=(crc^0xffffffff)>>>0;const d=header(16);d.v.setUint32(0,0x08074b50,true);d.v.setUint32(4,crc,true);d.v.setUint32(8,size,true);d.v.setUint32(12,size,true);yield d.bytes;offset+=16;
  const c=header(46+name.length);c.v.setUint32(0,0x02014b50,true);c.v.setUint16(4,20,true);c.v.setUint16(6,20,true);c.v.setUint16(8,0x808,true);c.v.setUint32(16,crc,true);c.v.setUint32(20,size,true);c.v.setUint32(24,size,true);c.v.setUint16(28,name.length,true);c.v.setUint32(42,start,true);c.bytes.set(name,46);directory.push(c.bytes);
 }
 const directoryStart=offset;for(const bytes of directory){yield bytes;offset+=bytes.length;}
 if(offset>0xffffffff||directory.length>65535)throw Error('Backup exceeds the ZIP limit.');
 const end=header(22);end.v.setUint32(0,0x06054b50,true);end.v.setUint16(8,directory.length,true);end.v.setUint16(10,directory.length,true);end.v.setUint32(12,offset-directoryStart,true);end.v.setUint32(16,directoryStart,true);yield end.bytes;
}
export function zipStream(entries){const iterator=zipEntries(entries);return new ReadableStream({async pull(controller){try{const result=await iterator.next();if(result.done)controller.close();else controller.enqueue(result.value);}catch(error){controller.error(error);}},async cancel(){await iterator.return();}});}

// Read the directory, then slice each stored file directly from the selected ZIP.
// No extraction to disk and no decompression of untrusted archives.
export async function readZipIndex(file){
 if(file.size<22||file.size>2*1024*1024*1024)throw Error('Use a SheetSync backup smaller than 2 GB.');
 const tail=new Uint8Array(await file.slice(Math.max(0,file.size-65557)).arrayBuffer());const view=new DataView(tail.buffer);let end=-1;
 for(let i=tail.length-22;i>=0;i--)if(view.getUint32(i,true)===0x06054b50&&i+22+view.getUint16(i+20,true)===tail.length){end=i;break;}
 if(end<0)throw Error('The backup ZIP is incomplete.');
 if(view.getUint16(end+4,true)||view.getUint16(end+6,true))throw Error('Multi-part backups are not supported.');
 const count=view.getUint16(end+10,true),size=view.getUint32(end+12,true),offset=view.getUint32(end+16,true);
 if(count>2003||size>2*1024*1024||offset+size>file.size-22)throw Error('Invalid backup directory.');
 const bytes=new Uint8Array(await file.slice(offset,offset+size).arrayBuffer());const v=new DataView(bytes.buffer);const entries=new Map();let p=0;
 for(let i=0;i<count;i++){
  if(p+46>bytes.length||v.getUint32(p,true)!==0x02014b50)throw Error('Invalid ZIP entry.');
  const flags=v.getUint16(p+8,true),method=v.getUint16(p+10,true),crc=v.getUint32(p+16,true),compressed=v.getUint32(p+20,true),length=v.getUint32(p+24,true),nl=v.getUint16(p+28,true),extra=v.getUint16(p+30,true),comment=v.getUint16(p+32,true),local=v.getUint32(p+42,true);
  const next=p+46+nl+extra+comment;if(next>bytes.length||method!==0||flags&1||compressed!==length||length>25*1024*1024)throw Error('Use an uncompressed ZIP created by SheetSync.');
  const name=new TextDecoder('utf-8',{fatal:true}).decode(bytes.slice(p+46,p+46+nl));
  if(!/^(backup\.json|expenses\.csv|README\.txt|files\/[0-9a-f-]{36})$/.test(name)||entries.has(name))throw Error('Unexpected or duplicate file in backup.');
  const lh=new DataView(await file.slice(local,local+30).arrayBuffer());if(lh.byteLength!==30||lh.getUint32(0,true)!==0x04034b50||lh.getUint16(8,true)!==0)throw Error('Invalid file header.');
  const localNameLength=lh.getUint16(26,true);const localName=new TextDecoder().decode(await file.slice(local+30,local+30+localNameLength).arrayBuffer());if(localName!==name)throw Error('Backup file names do not match.');
  const start=local+30+localNameLength+lh.getUint16(28,true);if(start+length>offset)throw Error('Invalid backup file size.');
  entries.set(name,{name,size:length,crc,blob:file.slice(start,start+length)});p=next;
 }
 if(p!==bytes.length)throw Error('Invalid backup directory length.');return entries;
}
export async function sha256(bytes){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map(x=>x.toString(16).padStart(2,'0')).join('');}
