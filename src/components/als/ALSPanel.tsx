import {
  PanelSection,
  PanelSectionRow,
  SliderField,
  TextField,
  ToggleField
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



// let currentBrightness = 40;

const useAlsEnabled = () => {
  const enabledAls = useSelector(selectAlsEnabled);
  const dispatch = useDispatch();

  const setAlsEnabled = (enabled: boolean) => {
    return dispatch(uiSlice.actions.setAlsEnabled(enabled));
  };

  return { enabledAls, setAlsEnabled };
};

const useAlsPollingRate = () => {
  const pollingRate = useSelector(selectAlsPollingRate);
  const dispatch = useDispatch();

  const setPollingRate = (newRate: number) => {
    return dispatch(uiSlice.actions.setPollingRate(newRate));
  };

  return { pollingRate, setPollingRate };
};

const useSensitivity = () => {
  const sensitivity = useSelector(selectSensitivity);
  const dispatch = useDispatch();

  const setSensitivity = (val: number) => {
    return dispatch(uiSlice.actions.setSensitivity(val));
  };

  return { sensitivity, setSensitivity };
};

const useSmoothTime = () => {
  const smoothTime = useSelector(selectSmoothTime);
  const dispatch = useDispatch();

  const setSmoothTime = (newTime: number) => {
    return dispatch(uiSlice.actions.setSmoothTime(newTime));
  };

  return { smoothTime, setSmoothTime };
};

export default function () {
  const { enabledAls, setAlsEnabled } = useAlsEnabled();
  const { pollingRate, setPollingRate } = useAlsPollingRate();
  const { smoothTime, setSmoothTime } = useSmoothTime();
  const { sensitivity, setSensitivity } = useSensitivity();

  const [minPollRate, maxPollRate] = pollInfo.range;
  const [minSmoothTime, maxSmoothTime] = smoothTimeInfo.range;
  const [minSensitivity, maxSensitivity] = sensitivityInfo.range;

  const [als, setAls] = useState<number | null>(null);
  // Poll live ALS value
  useEffect(() => {
    let mounted = true;
    const poll = async () => {
      const val = await getLiveAls();
      if (mounted) setAls(val);
    };
    poll();
    const interval = setInterval(poll, 1000);
    return () => { mounted = false; clearInterval(interval); };
  }, []);

  return (
    <>
      <PanelSection title="Ambient Light Sensor">
        <PanelSectionRow>
          <ToggleField
            label={'Ambient Brightness'}
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
