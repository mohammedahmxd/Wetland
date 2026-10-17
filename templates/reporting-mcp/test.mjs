import test from 'node:test';import assert from 'node:assert/strict';
import {calculate,validateDraft} from './capability.mjs';import {readPackage} from '@wetland/mcp-runtime';
test('Completed records are counted once; pending records excluded',()=>{assert.equal(calculate([{id:'a',status:'complete'},{id:'a',status:'complete'},{id:'b',status:'pending'}],4).attainmentPercent,25);assert.throws(()=>calculate([{id:'a',status:'unknown'}],4));});
test('Package configuration is valid',async()=>{validateDraft(await readPackage(new URL('./',import.meta.url)));});
