import { configureStore } from '@reduxjs/toolkit';
import { uiSlice, uiSliceMiddleware } from './uiSlice';
import {
  controllerSlice,
  saveControllerSettingsMiddleware
} from './controllerSlice';

export const store = configureStore({
  reducer: {
    ui: uiSlice.reducer,
    controller: controllerSlice.reducer
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat([
      uiSliceMiddleware,
      saveControllerSettingsMiddleware
      // logger
    ])
});

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>;
// Inferred type: {posts: PostsState, comments: CommentsState, users: UsersState}
export type AppDispatch = typeof store.dispatch;
