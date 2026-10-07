import { instances } from '../test/posthogMock';
import {
  analyticsAvailable,
  captureException,
  configureAnalytics,
  setAnalyticsEnabled,
  track,
} from './analytics';

describe('analytics without a key (the shipped default)', () => {
  it('is unavailable, and everything is a silent no-op', () => {
    expect(analyticsAvailable()).toBe(false);
    expect(() => {
      setAnalyticsEnabled(true);
      track('meal_created');
      captureException(new Error('boom'));
      setAnalyticsEnabled(false);
    }).not.toThrow();
    // No client is ever created, so nothing can reach the network.
    expect(instances).toHaveLength(0);
  });
});

describe('analytics with a key', () => {
  beforeEach(() => configureAnalytics({ key: 'phc_test', host: 'https://us.i.posthog.com' }));

  it('is available but sends nothing until the user opts in', () => {
    expect(analyticsAvailable()).toBe(true);
    track('meal_created');
    expect(instances).toHaveLength(0);
  });

  it('opting in creates an anonymous client that captures events and errors', () => {
    setAnalyticsEnabled(true);
    expect(instances).toHaveLength(1);
    const [client] = instances;
    expect(client.apiKey).toBe('phc_test');
    expect(client.options).toMatchObject({
      host: 'https://us.i.posthog.com',
      personProfiles: 'never',
    });

    track('ingredient_added', { source: 'manual' });
    expect(client.capture).toHaveBeenCalledWith('ingredient_added', { source: 'manual' });
    const error = new Error('boom');
    captureException(error, { where: 'test' });
    expect(client.captureException).toHaveBeenCalledWith(error, { where: 'test' });
  });

  it('opting in twice does not create a second client', () => {
    setAnalyticsEnabled(true);
    setAnalyticsEnabled(true);
    expect(instances).toHaveLength(1);
  });

  it('opting out resets the client and stops capturing', () => {
    setAnalyticsEnabled(true);
    const [client] = instances;
    setAnalyticsEnabled(false);
    expect(client.optOut).toHaveBeenCalled();
    expect(client.reset).toHaveBeenCalled();
    track('meal_created');
    expect(client.capture).not.toHaveBeenCalled();
  });

  it('never surfaces a failure from the analytics client', () => {
    setAnalyticsEnabled(true);
    instances[0].capture.mockImplementation(() => {
      throw new Error('network down');
    });
    instances[0].captureException.mockImplementation(() => {
      throw new Error('network down');
    });
    expect(() => {
      track('meal_created');
      captureException(new Error('x'));
    }).not.toThrow();
  });
});
