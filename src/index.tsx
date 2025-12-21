import {
  definePlugin,
  ServerAPI,
  staticClasses
} from 'decky-frontend-lib';
import { memo, VFC } from 'react';

import { createServerApiHelpers, saveServerApi } from './backend/utils';
import { store } from './redux-modules/store';
import { getInitialLoading } from './redux-modules/uiSlice';
import { setInitialState } from './redux-modules/extraActions';
import { Provider, useSelector } from 'react-redux';
import AlsPanel from './components/als/ALSPanel';
import ErrorBoundary from './components/ErrorBoundary';
import { FaSun } from "react-icons/fa";
const Content: VFC<{ serverAPI?: ServerAPI }> = memo(() => {
  const loading = useSelector(getInitialLoading);
  if (loading) {
    return null;
  }
  return (
    <>
      <ErrorBoundary title="Adaptive Brightness">
        <AlsPanel />
      </ErrorBoundary>
    </>
  );
});

const AppContainer: VFC<{ serverAPI: ServerAPI }> = ({ serverAPI }) => {
  return (
    <Provider store={store}>
      <Content serverAPI={serverAPI} />
    </Provider>
  );
};

export default definePlugin((serverApi: ServerAPI) => {
  saveServerApi(serverApi);
  const { getSettings } = createServerApiHelpers(serverApi);

  getSettings().then((result) => {
    // logInfo(result);
    if (result.success) {
      const results = result.result || {};

      store.dispatch(setInitialState(results));
    }
  });


  return {
    title: <div className={staticClasses.Title}>Adaptive Brightness</div>,
    content: <AppContainer serverAPI={serverApi} />,
    icon: <FaSun/>
  };
});
