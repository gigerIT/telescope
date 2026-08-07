import assert from 'node:assert/strict';
import test from 'node:test';
import requestMarkdown from '../../resources/js/screens/requests/markdown.js';

const entry = (content = {}) => ({
    created_at: '2026-08-07 10:15:30',
    content: {
        method: 'POST',
        uri: '/orders?source=telescope',
        response_status: 201,
        ...content,
    },
});

test('it formats request details and related context', () => {
    const markdown = requestMarkdown(entry({
        duration: 24,
        controller_action: 'App\\Http\\Controllers\\OrderController@store',
        middleware: ['api', 'auth:sanctum'],
        user: {id: 7, name: 'Taylor', email: 'taylor@example.com'},
        headers: {'content-type': 'application/json'},
        payload: {product_id: 42, options: ['gift-wrap']},
        session: {locale: 'en'},
        response_headers: {'content-type': 'application/json'},
        response: {id: 123, status: 'created'},
    }), [
        {type: 'exception', content: {class: 'RuntimeException', message: 'Order failed', file: '/app/Order.php', line: 42}},
        {type: 'query', content: {connection: 'mysql', sql: 'select * from `orders`', time: '1.25'}},
        {type: 'log', content: {level: 'warning', message: 'Stock is low', context: {product_id: 42}}},
        {type: 'model', content: {action: 'updated', model: 'App\\Models\\Order:123', changes: {status: 'created'}}},
    ]);

    assert.match(markdown, /^# Request Details/);
    assert.match(markdown, /\| Method \| POST \|/);
    assert.match(markdown, /\| URI \| \/orders\?source=telescope \|/);
    assert.match(markdown, /\| Controller \| App\\Http\\Controllers\\OrderController@store \|/);
    assert.match(markdown, /\| User \| Taylor \(taylor@example\.com, ID: 7\) \|/);
    assert.match(markdown, /## Request Headers[\s\S]*\| content-type \| application\/json \|/);
    assert.match(markdown, /## Request Payload[\s\S]*"options": \[\n    "gift-wrap"\n  \]/);
    assert.match(markdown, /## Session[\s\S]*"locale": "en"/);
    assert.match(markdown, /## Response Headers[\s\S]*\| content-type \| application\/json \|/);
    assert.match(markdown, /## Response[\s\S]*"status": "created"/);
    assert.match(markdown, /## Exceptions \(1\)[\s\S]*RuntimeException[\s\S]*Order failed[\s\S]*\/app\/Order\.php:42/);
    assert.match(markdown, /## Queries \(1\)[\s\S]*mysql, 1\.25ms[\s\S]*select \* from `orders`/);
    assert.match(markdown, /## Logs \(1\)[\s\S]*WARNING[\s\S]*Stock is low[\s\S]*"product_id": 42/);
    assert.match(markdown, /## Model Events \(1\)[\s\S]*updated App\\Models\\Order:123[\s\S]*"status": "created"/);
});

test('it omits empty optional sections and formats string values as text', () => {
    const markdown = requestMarkdown(entry({
        duration: 0,
        headers: {},
        payload: 'plain request body',
        session: [],
        response_headers: null,
        response: 'Empty Response',
        user: {id: 7, email: 'taylor@example.com'},
    }), []);

    assert.match(markdown, /\| Duration \| 0ms \|/);
    assert.match(markdown, /## Request Payload\n\n```text\nplain request body\n```/);
    assert.match(markdown, /## Response\n\n```text\nEmpty Response\n```/);
    assert.match(markdown, /\| User \| taylor@example\.com \(ID: 7\) \|/);
    assert.doesNotMatch(markdown, /## Request Headers/);
    assert.doesNotMatch(markdown, /## Session/);
    assert.doesNotMatch(markdown, /## Response Headers/);
    assert.doesNotMatch(markdown, /## Queries/);
});

test('it copies Telescope redactions without exposing hidden values', () => {
    const markdown = requestMarkdown(entry({
        headers: {authorization: '********'},
        payload: {password: '********'},
        session: {password_confirmation: '********'},
        response: {token: '********'},
    }), []);

    assert.equal(markdown.match(/\*{8}/g).length, 4);
    assert.doesNotMatch(markdown, /secret|bearer|unredacted/i);
});
