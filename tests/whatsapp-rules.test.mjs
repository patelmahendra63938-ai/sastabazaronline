import test from 'node:test';
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {validWebhookSignature,replyWindowOpen,incomingText} from '../lib/whatsapp-rules.ts';
test('webhook verifies exact signed bytes and rejects tampering or malformed signature',()=>{const raw='{"message":"Hi"}',secret='test-secret';const sig='sha256='+createHmac('sha256',secret).update(raw).digest('hex');assert.equal(validWebhookSignature(raw,sig,secret),true);assert.equal(validWebhookSignature(raw+' ',sig,secret),false);assert.equal(validWebhookSignature(raw,'sha256=invalid',secret),false);assert.equal(validWebhookSignature(raw,null,secret),false);});
test('reply window enforces exact 24-hour boundary and rejects future/invalid timestamps',()=>{const now=Date.parse('2026-10-10T06:00:00Z');assert.equal(replyWindowOpen(new Date(now-86399999).toISOString(),now),true);assert.equal(replyWindowOpen(new Date(now-86400000).toISOString(),now),false);assert.equal(replyWindowOpen(new Date(now+1000).toISOString(),now),false);assert.equal(replyWindowOpen(null,now),false);});
test('non-text messages remain visible as caption or type placeholder',()=>{assert.equal(incomingText({type:'text',text:{body:'નમસ્તે'}}),'નમસ્તે');assert.equal(incomingText({type:'image',image:{caption:'Wine set'}}),'Wine set');assert.match(incomingText({type:'audio'}),/audio message/);});
