import {
  PanelSection,
  PanelSectionRow,
  SliderField,
  TextField,
  ToggleField,
  ButtonItem
} from 'decky-frontend-lib';
import { useDispatch, useSelector } from 'react-redux';
import {
  selectAlsEnabled,
  selectAlsPollingRate,
  selectSensitivity,
  selectSmoothTime,
  uiSlice
} from '../../redux-modules/uiSlice';
import {
  pollInfo,
  sensitivityInfo,
  smoothTimeInfo
} from '../../backend/alsListener';
import { useEffect, useState } from 'react';
import { getLiveAls, getBrightnessMap } from '../../backend/alsListener';
import { getServerApi } from '../../backend/utils';

// --- Redux hooks ---
const useAlsEnabled = () => {
  const enabledAls = useSelector(selectAlsEnabled);
  const dispatch = useDispatch();
  const setAlsEnabled = (enabled: boolean) => dispatch(uiSlice.actions.setAlsEnabled(enabled));
  return { enabledAls, setAlsEnabled };
};

const useAlsPollingRate = () => {
  const pollingRate = useSelector(selectAlsPollingRate);
  const dispatch = useDispatch();
  const setPollingRate = (newRate: number) => dispatch(uiSlice.actions.setPollingRate(newRate));
  return { pollingRate, setPollingRate };
};

const useSensitivity = () => {
  const sensitivity = useSelector(selectSensitivity);
  const dispatch = useDispatch();
  const setSensitivity = (val: number) => dispatch(uiSlice.actions.setSensitivity(val));
  return { sensitivity, setSensitivity };
};

const useSmoothTime = () => {
  const smoothTime = useSelector(selectSmoothTime);
  const dispatch = useDispatch();
  const setSmoothTime = (newTime: number) => dispatch(uiSlice.actions.setSmoothTime(newTime));
  return { smoothTime, setSmoothTime };
};

export default function ALSPanel() {
  const { enabledAls, setAlsEnabled } = useAlsEnabled();
  const { pollingRate, setPollingRate } = useAlsPollingRate();
  const { smoothTime, setSmoothTime } = useSmoothTime();
  const { sensitivity, setSensitivity } = useSensitivity();
  const [minPollRate, maxPollRate] = pollInfo.range;
  const [minSmoothTime, maxSmoothTime] = smoothTimeInfo.range;
  const [minSensitivity, maxSensitivity] = sensitivityInfo.range;

  const [pairs, setPairs] = useState<[number, number][]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [als, setAls] = useState<number | null>(null);
  const [dropdownsCollapsed, setDropdownsCollapsed] = useState(true);
  const [loading, setLoading] = useState(true);

  const fetchAndSetPairs = async () => {
    setLoading(true);
    const map = await getBrightnessMap();
    if (Array.isArray(map)) {
      const pairs = map
        .filter(
          (entry): entry is [number, number] =>
            Array.isArray(entry) &&
            entry.length === 2 &&
            typeof entry[0] === "number" &&
            typeof entry[1] === "number"
        )
        .map(([k, v]) => [Number(k), Number(v)] as [number, number]);
      setPairs(pairs);
    } else {
      setPairs([]);
    }
    setLoading(false);
  };

  // Poll live ALS value
  useEffect(() => {
    fetchAndSetPairs();
    let mounted = true;
    const poll = async () => {
      const val = await getLiveAls();
      if (mounted) setAls(val);
    };
    poll();
    const interval = setInterval(poll, 1000);
    return () => { mounted = false; clearInterval(interval); };
  }, []);

  // Validate monotonicity & ALS increasing
  const validateMap = () => {
    for (let i = 1; i < pairs.length; i++) {
      if (pairs[i][0] <= pairs[i - 1][0])
        return "ALS values must strictly increase.";
      if (pairs[i][1] < pairs[i - 1][1])
        return "Brightness % must not decrease as ALS increases.";
    }
    return null;
  };

  // Update local state, always cast to int
  const setPairValue = (idx: number, field: 'als' | 'brightness', value: number | string) => {
    const numValue = Math.round(Number(value));
    setPairs(prev => {
      // Defensive deep copy
      const newPairs = prev.map(pair => [pair[0], pair[1]] as [number, number]);
      if (field === 'als') {
        newPairs[idx][0] = numValue;
      } else {
        newPairs[idx][1] = numValue;
      }
      return newPairs;
    });
  };

  // Save button handler
  // Returns success/failure for debounce logic above
  const saveMap = async (): Promise<{ success: boolean } | undefined> => {
    const validation = validateMap();
    if (validation) {
      setError(validation);
      return { success: false };
    }
    setSaving(true);
    setError(null);
    const serverAPI = getServerApi();
    try {
      const { result } = await serverAPI.callPluginMethod('save_brightness_map', { new_map: pairs });
      if (
        typeof result === "object" &&
        result !== null &&
        "success" in result
      ) {
        if ((result as any).success) {
          setError(null);
          // Do NOT reload pairs here; let optimistic UI handle
          setSaving(false);
          return { success: true };
        } else {
          setError((result as any).error ?? "Failed to save");
          setSaving(false);
          return { success: false };
        }
      } else {
        setError("Unexpected response from backend");
        setSaving(false);
        return { success: false };
      }
    } catch (e) {
      setError("Error saving map");
      setSaving(false);
      return { success: false };
    }
  };

  return (
    <>
      <PanelSection title="Ambient Light Sensor">
        <PanelSectionRow>
          <ToggleField
            label={'Enabled'}
            checked={enabledAls}
            onChange={setAlsEnabled}
          />
        </PanelSectionRow>
        {enabledAls && (
          <>
            <PanelSectionRow>
              <TextField
                label="Live ALS Value"
                value={als !== null ? als.toString() : "--"}
                disabled
              />
            </PanelSectionRow>
            <div
              style={{
                margin: '6px 0',
                height: '1px',
                width: '100%',
                background: '#636363ff'
              }}
            />
            <label>ALS Mapping Customization</label>
            <ButtonItem
              layout="below"
              onClick={() => setDropdownsCollapsed(val => !val)}
            >
              {dropdownsCollapsed ? "Show" : "Hide "}
            </ButtonItem>
            <div
              style={{
                margin: '6px 0',
                height: '1px',
                width: '100%',
                background: '#636363ff'
              }}
            />
            {!dropdownsCollapsed && (
              loading ? (
                <PanelSectionRow>
                  <TextField label="Loading..." value="" disabled />
                </PanelSectionRow>
              ) : (
                <>
                  {pairs.length > 0 ? (
                    pairs.map(([alsVal, brightnessVal], idx) => {
                      const prevBrightness = idx === 0 ? 0 : pairs[idx - 1][1];
                      const nextBrightness = idx === pairs.length - 1 ? 100 : pairs[idx + 1][1];
                      return (
                        <div key={idx}>
                          <PanelSectionRow>
                            <TextField
                              label="ALS Value"
                              value={alsVal !== null ? alsVal.toString() : "--"}
                              disabled
                            />
                          </PanelSectionRow>
                          <PanelSectionRow>
                            <SliderField
                              label="Brightness"
                              value={brightnessVal}
                              min={prevBrightness}
                              max={nextBrightness}
                              step={1}
                              onChange={val => setPairValue(idx, 'brightness', val)}
                              showValue
                              notchTicksVisible
                            />
                          </PanelSectionRow>
                          <div
                            style={{
                              margin: '6px 0',
                              height: '1px',
                              width: '100%',
                              background: '#636363ff'
                            }}
                          />
                        </div>
                      );
                    })
                  ) : (
                    <PanelSectionRow>
                      <TextField label="No mapping pairs loaded." value="" disabled />
                    </PanelSectionRow>
                  )}
                  <div style={{
                    margin: '12px 0',
                    height: '1px',
                    background: 'var(--decky-panel-section-row-border)'
                  }} />
                  <PanelSectionRow>
                    <ButtonItem
                      layout="below"
                      disabled={saving}
                      onClick={saveMap}
                    >
                      Save
                    </ButtonItem>
                    {error && (<span style={{ color: 'red' }}>{error}</span>)}
                    <div
                      style={{
                        margin: '6px 0',
                        height: '1px',
                        width: '100%',
                        background: '#636363ff'
                      }}
                    />
                  </PanelSectionRow>
                  {error && (
                    <PanelSectionRow>
                      <span style={{ color: 'red' }}>{error}</span>
                    </PanelSectionRow>
                  )}
                </>
              )
            )}
            <PanelSectionRow>
              <SliderField
                label="Sensitivity"
                value={sensitivity}
                min={minSensitivity}
                max={maxSensitivity}
                onChange={setSensitivity}
                step={sensitivityInfo.step}
                notchTicksVisible
                showValue
              />
            </PanelSectionRow>
            <PanelSectionRow>
              <SliderField
                label="Poll Rate (ms)"
                value={pollingRate}
                min={minPollRate}
                max={maxPollRate}
                onChange={setPollingRate}
                step={pollInfo.step}
                notchTicksVisible
                showValue
              />
            </PanelSectionRow>
            <PanelSectionRow>
              <SliderField
                label="Smooth Time (ms)"
                value={smoothTime}
                min={minSmoothTime}
                max={maxSmoothTime}
                onChange={setSmoothTime}
                step={smoothTimeInfo.step}
                notchTicksVisible
                showValue
              />
            </PanelSectionRow>
          </>
        )}
      </PanelSection>
    </>
  );
}