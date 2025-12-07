import { createServerApiHelpers, getServerApi, logInfo } from './utils';

// poll rate for the sensor
// smooth time

let steamRegistration: any;
let enableAdaptiveBrightness = false;

export const sensitivityInfo = {
  range: [25, 100],
  step: 25
};

export const pollInfo = {
  range: [100, 500],
  step: 50
};

export const smoothTimeInfo = {
  range: [100, 1000],
  step: 50
};

export const DEFAULT_POLLING_RATE = 100;
export const DEFAULT_SMOOTH_TIME = 500;
export const DEFAULT_SENSITIVITY = 50;

// Get the live ALS readout from the backend
export const getLiveAls = async (): Promise<number | null> => {
  const serverAPI = getServerApi();
  if (!serverAPI) return null;
  const { result } = await serverAPI.callPluginMethod("read_als", {});
  if (typeof result === "number") return result;
  return null;
};

// Get the brightness threshold mapping from the backend
export const getBrightnessMap = async (): Promise<[number, number][] | null> => {
  const serverAPI = getServerApi();
  if (!serverAPI) return null;
  const { result } = await serverAPI.callPluginMethod("get_brightness_map", {});
  if (Array.isArray(result)) return result;
  return null;
};

let pollingRate = DEFAULT_POLLING_RATE; // Time in milliseconds
let smoothTime = DEFAULT_SMOOTH_TIME; // Time in milliseconds
const stepCount = 10; // Less steps = smoother transition

let previousAlsValues = Array(DEFAULT_SENSITIVITY).fill(-1); // Increase length to increase read times (less sensitive to changes)
let currentBrightness = 50;

const handleAls = async () => {
    const sleep = (ms: number) =>
      new Promise((resolve) => setTimeout(resolve, ms));
    const serverAPI = getServerApi();

    if (!serverAPI) {
      return;
    }

    const { readAls } = createServerApiHelpers(serverAPI);

    while (enableAdaptiveBrightness) {
      await sleep(pollingRate);

    // 🚨 Always use latest mapping!
    let brightnessMap: number[][] = await getBrightnessMap() || [[0, 10], [1899, 100]];

    const alsValue = await readAls();
    if (typeof alsValue !== 'number') {
      continue;
    }

    previousAlsValues.push(alsValue);
    previousAlsValues.shift();

    if (previousAlsValues.includes(-1)) {
      continue;
    }

    const averageAlsValue =
      previousAlsValues.reduce((acc, val) => acc + val, 0) /
      previousAlsValues.length;

    // Use the brightnessMap array here:
    let targetBrightness = currentBrightness;
    for (let i = 0; i < brightnessMap.length; i++) {
      if (averageAlsValue <= brightnessMap[i][0]) {
        targetBrightness = brightnessMap[i][1];
        break;
      }
      if (i === brightnessMap.length - 1) {
        targetBrightness = brightnessMap[i][1];
      }
    }

    if (targetBrightness === currentBrightness) {
      continue;
    }

    //logInfo(`ALS value: ${ alsValue } | Average ALS value: ${ averageAlsValue } | Target brightness: ${ targetBrightness } | Current brightness: ${ currentBrightness }`);

    let localCurrentBrightness = currentBrightness;
    const numSteps = smoothTime / stepCount;

    let brightnessPerStep = (targetBrightness - currentBrightness) / numSteps;

    for (let i = 0; i < numSteps; i++) {
      await sleep(numSteps);

      localCurrentBrightness = localCurrentBrightness + brightnessPerStep;

      localCurrentBrightness = Math.min(
        100,
        Math.max(0, localCurrentBrightness)
      );

      logInfo(
        `Setting brightness to ${localCurrentBrightness}, target: ${targetBrightness}, brightnessPerStep: ${brightnessPerStep}`
      );

      window.SteamClient.System.Display.SetBrightness(
        localCurrentBrightness / 100
      );
    }

    currentBrightness = targetBrightness;
    previousAlsValues.fill(-1);
  }
};

export const enableAlsListener = () => {
  enableAdaptiveBrightness = true;
  new Promise(async () => {
    await handleAls();
  });

  if (!steamRegistration)
    steamRegistration =
      window.SteamClient.System.Display.RegisterForBrightnessChanges(
        async (data: { flBrightness: number }) => {
          currentBrightness = data.flBrightness * 100;
        }
      );
};

export const setPollRate = (newRate: number) => {
  pollingRate = newRate;
};

export const setSmoothTime = (newTime: number) => {
  smoothTime = newTime;
};

export const clearAlsListener = () => {
  enableAdaptiveBrightness = false;

  previousAlsValues.fill(-1);
};

export const setSensitivity = (arrSize: number) => {
  previousAlsValues = Array(arrSize).fill(-1);
};
