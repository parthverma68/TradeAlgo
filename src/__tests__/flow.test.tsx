/**
 * End-to-end walk of the mock app: welcome → sign in → home → market detail →
 * buy. Proves the "works without a backend" claim, and catches runtime crashes
 * on screens the startup test never reaches.
 */
import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { Alert } from 'react-native';
import App from '@/App';
import { store } from '@/store';
import { loggedOut } from '@/store/authSlice';
import { liveCleared } from '@/store/liveSlice';
import { onboardingHydrated } from '@/store/settingsSlice';
import { portfolioReset } from '@/store/portfolioSlice';

type Tree = renderer.ReactTestRenderer;
type Instance = renderer.ReactTestInstance;

/**
 * Let the mock API's simulated latency and the resulting cache updates settle.
 * One pass fires the timer; the query's dispatch and re-render land on later
 * passes, so run a few.
 */
const settle = async (tree: Tree) => {
  for (let i = 0; i < 4; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    await act(async () => {
      jest.advanceTimersByTime(600);
      await Promise.resolve();
    });
  }
  return tree;
};

/**
 * Rendered strings only. The full JSON carries context providers that are
 * circular, so this walks children rather than serialising props.
 */
const collect = (node: unknown, out: string[] = []): string[] => {
  if (node == null) return out;
  if (typeof node === 'string') { out.push(node); return out; }
  if (Array.isArray(node)) { node.forEach(n => collect(n, out)); return out; }
  const children = (node as { children?: unknown }).children;
  if (children) collect(children, out);
  return out;
};

/** Joined without separators: adjacent <Text> children read as one phrase. */
const text = (tree: Tree) => collect(tree.toJSON()).join('');

const hasText = (node: Instance, value: string) =>
  node.findAll(
    n => typeof n.props?.children === 'string' && n.props.children.includes(value),
    { deep: true },
  ).length > 0;

/** Press the innermost pressable whose subtree contains `label`. */
const press = async (tree: Tree, label: string) => {
  const targets = tree.root.findAll(
    n => typeof n.props?.onPress === 'function' && hasText(n, label),
  );
  if (targets.length === 0) throw new Error(`No pressable containing "${label}"`);
  await act(async () => { targets[targets.length - 1].props.onPress(); });
  await settle(tree);
};

const pressLabelled = async (tree: Tree, accessibilityLabel: string | RegExp) => {
  const match = (v: unknown) =>
    typeof v === 'string' &&
    (typeof accessibilityLabel === 'string'
      ? v.includes(accessibilityLabel)
      : accessibilityLabel.test(v));

  const targets = tree.root.findAll(
    n => typeof n.props?.onPress === 'function' && match(n.props.accessibilityLabel),
  );
  if (targets.length === 0) {
    throw new Error(`No pressable labelled ${accessibilityLabel}. On screen: ${text(tree)}`);
  }
  await act(async () => { targets[0].props.onPress(); });
  await settle(tree);
};

const type = async (tree: Tree, placeholder: string, value: string) => {
  const input = tree.root.find(n => n.props?.placeholder === placeholder);
  await act(async () => { input.props.onChangeText(value); });
};

describe('mock app flow', () => {
  let alertSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

    // The store is a module singleton, so each scenario starts from scratch.
    store.dispatch(loggedOut());
    store.dispatch(liveCleared());
    store.dispatch(portfolioReset());
    store.dispatch(onboardingHydrated(false));
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('walks welcome → sign in → home → market → buy', async () => {
    let tree!: Tree;
    await act(async () => { tree = renderer.create(<App />); });
    await settle(tree);

    // 1. Welcome
    expect(text(tree)).toContain('Building Wealth');
    await press(tree, 'Continue');

    // 2. Login — any credentials work against the mock
    expect(text(tree)).toContain('Welcome back');
    await type(tree, 'you@example.com', 'demo@tradealgo.app');
    await type(tree, '••••••••', 'hunter2');
    await press(tree, 'Sign in');

    // 3. Home — portfolio total and the seeded stock list
    const home = text(tree);
    expect(home).toContain('Total Invest');
    // Seeded book: 60 META + 45 TWTR + 0.4 TSLA + cash. Live ticks may have
    // nudged it by a few dollars by now; the exact seed maths is pinned in
    // portfolioSlice.test.ts.
    expect(home).toMatch(/\$8,4\d\d\.\d\d/);
    expect(home).toContain('Stock Activates');
    expect(home).toContain('Facebook');
    expect(home).toContain('Tesla');

    // 4. Market detail for Tesla
    await pressLabelled(tree, /^Tesla,/);
    await settle(tree);
    const market = text(tree);
    expect(market).toContain('Tesla price');
    expect(market).toContain('Today Volume');
    expect(market).toContain('75.61M');
    expect(market).toContain('Your position');
    expect(market).toContain('Sell');
    // Seeded at 7154.45; the live tick may have moved it a couple of dollars.
    expect(market).toMatch(/71\d\d\.\d\d/);

    // 5. Buy one share through the order ticket
    await press(tree, 'Buy');
    expect(text(tree)).toContain('Estimated total');
    await press(tree, 'Confirm buy');

    const [title, body] = alertSpy.mock.calls[alertSpy.mock.calls.length - 1];
    expect(title).toBe('Bought 1 TSLA');
    expect(body).toMatch(/Filled at \$7,1\d\d\.\d\d/);

    act(() => { tree.unmount(); });
  });

  it('rejects a buy that exceeds buying power without placing it', async () => {
    let tree!: Tree;
    await act(async () => { tree = renderer.create(<App />); });
    await settle(tree);

    await press(tree, 'Continue');
    await type(tree, 'you@example.com', 'demo@tradealgo.app');
    await type(tree, '••••••••', 'hunter2');
    await press(tree, 'Sign in');
    await pressLabelled(tree, /^Tesla,/);
    await settle(tree);
    await press(tree, 'Buy');

    const input = tree.root.find(n => n.props?.accessibilityLabel === 'Quantity');
    await act(async () => { input.props.onChangeText('9999'); });
    await settle(tree);

    expect(text(tree)).toContain('Not enough buying power');

    // The confirm button is disabled, so no order is placed.
    const confirm = tree.root.findAll(
      n => typeof n.props?.onPress === 'function' && hasText(n, 'Confirm buy'),
    );
    expect(confirm[confirm.length - 1].props.disabled).toBe(true);

    act(() => { tree.unmount(); });
  });
});
