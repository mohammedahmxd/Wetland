import test from 'node:test';import assert from 'node:assert/strict';
import {validateDraft,createServer} from './capability.mjs';import {readPackage} from '@wetland/mcp-runtime';
test('Guidance and configuration are present and valid',async()=>{const p=validateDraft(await readPackage(new URL('./',import.meta.url)));assert.ok(p.guidance.trim());assert.throws(()=>validateDraft({...p,config:{heading:''}}));const s=await createServer();await s.close();});
