import { mkdirSync, writeFileSync } from 'node:fs';
import { splitReportFile } from '@midscene/core';
import express from 'express';
import { zipSync } from 'fflate';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { PlaygroundServer } from '../../src/server';

vi.mock('@midscene/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@midscene/core')>();
  return {
    ...actual,
    splitReportFile: vi.fn(),
  };
});

vi.mock('fflate', () => ({
  zipSync: vi.fn(() => new Uint8Array([1, 2, 3])),
}));

vi.mock('node:fs', async () => {
  const actual = await vi.importActual<typeof import('node:fs')>('node:fs');
  return {
    default: actual,
    ...actual,
  };
});

function createMockResponse() {
  return {
    statusCode: 200,
    headers: {} as Record<string, string>,
    body: undefined as unknown,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    setHeader(name: string, value: string) {
      this.headers[name] = value;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      return this;
    },
    send(payload: unknown) {
      this.body = payload;
      return this;
    },
  };
}

function getRouteHandler(
  server: PlaygroundServer,
  method: 'get' | 'post',
  route: string,
) {
  const calls = (server.app[method] as any).mock.calls as Array<
    [string, ...any[]]
  >;
  const routeCall = calls.find(
    ([registeredRoute]) => registeredRoute === route,
  );
  return routeCall?.at(-1);
}

describe('PlaygroundServer split report download', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(splitReportFile).mockImplementation(({ htmlPath, outputDir }) => {
      mkdirSync(outputDir, { recursive: true });
      writeFileSync(`${outputDir}/1.execution.json`, '{"test": true}', 'utf-8');
      return {
        executionJsonFiles: [`${outputDir}/1.execution.json`],
        screenshotFiles: [],
      };
    });
  });

  test('POST /report/split-zip returns a zip of split report files', async () => {
    const server = new PlaygroundServer({} as any);
    await server.launch(6110);

    const handler = getRouteHandler(server, 'post', '/report/split-zip');
    expect(handler).toBeTypeOf('function');

    const response = createMockResponse();
    await handler({ body: { reportHTML: '<html>report</html>' } }, response);

    expect(response.statusCode).toBe(200);
    expect(response.headers['Content-Type']).toBe('application/zip');
    expect(response.headers['Content-Disposition']).toBe(
      'attachment; filename="midscene_report_split.zip"',
    );
    expect(response.body).toBeInstanceOf(Buffer);
    expect((response.body as Buffer).length).toBeGreaterThan(0);
    expect(splitReportFile).toHaveBeenCalledWith(
      expect.objectContaining({
        outputDir: expect.stringContaining('split'),
      }),
    );
  });

  test('POST /report/split-zip uses a dedicated larger JSON body limit before the global parser', async () => {
    const server = new PlaygroundServer({} as any);
    await server.launch(6110);

    expect(express.json).toHaveBeenNthCalledWith(1, { limit: '200mb' });
    expect(express.json).toHaveBeenNthCalledWith(2, { limit: '50mb' });

    const postCalls = (server.app.post as any).mock.calls as Array<
      [string, ...any[]]
    >;
    const useCallsBeforeSplitRoute = (
      server.app.use as any
    ).mock.invocationCallOrder.filter(
      (order: number) =>
        order <
        (server.app.post as any).mock.invocationCallOrder[
          postCalls.findIndex(([route]) => route === '/report/split-zip')
        ],
    );
    expect(useCallsBeforeSplitRoute).toHaveLength(0);
  });

  test('POST /report/split-zip returns 400 when reportHTML is missing', async () => {
    const server = new PlaygroundServer({} as any);
    await server.launch(6110);

    const handler = getRouteHandler(server, 'post', '/report/split-zip');
    const response = createMockResponse();
    await handler({ body: {} }, response);

    expect(response.statusCode).toBe(400);
    expect(response.body).toMatchObject({
      error: 'reportHTML is required and must be a string',
    });
    expect(splitReportFile).not.toHaveBeenCalled();
  });

  test('POST /report/split-zip returns 500 when split generation fails', async () => {
    vi.mocked(splitReportFile).mockImplementation(() => {
      throw new Error('split failed');
    });

    const server = new PlaygroundServer({} as any);
    await server.launch(6110);

    const handler = getRouteHandler(server, 'post', '/report/split-zip');
    const response = createMockResponse();
    await handler({ body: { reportHTML: '<html>report</html>' } }, response);

    expect(response.statusCode).toBe(500);
    expect(response.body).toMatchObject({
      error: 'Failed to generate split report zip: split failed',
    });
  });
});
