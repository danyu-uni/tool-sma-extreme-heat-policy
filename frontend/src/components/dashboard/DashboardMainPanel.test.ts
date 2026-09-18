// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MantineProvider } from "@mantine/core";
import { createInstance } from "i18next";
import { I18nextProvider, initReactI18next } from "react-i18next";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DashboardMainPanel } from "@/components/dashboard/DashboardMainPanel";
import en from "@/i18n/locales/en/translation.json";
import zh from "@/i18n/locales/zh-CN/translation.json";

const addForm = vi.hoisted(() => ({ result: {} as Record<string, unknown> }));

vi.mock("@/hooks/useDashboardLocationAdd", () => ({
  useDashboardLocationAdd: () => addForm.result,
}));

let root: Root;
let host: HTMLDivElement;
let language: ReturnType<typeof createInstance>;

function setAddForm(overrides: Record<string, unknown> = {}) {
  addForm.result = {
    locationSearchInput: "",
    locationSuggestions: [],
    isSuggestLoading: false,
    isResolvingLocation: false,
    isShowingCommittedDraftLocation: false,
    canAddMoreCards: true,
    canSubmitAdd: true,
    addErrorReason: null,
    draftWeekdays: [],
    draftStartMinutes: null,
    draftEndMinutes: null,
    onDraftWeekdaysChange: vi.fn(),
    onDraftStartMinutesChange: vi.fn(),
    onDraftEndMinutesChange: vi.fn(),
    onLocationSearchInputChange: vi.fn(),
    onLocationOptionSubmit: vi.fn(),
    onAddCardClick: vi.fn(),
    ...overrides,
  };
}

beforeEach(async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addEventListener() {},
      removeEventListener() {},
      addListener() {},
      removeListener() {},
    })),
  );
  Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
    configurable: true,
    value: vi.fn(),
  });
  language = createInstance();
  await language.use(initReactI18next).init({
    initImmediate: false,
    lng: "en",
    fallbackLng: "en",
    resources: { en: { translation: en }, "zh-CN": { translation: zh } },
    interpolation: { escapeValue: false },
  });
  setAddForm();
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function render() {
  act(() =>
    root.render(
      createElement(
        I18nextProvider,
        { i18n: language },
        createElement(
          MantineProvider,
          {
            env: "test",
            forceColorScheme: "light",
            withCssVariables: false,
            withGlobalClasses: false,
          },
          createElement(DashboardMainPanel),
        ),
      ),
    ),
  );
}

function weekdayCheckbox(label: string): HTMLInputElement {
  const labelElement = Array.from(host.querySelectorAll("label")).find(
    (item) => item.textContent === label,
  );
  expect(labelElement, `Missing weekday ${label}`).toBeDefined();
  return document.getElementById(labelElement!.htmlFor) as HTMLInputElement;
}

function choose(fieldLabel: string, option: string) {
  const input = host.querySelector<HTMLInputElement>(
    `input[aria-label="${fieldLabel}"]`,
  );
  expect(input, `Missing field ${fieldLabel}`).not.toBeNull();
  act(() => input!.click());
  const listbox = document.getElementById(
    input!.getAttribute("aria-controls")!,
  )!;
  const item = Array.from(
    listbox.querySelectorAll<HTMLElement>('[role="option"]'),
  ).find((element) => element.textContent === option);
  expect(item, `Missing option ${option}`).toBeDefined();
  act(() => item!.click());
}

describe("dashboard add panel schedule fields", () => {
  it("shows every weekday from Sunday and both time fields", () => {
    render();

    const weekdays = host.querySelector('[role="group"][aria-label="Every"]');
    expect(
      Array.from(weekdays!.querySelectorAll("label")).map(
        (label) => label.textContent,
      ),
    ).toEqual(["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]);
    expect(host.querySelector('input[aria-label="Start time"]')).not.toBeNull();
    expect(host.querySelector('input[aria-label="End time"]')).not.toBeNull();
    expect(host.textContent).toContain(
      "Choose at least one day and a time range ending later that day or at midnight. All schedule fields are required.",
    );
  });

  it("passes the chosen weekdays in order", () => {
    const onDraftWeekdaysChange = vi.fn();
    setAddForm({ draftWeekdays: [4], onDraftWeekdaysChange });
    render();

    act(() => weekdayCheckbox("Tue").click());

    expect(onDraftWeekdaysChange).toHaveBeenCalledWith([2, 4]);
  });

  it("passes the chosen start time in minutes", () => {
    const onDraftStartMinutesChange = vi.fn();
    setAddForm({ onDraftStartMinutesChange });
    render();

    choose("Start time", "6:00 pm");

    expect(onDraftStartMinutesChange).toHaveBeenCalledWith(1080);
  });

  it("offers midnight as the last end time", () => {
    const onDraftEndMinutesChange = vi.fn();
    setAddForm({ onDraftEndMinutesChange });
    render();

    choose("End time", "Midnight (next day)");

    expect(onDraftEndMinutesChange).toHaveBeenCalledWith(1440);
  });

  it("disables the add button while the schedule is incomplete", () => {
    setAddForm({ draftWeekdays: [2], canSubmitAdd: false });
    render();

    const addButton = Array.from(host.querySelectorAll("button")).find(
      (button) => button.textContent === "Add to dashboard",
    );
    expect(addButton?.disabled).toBe(true);
  });

  it("labels weekdays and times in Chinese", () => {
    act(() => {
      void language.changeLanguage("zh-CN");
    });
    render();

    expect(weekdayCheckbox("周二")).not.toBeNull();
    choose("结束时间", "次日零点");
  });
});
