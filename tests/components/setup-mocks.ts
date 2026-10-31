import { vi } from "vitest";

vi.mock("next/navigation", () => {
  const useSearchParamsMock = vi.fn(() => ({
    toString: () => new URLSearchParams().toString(),
    get: () => null,
    getAll: () => [],
    has: () => false,
    keys: () => [],
    values: () => [],
    entries: () => [],
    append: vi.fn(),
    delete: vi.fn(),
    set: vi.fn(),
    sort: vi.fn(),
  }));
  const useRouterMock = vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
  }));
  return {
    useSearchParams: useSearchParamsMock,
    useRouter: useRouterMock,
    usePathname: vi.fn(() => "/"),
  };
});

vi.mock("next/image", () => ({
  Image: (props: unknown) => null,
}));

vi.mock("next/server", () => ({}));
