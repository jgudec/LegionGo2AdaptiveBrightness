import { ServerAPI, Router } from 'decky-frontend-lib';

export enum ServerAPIMethods {
  RGB_ON = 'rgb_on',
  RGB_OFF = 'rgb_off',
  REMAP_BUTTON = 'remap_button',
  LOG_INFO = 'log_info',
  GET_SETTINGS = 'get_settings',
  SET_POWER_LED = 'set_power_led',
  SET_CHARGE_LIMIT = 'set_charge_limit',
  SET_ALS_ENABLED = 'set_als_enabled',
  SAVE_SETTINGS = 'save_settings'
}

const readAls = (serverApi: ServerAPI) => async () => {
  const { result } = await serverApi.callPluginMethod('read_als', {});
  return Number(result);
};

const createLogInfo = (serverAPI: ServerAPI) => async (info: any) => {
  await serverAPI.callPluginMethod(ServerAPIMethods.LOG_INFO, {
    info: JSON.stringify(info)
  });
};

const createSetAlsEnabled =
  (serverAPI: ServerAPI) => async (enabled: boolean) => {
    await serverAPI.callPluginMethod(ServerAPIMethods.SET_ALS_ENABLED, {
      enabled
    });
  };

const createSaveSettings =
  (serverAPI: ServerAPI) => async (new_settings: { [s: string]: any }) => {
    await serverAPI.callPluginMethod(ServerAPIMethods.SAVE_SETTINGS, {
      new_settings
    });
  };

const createGetSettings = (serverAPI: ServerAPI) => async () => {
  return await serverAPI.callPluginMethod(ServerAPIMethods.GET_SETTINGS, {});
};

let serverApi: undefined | ServerAPI;

export const saveServerApi = (s: ServerAPI) => {
  serverApi = s;
};

export const getServerApi = () => {
  return serverApi;
};

export const extractDisplayName = () =>
  `${Router.MainRunningApp?.display_name || 'default'}`;

export const extractCurrentGameId = () =>
  `${Router.MainRunningApp?.appid || 'default'}`;

export const createServerApiHelpers = (serverAPI: ServerAPI) => {
  return {
    logInfo: createLogInfo(serverAPI),
    getSettings: createGetSettings(serverAPI),
    readAls: readAls(serverAPI),
    setAlsEnabled: createSetAlsEnabled(serverAPI),
    saveSettings: createSaveSettings(serverAPI)
  };
};

export const logInfo = (info: any) => {
  const s = getServerApi();
  s &&
    s.callPluginMethod(ServerAPIMethods.LOG_INFO, {
      info: JSON.stringify(info)
    });
};

export const getLatestVersionNum = async (serverApi: ServerAPI) => {
  const { result } = await serverApi.fetchNoCors(
    'https://raw.githubusercontent.com/aarron-lee/LegionGo2AdaptiveBrightness/main/package.json',
    { method: 'GET' }
  );

  //@ts-ignore
  const body = result.body as string;
  if (body && typeof body === 'string') {
    return JSON.parse(body)['version'];
  }
  return '';
};

export const otaUpdate = async (serverApi: ServerAPI) => {
  return serverApi.callPluginMethod('ota_update', {});
};
