import { installGlobalErrorHandler } from './globalHandler';

describe('installGlobalErrorHandler', () => {
  type Handler = (error: Error, isFatal?: boolean) => void;
  const utils = (
    globalThis as unknown as {
      ErrorUtils: { getGlobalHandler(): Handler; setGlobalHandler(h: Handler): void };
    }
  ).ErrorUtils;
  let original: Handler;

  beforeEach(() => {
    original = utils.getGlobalHandler();
  });
  afterEach(() => utils.setGlobalHandler(original));

  it('reports uncaught errors and still runs the previous handler', () => {
    const previous = jest.fn();
    utils.setGlobalHandler(previous);
    const report = jest.fn();
    installGlobalErrorHandler(report);

    const error = new Error('uncaught');
    utils.getGlobalHandler()(error, true);
    expect(report).toHaveBeenCalledWith(error);
    expect(previous).toHaveBeenCalledWith(error, true);
  });

  it('keeps going when reporting itself throws', () => {
    const previous = jest.fn();
    utils.setGlobalHandler(previous);
    installGlobalErrorHandler(() => {
      throw new Error('log failed');
    });
    const error = new Error('uncaught');
    expect(() => utils.getGlobalHandler()(error, false)).not.toThrow();
    expect(previous).toHaveBeenCalled();
  });

  it('can be removed again', () => {
    const previous = jest.fn();
    utils.setGlobalHandler(previous);
    const uninstall = installGlobalErrorHandler(jest.fn());
    uninstall();
    expect(utils.getGlobalHandler()).toBe(previous);
  });
});
