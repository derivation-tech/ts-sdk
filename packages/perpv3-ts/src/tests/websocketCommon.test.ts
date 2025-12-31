import { PublicWebsocketClient, type MarketListChangedData } from '../apis/websocket';

type EventHandler = (...args: unknown[]) => void;

class FakeWebSocket {
    readyState = 0;
    readonly sent: string[] = [];

    private readonly listeners = new Map<string, EventHandler[]>();

    addEventListener(event: string, handler: EventHandler): void {
        const existing = this.listeners.get(event) ?? [];
        existing.push(handler);
        this.listeners.set(event, existing);
    }

    send(data: string): void {
        this.sent.push(data);
    }

    close(): void {
        this.readyState = 3;
        this.emit('close', {});
    }

    open(): void {
        this.readyState = 1;
        this.emit('open');
    }

    message(data: string): void {
        this.emit('message', { data });
    }

    private emit(event: string, payload?: unknown): void {
        for (const handler of this.listeners.get(event) ?? []) {
            handler(payload);
        }
    }
}

describe('PublicWebsocketClient common subscription', () => {
    it('normalizes marketListChanged array data for common subscribers', () => {
        const sockets: FakeWebSocket[] = [];
        const commonHandler = jest.fn<void, [MarketListChangedData]>();
        const rawHandler = jest.fn<void, [Record<string, unknown>]>();

        const client = new PublicWebsocketClient({
            url: 'ws://localhost',
            pingIntervalMs: 0,
            autoReconnect: false,
            wsFactory: () => {
                const socket = new FakeWebSocket();
                sockets.push(socket);
                return socket;
            },
        });

        client.subscribeCommon({ chainId: 143, type: 'common' }, (payload) => {
            if ('data' in payload) {
                commonHandler(payload as MarketListChangedData);
            }
        });

        client.subscribeRaw(
            { chainId: 143, type: 'common' },
            (payload) => rawHandler(payload as Record<string, unknown>),
            'marketListChanged'
        );

        expect(sockets).toHaveLength(1);
        const socket = sockets[0];
        socket.open();

        socket.message(
            JSON.stringify({
                stream: 'marketListChanged',
                data: [{ instrumentAddr: '0x73ada1ea346cc3908f41cf67a040f0acd7808be0', expiry: 4294967295 }],
            })
        );

        expect(commonHandler).toHaveBeenCalledTimes(1);
        expect(commonHandler.mock.calls[0][0]).toEqual({
            chainId: 143,
            data: [{ instrumentAddr: '0x73ada1ea346cc3908f41cf67a040f0acd7808be0', expiry: 4294967295 }],
        });

        expect(rawHandler).toHaveBeenCalledTimes(1);
        expect(rawHandler.mock.calls[0][0]).toEqual({
            data: [{ instrumentAddr: '0x73ada1ea346cc3908f41cf67a040f0acd7808be0', expiry: 4294967295 }],
        });

        client.close();
    });
});

