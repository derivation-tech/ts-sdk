import crypto from 'node:crypto';
import { buildMessage, getHeaders } from '../utils/mm';

describe('getHeaders', () => {
    it('signs GET request paths with sorted query params', async () => {
        const timestamp = '2020-12-08T09:08:57.715Z';
        const apiKey = 'test-api-key';
        const passphrase = 'test-passphrase';
        const secretKey = 'test-secret';
        const requestPath = '/v4/public/market/instrument?b=2&a=1';

        const message = buildMessage(timestamp, 'GET', requestPath);
        const expectedSignature = crypto.createHmac('sha256', secretKey).update(message, 'utf8').digest('base64');

        const headers = await getHeaders({
            method: 'GET',
            requestPath,
            apiKey,
            passphrase,
            secretKey,
            timestamp,
        });

        expect(headers['X-ACCESS-SIGN']).toBe(expectedSignature);
        expect(headers['X-ACCESS-TIMESTAMP']).toBe(timestamp);
        expect(headers['X-ACCESS-KEY']).toBe(apiKey);
        expect(headers['X-ACCESS-PASSPHRASE']).toBe(passphrase);
    });

    it('signs JSON bodies with sorted keys for POST', async () => {
        const timestamp = '2020-12-08T09:08:57.715Z';
        const apiKey = 'test-api-key';
        const passphrase = 'test-passphrase';
        const secretKey = 'test-secret';
        const requestPath = '/v4/private/some-endpoint';
        const body = JSON.stringify({ b: 2, a: 1 });
        const contentType = 'application/json';

        const message = buildMessage(timestamp, 'post', requestPath, body, contentType);
        const expectedSignature = crypto.createHmac('sha256', secretKey).update(message, 'utf8').digest('base64');

        const headers = await getHeaders({
            method: 'post',
            requestPath,
            body,
            contentType,
            apiKey,
            passphrase,
            secretKey,
            timestamp,
        });

        expect(headers['X-ACCESS-SIGN']).toBe(expectedSignature);
        expect(headers['X-ACCESS-TIMESTAMP']).toBe(timestamp);
        expect(headers['Content-Type']).toBe(contentType);
    });
});
