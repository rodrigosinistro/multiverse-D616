"""Small, dependency-free reader/writer for *new or unpacked* Foundry LevelDB logs.
Does not edit existing packs. The writer emits a fresh LevelDB WAL and copies
its minimal, verified comparator descriptor from a bundled, unmodified pack.
Only used OFFLINE for build/audit tasks; never imported by Foundry.
"""
from pathlib import Path
from struct import pack, unpack_from
import json

BLOCK=32768

def varint(num):
    result=bytearray()
    while num>=128:
        result.append((num&127)|128);num>>=7
    result.append(num)
    return bytes(result)

def read_varint(data,pos):
    value=0;shift=0
    while pos<len(data):
        b=data[pos];pos+=1;value|=(b&127)<<shift
        if not b&128:return value,pos
        shift+=7
    raise ValueError('truncated varint')

CRC_TABLE=[]
for i in range(256):
    crc=i
    for _ in range(8):crc=(crc>>1)^(0x82f63b78 if crc&1 else 0)
    CRC_TABLE.append(crc)

def crc32c(data):
    crc=0xffffffff
    for byte in data:crc=CRC_TABLE[(crc^byte)&255]^(crc>>8)
    return (crc^0xffffffff)&0xffffffff

def masked_crc(data):
    crc=crc32c(data)
    return (((crc>>15)|(crc<<17))+0xa282ead8)&0xffffffff

def log_fragments(path):
    content=Path(path).read_bytes();pending=b''
    for start in range(0,len(content),BLOCK):
        block=content[start:start+BLOCK];pos=0
        while pos+7<=len(block):
            crc,size,kind=unpack_from('<IHB',block,pos);pos+=7
            if kind==0:break
            if size>len(block)-pos:raise ValueError('fragment crosses block')
            fragment=block[pos:pos+size];pos+=size
            if masked_crc(bytes([kind])+fragment)!=crc:raise ValueError('CRC32C mismatch in '+str(path))
            if kind==1:yield fragment
            elif kind==2:pending=fragment
            elif kind==3:pending+=fragment
            elif kind==4:yield pending+fragment;pending=b''
            else:raise ValueError('unknown record type')
    if pending:raise ValueError('incomplete WAL record')

def read_entries(path):
    values={}
    for batch in log_fragments(path):
        sequence,count=unpack_from('<QI',batch,0);pos=12
        for _ in range(count):
            action=batch[pos];pos+=1
            length,pos=read_varint(batch,pos);key=batch[pos:pos+length].decode();pos+=length
            if action==0:values.pop(key,None)
            elif action==1:
                length,pos=read_varint(batch,pos);value=batch[pos:pos+length];pos+=length
                values[key]=json.loads(value)
            else:raise ValueError('unknown WriteBatch action')
        if pos!=len(batch):raise ValueError('trailing batch bytes')
    return values

def make_batch(entries):
    data=bytearray(pack('<QI',1,len(entries)))
    for key,object_value in entries:
        key=key.encode('utf-8')
        value=json.dumps(object_value,ensure_ascii=False,separators=(',',':')).encode('utf-8')
        data.append(1)
        data+=varint(len(key))+key+varint(len(value))+value
    return bytes(data)

def write_log(path, batches):
    path=Path(path);buffer=bytearray();block_used=0
    for batch in batches:
        remaining=memoryview(batch);first=True
        while len(remaining):
            available=BLOCK-block_used
            if available<7:
                buffer+=bytes(available);block_used=0;available=BLOCK
            fragment=bytes(remaining[:available-7]);remaining=remaining[len(fragment):]
            kind=1 if first and not len(remaining) else 2 if first else 4 if not len(remaining) else 3
            buffer+=pack('<IHB',masked_crc(bytes([kind])+fragment),len(fragment),kind)+fragment
            block_used+=7+len(fragment)
            if block_used==BLOCK:block_used=0
            first=False
    path.write_bytes(buffer)
