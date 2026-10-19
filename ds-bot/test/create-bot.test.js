import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createPayload, freshBotName, startModel } from '../src/client/bot-draft.js'

const models = [
  { ref: 'ollama/ds-flash', name: 'DS Flash', providerName: 'Ollama' },
  { ref: 'cloud/qwen-max', name: 'Qwen Max', providerName: 'Cloud' },
]

test('the form starts on the DSH default model, else the first served one', () => {
  assert.equal(startModel({ models, defaultModel: 'cloud/qwen-max' }), 'cloud/qwen-max')
  assert.equal(startModel({ models, defaultModel: 'gone/model' }), 'ollama/ds-flash')
  assert.equal(startModel({ models, defaultModel: null }), 'ollama/ds-flash')
  assert.equal(startModel({ models: [], defaultModel: 'cloud/qwen-max' }), '')
})

test('the payload carries the look, the chosen model, and the brief', () => {
  const look = { shape: 'star', color: 'blue' }
  assert.deepEqual(createPayload({ name: 'A', look, model: 'cloud/qwen-max' }), { name: 'A', color: 'blue', avatar: { shape: 'star' }, model: 'cloud/qwen-max' })
  assert.deepEqual(createPayload({ name: 'A', look, model: '', brief: 'hi', image: 'data:image/png;base64,AA' }),
    { name: 'A', color: 'blue', avatar: { shape: 'star', image: 'data:image/png;base64,AA' }, brief: 'hi' })
})

test('the suggested name skips taken names', () => {
  const roster = { bots: [{ name: 'New Bot' }, { name: 'Kimi' }] }
  assert.equal(freshBotName(roster), 'New Bot 2')
  assert.equal(freshBotName(roster, 'Kimi'), 'Kimi 2')
  assert.equal(freshBotName(roster, 'Writer'), 'Writer')
})

test('the selected expression is stored alongside the shape and survives a photo choice', () => {
  const look = { shape: 'soft-square', color: '#69C7B7', face: 'curious' }
  assert.deepEqual(createPayload({ name: 'A', look, image: 'data:image/png;base64,AA' }).avatar,
    { shape: 'soft-square', face: 'curious', image: 'data:image/png;base64,AA' })
})
